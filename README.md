# Node.js gRPC Plugin Server for ODM CLI

This package provides a robust and easy-to-use framework for creating gRPC-based plugins for the ODM CLI using Node.js and TypeScript. It abstracts away the complexities of gRPC communication, allowing you to focus on the core logic of your plugin.

## Features

- **Simplified Plugin Development:** Define your plugin logic by implementing a single `PluginExecuter` interface.
- **Automatic gRPC Server Management:** The `PluginServer` class handles gRPC server setup, binding, and graceful shutdown.
- **Protobuf `Any` Type Handling:** The `ProtobufHelper` class simplifies the packing and unpacking of various data types to and from the `google.protobuf.Any` message, which is used for dynamic arguments and options.
- **Example Implementation:** Includes an `ExamplePlugin` to demonstrate how to implement the `PluginExecuter` interface and process requests.
- **Graceful Shutdown:** The `PluginMain` class sets up listeners for `SIGTERM` and `SIGINT` signals to ensure a clean shutdown of the server.

## Installation

Assuming you have a Node.js project, you can add this package as a dependency.

```bash
npm install @grpc/grpc-js @grpc/proto-loader google-protobuf
```

You will also need to have your gRPC proto definition file (`odm-plugin.proto` in this example) available in your project.

## Usage

### 1\. Define Your Plugin Logic

Your plugin's core logic should be encapsulated in a class that implements the `PluginExecuter` interface. The `execute` method is where you will handle the incoming request and return the appropriate response.

```typescript
// my-plugin.ts
import {
  PluginExecuter,
  ExecutionRequestBody,
  ExecutionResponse,
  ProtobufHelper,
} from "@hembrow-innovations/odm-plugin-js";

export class MyCustomPlugin implements PluginExecuter {
  async execute(request: ExecutionRequestBody): Promise<ExecutionResponse> {
    // Unpack args and options using the helper
    const myArg = ProtobufHelper.unpackAny(request.args.my_argument_key);
    const myOption = ProtobufHelper.unpackAny(request.options.my_option_key);

    console.log(`Received input: ${request.input}`);
    console.log(`My custom argument value: ${myArg}`);
    console.log(`My custom option value: ${myOption}`);

    // Your custom logic here
    const resultString = `The result of my plugin is based on input: "${request.input}"`;

    return {
      result: resultString,
    };
  }
}
```

### 2\. Create the Main Entry Point

Create a main file to instantiate your plugin and start the server. This file will be the entry point for the ODM CLI to execute your plugin.

```typescript
// main.ts
import { PluginMain } from "./plugin-framework"; // Adjust the path as needed
import { MyCustomPlugin } from "./my-plugin";

// Create an instance of your plugin
const myPlugin = new MyCustomPlugin();

// Create the main server manager with your plugin
const pluginMain = new PluginMain(myPlugin);

// Start the server
pluginMain.start().catch((error) => {
  console.error("Failed to start the plugin server:", error);
  process.exit(1);
});
```

### 3\. Build and Run

Compile your TypeScript code and then run the compiled JavaScript file.

```json
# Example tsconfig.json
{
  "compilerOptions": {
    "target": "es2017",
    "module": "commonjs",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true
  }
}
```

```bash
tsc
node dist/main.js
```

When the `PluginMain` starts, it will log the port it is listening on to `stdout` in the format `PLUGIN_PORT=<port_number>`. The ODM CLI uses this information to establish a connection with your plugin.

## API Reference

### `PluginExecuter`

This is the core interface your plugin must implement.

- `execute(request: ExecutionRequestBody): Promise<ExecutionResponse>`:
  - `request`: An object containing `input` (string), `args` (map of string to `Any`), and `options` (map of string to `Any`).
  - `returns`: A promise that resolves to an `ExecutionResponse` object with a `result` string.

### `PluginServer`

Manages the gRPC server lifecycle. You typically won't interact with this class directly, as `PluginMain` handles it for you.

- `constructor(executer: PluginExecuter)`: Creates a server instance bound to your plugin's logic.
- `start(port: number = 0): Promise<number>`: Binds the server to a port and starts it. Returns the assigned port.
- `stop(): void`: Shuts down the server.

### `ProtobufHelper`

A utility class for working with `google.protobuf.Any`.

- `static packAny(value: any, typeUrl?: string): Any`: Packs a JavaScript value into a protobuf `Any` message.
- `static unpackAny(any: Any): any`: Unpacks a protobuf `Any` message back into a JavaScript value.

### `PluginMain`

The entry point for your plugin.

- `constructor(executer: PluginExecuter)`: Creates a `PluginMain` instance with your plugin's implementation.
- `start(): Promise<void>`: Starts the gRPC server, logs the port, and sets up signal handlers for graceful shutdown.
