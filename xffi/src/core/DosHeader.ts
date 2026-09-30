import { DOS_HEADER_MIN_SIZE, DOS_LFANEW_OFFSET, DOS_MAGIC, PE_SIGNATURE } from "./Constants.js";

export type DosHeader = { offset: number };

export type DosHeaderParseResult =
    | { succeeded: true; header: DosHeader }
    | { succeeded: false; reason: string };

export function tryParseDosHeader(
    buffer: Readonly<Uint8Array>,
    view: Readonly<DataView>
): DosHeaderParseResult {
    if (buffer.length < DOS_HEADER_MIN_SIZE) {
        return { succeeded: false, reason: "File size is too small to contain valid DOS header." };
    }

    const decoder = new TextDecoder("ascii");
    const magic = decoder.decode(buffer.subarray(0, 2));

    if (magic !== DOS_MAGIC) {
        return { succeeded: false, reason: `Invalid DOS signature: expected ${DOS_MAGIC}, got ${magic}` };
    }

    const header_offset = view.getUint32(DOS_LFANEW_OFFSET, true);

    return { succeeded: true, header: { offset: header_offset } };
}

export function isValidPESignature(view: Readonly<DataView>, offset: Readonly<number>): boolean {
    return view.getUint32(offset, true) === PE_SIGNATURE;
}
