import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { xffi } from "./src/node.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dllPath = path.resolve(
    __dirname,
    "../NativeLabrary/NativeLibrary/bin/Realese/net10.0/win-x64/publish/NativeLibrary.dll"
);

// 1. One line to parse PE, map into memory, and encapsulate:
const plugin = xffi.for(dllPath);

console.log("=== Loaded Plugin ===");
console.log(`Path: ${plugin.path}`);
console.log(`Base Address: 0x${plugin.baseAddress.toString(16)}`);

console.log("\n=== Exported Functions ===");
for (const fn of plugin.functions) {
    console.log(`  [Ordinal ${fn.ordinal}] ${fn.name} -> Address: 0x${fn.address.toString(16)} (RVA: 0x${fn.rva.toString(16)})`);
}

console.log("\n=== Calling Function ===");

// 2. Call the native function using the xffi facade:
const message = plugin.callForUtf8String("get_message", 64);
console.log(`Returned string from C# Native AOT:\n"${message}"`);
