// Re-export all universal core
export * from "./index.js";

// Node-specific loaders
export * as node from "./loaders/node.js";
export { fromFilePath, fromFilePathSync, fromBuffer } from "./loaders/node.js";

// High-level FFI Facade
export { xffi, Plugin, type FunctionInfo } from "./xffi.js";
