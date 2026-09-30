import * as path from "node:path";
import { createRequire } from "node:module";
import { fromFilePathSync } from "./loaders/node.js";
import { ParsedPe } from "./core/PeParser.js";

const require = createRequire(import.meta.url);

// Load the compiled native bridge addon
let bridge: any = null;
function getBridge() {
    if (!bridge) {
        const moduleDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
        const possiblePaths = [
            path.resolve(moduleDir, "../bin/bridge.node"),
            path.resolve(moduleDir, "../bridge.node"),
            path.resolve(process.cwd(), "bin/bridge.node"),
            path.resolve(process.cwd(), "practice/ffi/xffi/bin/bridge.node"),
            path.resolve(process.cwd(), "bridge.node"),
        ];

        for (const p of possiblePaths) {
            try {
                bridge = require(p);
                break;
            } catch {
                // try next
            }
        }

        if (!bridge) {
            throw new Error("Could not locate bridge.node. Please compile it first with cl.exe.");
        }
    }
    return bridge;
}

export interface FunctionInfo {
    name: string;
    ordinal: number;
    rva: number;
    address: bigint;
    forwarder: string | null;
}

export class Plugin {
    public readonly path: string;
    public readonly baseAddress: bigint;
    public readonly pe: ParsedPe;
    public readonly functions: readonly FunctionInfo[];

    private readonly functionMap = new Map<string, FunctionInfo>();
    private isClosed = false;

    constructor(dllPath: string, baseAddress: bigint, pe: ParsedPe) {
        this.path = dllPath;
        this.baseAddress = baseAddress;
        this.pe = pe;

        const functions: FunctionInfo[] = [];

        if (pe.exportDirectory) {
            for (const sym of pe.exportDirectory.symbols) {
                const info: FunctionInfo = {
                    name: sym.name,
                    ordinal: sym.ordinal,
                    rva: sym.rva,
                    address: baseAddress + BigInt(sym.rva),
                    forwarder: sym.forwarder,
                };
                functions.push(info);
                this.functionMap.set(sym.name, info);
            }
        }

        this.functions = Object.freeze(functions);
    }

    /**
     * Checks if a function symbol is exported by this library.
     */
    public has(name: string): boolean {
        return this.functionMap.has(name);
    }

    /**
     * Returns metadata for an exported function.
     */
    public getFunction(name: string): FunctionInfo | undefined {
        return this.functionMap.get(name);
    }

    /**
     * Executes the native function with the given arguments.
     * Supports numbers, bigints, and Buffer/Uint8Array memory pointers.
     */
    public call<TReturn = number>(
        name: string,
        ...args: (number | bigint | Buffer | Uint8Array)[]
    ): TReturn {
        if (this.isClosed) {
            throw new Error(`Cannot invoke '${name}': Library '${this.path}' has already been closed/unloaded.`);
        }

        const fn = this.functionMap.get(name);
        if (!fn) {
            const available = Array.from(this.functionMap.keys()).join(", ");
            throw new Error(`Symbol '${name}' not found in ${this.path}. Available exports: [${available}]`);
        }

        if (fn.forwarder) {
            throw new Error(`Cannot directly invoke '${name}': it is forwarded to '${fn.forwarder}'.`);
        }

        const b = getBridge();
        const rawResult = b.call(fn.address, ...args);

        // Convert result to appropriate return type
        return Number(rawResult) as unknown as TReturn;
    }

    /**
     * Convenience helper to call a function that populates a UTF-8 buffer and return the string.
     */
    public callForUtf8String(name: string, bufferCapacity = 256): string {
        const buffer = Buffer.alloc(bufferCapacity);
        const bytesWritten = this.call<number>(name, buffer, bufferCapacity);

        if (bytesWritten < 0) {
            throw new Error(`Native function '${name}' returned error code ${bytesWritten}.`);
        }

        return buffer.toString("utf-8", 0, bytesWritten);
    }

    /**
     * Unloads the library from memory using Win32 FreeLibrary.
     * Prevents memory leaks and unlocks the .dll file on disk.
     */
    public close(): boolean {
        if (this.isClosed) return true;
        this.isClosed = true;

        const b = getBridge();
        return b.unloadLibrary(this.baseAddress);
    }

    /**
     * Supports TypeScript 5.2+ Explicit Resource Management ('using' keyword).
     */
    public [Symbol.dispose](): void {
        this.close();
    }
}

export const xffi = {
    /**
     * Loads a native dynamic library (DLL), parses its PE export tables,
     * maps it into memory, and returns an encapsulated Plugin object.
     */
    for(dllPath: string): Plugin {
        const resolvedPath = path.resolve(dllPath);

        // 1. Static analysis: parse PE binary using your custom PE parser
        const pe = fromFilePathSync(resolvedPath);

        // 2. Dynamic loading: map into memory to get base address
        const b = getBridge();
        const baseAddress: bigint = b.loadLibrary(resolvedPath);

        if (!baseAddress) {
            throw new Error(`Failed to load native library at ${resolvedPath}. Verify the file exists and architecture matches.`);
        }

        return new Plugin(resolvedPath, baseAddress, pe);
    },
};
