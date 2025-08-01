"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MyCustomPlugin = void 0;
// example-plugin.ts - A complete plugin implementation
const src_1 = require("../src");
class MyCustomPlugin {
    async execute(request) {
        try {
            console.log("MyCustomPlugin: Processing request...");
            // Extract and process arguments
            const args = {};
            for (const [key, value] of Object.entries(request.args || {})) {
                args[key] = src_1.ProtobufHelper.unpackAny(value);
            }
            // Extract and process options
            const options = {};
            for (const [key, value] of Object.entries(request.options || {})) {
                options[key] = src_1.ProtobufHelper.unpackAny(value);
            }
            // Your custom plugin logic here
            let result = `Input processed: "${request.input}"\n`;
            if (Object.keys(args).length > 0) {
                result += `Arguments: ${JSON.stringify(args, null, 2)}\n`;
            }
            if (Object.keys(options).length > 0) {
                result += `Options: ${JSON.stringify(options, null, 2)}\n`;
            }
            // Example: Simple text transformation based on options
            const operation = options.operation || "uppercase";
            let processedInput = request.input;
            switch (operation) {
                case "uppercase":
                    processedInput = request.input.toUpperCase();
                    break;
                case "lowercase":
                    processedInput = request.input.toLowerCase();
                    break;
                case "reverse":
                    processedInput = request.input.split("").reverse().join("");
                    break;
                case "length":
                    processedInput = request.input.length.toString();
                    break;
                default:
                    processedInput = request.input;
            }
            result += `Transformed output: "${processedInput}"`;
            return {
                result: result,
            };
        }
        catch (error) {
            console.error("Plugin execution error:", error);
            return {
                result: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
        }
    }
}
exports.MyCustomPlugin = MyCustomPlugin;
// Plugin entry point
if (require.main === module) {
    const plugin = new MyCustomPlugin();
    const main = new src_1.PluginMain(plugin);
    main.start().catch((error) => {
        console.error("Failed to start plugin:", error);
        process.exit(1);
    });
}
//# sourceMappingURL=example-plugin.js.map