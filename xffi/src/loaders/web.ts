import { PeParser, ParsedPe } from "../core/PeParser.js";

/**
 * Loads and parses a PE binary from a remote URL or asset path using standard fetch().
 * Works in Browsers, Deno, Bun, Cloudflare Workers, and modern Node.
 */
export async function fromUrl(url: string | URL, init?: RequestInit): Promise<ParsedPe> {
    const response = await fetch(url, init);
    if (!response.ok) {
        throw new Error(`Failed to fetch PE binary from ${url.toString()}: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return PeParser.parse(new Uint8Array(arrayBuffer));
}

/**
 * Parses a PE binary from a standard Web Blob or File (e.g. from an HTML <input type="file">).
 */
export async function fromBlob(blob: Blob): Promise<ParsedPe> {
    const arrayBuffer = await blob.arrayBuffer();
    return PeParser.parse(new Uint8Array(arrayBuffer));
}

/**
 * Synchronously parses a raw ArrayBuffer.
 */
export function fromArrayBuffer(arrayBuffer: ArrayBuffer): ParsedPe {
    return PeParser.parse(new Uint8Array(arrayBuffer));
}
