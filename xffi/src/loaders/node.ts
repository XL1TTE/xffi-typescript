import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import { PeParser, ParsedPe } from "../core/PeParser.js";

/**
 * Asynchronously loads and parses a PE binary from the local file system.
 */
export async function fromFilePath(filePath: string): Promise<ParsedPe> {
    const buffer = await fsPromises.readFile(filePath);
    return PeParser.parse(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
}

/**
 * Synchronously loads and parses a PE binary from the local file system.
 */
export function fromFilePathSync(filePath: string): ParsedPe {
    const buffer = fs.readFileSync(filePath);
    return PeParser.parse(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
}

/**
 * Parses a Node.js Buffer directly.
 */
export function fromBuffer(buffer: Buffer): ParsedPe {
    return PeParser.parse(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
}
