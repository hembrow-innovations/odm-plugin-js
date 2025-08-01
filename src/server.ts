import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { Any } from "google-protobuf/google/protobuf/any_pb";

// Type definitions for the proto messages
/**
 * @typedef {Object} ExecutionRequestBody
 * @property {{[key: string]: Any}} args - A key-value map of arguments, where values are protobuf Any messages.
 * @property {{[key: string]: Any}} options - A key-value map of options, where values are protobuf Any messages.
 * @property {string} input - The primary input string for the execution.
 */
export interface ExecutionRequestBody {
  args: { [key: string]: Any };
  options: { [key: string]: Any };
  input: string;
}

/**
 * @typedef {Object} ExecutionResponse
 * @property {string} result - The result string of the execution.
 */
export interface ExecutionResponse {
  result: string;
}

/**
 * Plugin interface that implementations should follow.
 * @interface
 */
export interface PluginExecuter {
  /**
   * Executes the plugin logic.
   * @param {ExecutionRequestBody} request - The request body for the execution.
   * @returns {Promise<ExecutionResponse>} A promise that resolves with the execution response.
   */
  execute(request: ExecutionRequestBody): Promise<ExecutionResponse>;
}

/**
 * Base plugin server class that handles gRPC communication.
 * @class
 */
export class PluginServer {
  /**
   * The gRPC server instance.
   * @private
   * @type {grpc.Server}
   */
  private server: grpc.Server;
  /**
   * The plugin executer instance.
   * @private
   * @type {PluginExecuter}
   */
  private executer: PluginExecuter;

  /**
   * Creates an instance of PluginServer.
   * @param {PluginExecuter} executer - The implementation of the plugin logic.
   */
  constructor(executer: PluginExecuter) {
    this.executer = executer;
    this.server = new grpc.Server();
    this.setupService();
  }

  /**
   * Sets up the gRPC service by loading the proto file and adding the service implementation.
   * @private
   * @returns {void}
   */
  private setupService(): void {
    const path = require("path");
    const protoPath = path.resolve(__dirname, "./proto/odm-plugin.proto");
    const packageDefinition = protoLoader.loadSync(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const pluginProto = grpc.loadPackageDefinition(packageDefinition)
      .plugin as any;

    this.server.addService(pluginProto.Plugin.service, {
      Execute: this.handleExecute.bind(this),
    });
  }

  /**
   * Handles the incoming gRPC `Execute` call.
   * @private
   * @param {grpc.ServerUnaryCall<ExecutionRequestBody, ExecutionResponse>} call - The gRPC server unary call object.
   * @param {grpc.sendUnaryData<ExecutionResponse>} callback - The gRPC callback function to send the response.
   * @returns {Promise<void>}
   */
  private async handleExecute(
    call: grpc.ServerUnaryCall<ExecutionRequestBody, ExecutionResponse>,
    callback: grpc.sendUnaryData<ExecutionResponse>
  ): Promise<void> {
    try {
      const request = call.request;
      const response = await this.executer.execute(request);
      callback(null, response);
    } catch (error) {
      console.error("Plugin execution error:", error);
      callback({
        code: grpc.status.INTERNAL,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Starts the gRPC server on a specified port.
   * @public
   * @param {number} [port=0] - The port to bind to. If 0, a random available port will be used.
   * @returns {Promise<number>} A promise that resolves with the assigned port number.
   */
  public start(port: number = 0): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server.bindAsync(
        `localhost:${port}`,
        grpc.ServerCredentials.createInsecure(),
        (err, assignedPort) => {
          if (err) {
            reject(err);
            return;
          }
          // Note: server.start() is deprecated and no longer needed
          // The server starts automatically after bindAsync
          // `this.server.start();`
          console.log(`Plugin server started on port ${assignedPort}`);
          resolve(assignedPort);
        }
      );
    });
  }

  /**
   * Stops the gRPC server.
   * @public
   * @returns {void}
   */
  public stop(): void {
    this.server.forceShutdown();
  }
}

/**
 * Helper class for packing and unpacking protobuf `Any` types.
 * @class
 */
export class ProtobufHelper {
  /**
   * Packs a value into a protobuf `Any` message.
   * @public
   * @static
   * @param {*} value - The value to pack.
   * @param {string} [typeUrl] - Optional type URL for the packed value. If not provided, a default will be inferred.
   * @returns {Any} The packed `Any` message.
   */
  static packAny(value: any, typeUrl?: string): Any {
    const any = new Any();

    if (typeof value === "string") {
      any.setValue(Buffer.from(value, "utf8"));
      any.setTypeUrl(
        typeUrl || "type.googleapis.com/google.protobuf.StringValue"
      );
    } else if (typeof value === "number") {
      any.setValue(Buffer.from(value.toString(), "utf8"));
      any.setTypeUrl(
        typeUrl || "type.googleapis.com/google.protobuf.DoubleValue"
      );
    } else if (typeof value === "boolean") {
      any.setValue(Buffer.from(value.toString(), "utf8"));
      any.setTypeUrl(
        typeUrl || "type.googleapis.com/google.protobuf.BoolValue"
      );
    } else {
      // For objects, serialize as JSON
      any.setValue(Buffer.from(JSON.stringify(value), "utf8"));
      any.setTypeUrl(typeUrl || "type.googleapis.com/google.protobuf.Struct");
    }

    return any;
  }

  /**
   * Unpacks a protobuf `Any` message into its original value.
   * @public
   * @static
   * @param {Any} any - The `Any` message to unpack.
   * @returns {*} The unpacked value.
   */
  static unpackAny(any: Any): any {
    const value = Buffer.from(any.getValue_asU8()).toString("utf8");
    const typeUrl = any.getTypeUrl();

    if (typeUrl.includes("StringValue")) {
      return value;
    } else if (typeUrl.includes("DoubleValue")) {
      return parseFloat(value);
    } else if (typeUrl.includes("BoolValue")) {
      return value === "true";
    } else if (typeUrl.includes("Struct")) {
      return JSON.parse(value);
    }

    // Default to string
    return value;
  }
}

/**
 * An example implementation of the PluginExecuter interface.
 * @class
 * @implements {PluginExecuter}
 */
export class ExamplePlugin implements PluginExecuter {
  /**
   * An example implementation of the execute method.
   * @public
   * @param {ExecutionRequestBody} request - The request body containing input, args, and options.
   * @returns {Promise<ExecutionResponse>} A promise that resolves with a simple response.
   */
  async execute(request: ExecutionRequestBody): Promise<ExecutionResponse> {
    console.log("Received execution request:", {
      input: request.input,
      argsCount: Object.keys(request.args || {}).length,
      optionsCount: Object.keys(request.options || {}).length,
    });

    // Process args and options
    const processedArgs: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(request.args || {})) {
      processedArgs[key] = ProtobufHelper.unpackAny(value);
    }

    const processedOptions: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(request.options || {})) {
      processedOptions[key] = ProtobufHelper.unpackAny(value);
    }

    // Your plugin logic here
    const result = `Processed input: "${request.input}" with ${
      Object.keys(processedArgs).length
    } args and ${Object.keys(processedOptions).length} options`;

    return {
      result: result,
    };
  }
}

/**
 * Main class to manage the plugin lifecycle.
 * @class
 */
export class PluginMain {
  /**
   * The plugin server instance.
   * @private
   * @type {PluginServer}
   */
  private server: PluginServer;

  /**
   * Creates an instance of PluginMain.
   * @param {PluginExecuter} executer - The plugin implementation to be served.
   */
  constructor(executer: PluginExecuter) {
    this.server = new PluginServer(executer);
  }

  /**
   * Starts the plugin server and handles graceful shutdown.
   * @public
   * @returns {Promise<void>}
   */
  async start(): Promise<void> {
    try {
      // Get port from environment or use random port
      const port = process.env.PLUGIN_PORT
        ? parseInt(process.env.PLUGIN_PORT)
        : 0;
      const assignedPort = await this.server.start(port);

      // Output the port for the parent process to read
      console.log(`PLUGIN_PORT=${assignedPort}`);

      // Handle graceful shutdown
      process.on("SIGTERM", () => {
        console.log("Received SIGTERM, shutting down gracefully");
        this.server.stop();
        process.exit(0);
      });

      process.on("SIGINT", () => {
        console.log("Received SIGINT, shutting down gracefully");
        this.server.stop();
        process.exit(0);
      });
    } catch (error) {
      console.error("Failed to start plugin:", error);
      process.exit(1);
    }
  }
}

/*
 * Usage example:
 * const plugin = new ExamplePlugin();
 * const main = new PluginMain(plugin);
 * main.start().catch(console.error);
 **/
