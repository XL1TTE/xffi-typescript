import { IMAGE_EXPORT_DIRECTORY_SIZE } from "./Constants.js";

export type ExportedSymbol = {
    name: string;
    ordinal: number;
    rva: number;
    forwarder: string | null;
};

export type ExportDirectory = {
    dllName: string;
    ordinalBase: number;
    numberOfFunctions: number;
    numberOfNames: number;
    symbols: ExportedSymbol[];
};

export type ExportDirectoryParseResult =
    | { succeeded: true; exportDirectory: ExportDirectory }
    | { succeeded: false; reason: string };

function readNullTerminatedAscii(buffer: Readonly<Uint8Array>, offset: number): string {
    let end = offset;
    while (end < buffer.length && buffer[end] !== 0) {
        end++;
    }
    const decoder = new TextDecoder("ascii");
    return decoder.decode(buffer.subarray(offset, end));
}

export function tryParseExportDirectory(
    buffer: Readonly<Uint8Array>,
    view: Readonly<DataView>,
    exportDirectoryRva: number,
    exportDirectorySize: number,
    rvaToOffset: (rva: number) => number | null
): ExportDirectoryParseResult {
    if (exportDirectoryRva === 0 || exportDirectorySize === 0) {
        return {
            succeeded: false,
            reason: "Binary does not declare an Export Directory (RVA or size is 0).",
        };
    }

    const exportDirOffset = rvaToOffset(exportDirectoryRva);
    if (exportDirOffset === null) {
        return {
            succeeded: false,
            reason: `Failed to map Export Directory RVA 0x${exportDirectoryRva.toString(16)} to a file offset.`,
        };
    }

    if (exportDirOffset + IMAGE_EXPORT_DIRECTORY_SIZE > buffer.length) {
        return {
            succeeded: false,
            reason: `Buffer too small to contain IMAGE_EXPORT_DIRECTORY at offset ${exportDirOffset}.`,
        };
    }

    const nameRva = view.getUint32(exportDirOffset + 12, true);
    const ordinalBase = view.getUint32(exportDirOffset + 16, true);
    const numberOfFunctions = view.getUint32(exportDirOffset + 20, true);
    const numberOfNames = view.getUint32(exportDirOffset + 24, true);
    const addressOfFunctionsRva = view.getUint32(exportDirOffset + 28, true);
    const addressOfNamesRva = view.getUint32(exportDirOffset + 32, true);
    const addressOfNameOrdinalsRva = view.getUint32(exportDirOffset + 36, true);

    let dllName = "";
    const dllNameOffset = rvaToOffset(nameRva);
    if (dllNameOffset !== null) {
        dllName = readNullTerminatedAscii(buffer, dllNameOffset);
    }

    const functionsOffset = rvaToOffset(addressOfFunctionsRva);
    const namesOffset = rvaToOffset(addressOfNamesRva);
    const ordinalsOffset = rvaToOffset(addressOfNameOrdinalsRva);

    if (functionsOffset === null || namesOffset === null || ordinalsOffset === null) {
        return {
            succeeded: false,
            reason: "Failed to map one or more export table RVAs to file offsets.",
        };
    }

    const symbols: ExportedSymbol[] = [];

    for (let i = 0; i < numberOfNames; i++) {
        const currentNameRva = view.getUint32(namesOffset + i * 4, true);
        const nameFileOffset = rvaToOffset(currentNameRva);
        if (nameFileOffset === null) continue;

        const symbolName = readNullTerminatedAscii(buffer, nameFileOffset);
        const ordinalIndex = view.getUint16(ordinalsOffset + i * 2, true);
        const functionRva = view.getUint32(functionsOffset + ordinalIndex * 4, true);
        const ordinal = ordinalBase + ordinalIndex;

        let forwarder: string | null = null;
        if (
            functionRva >= exportDirectoryRva &&
            functionRva < exportDirectoryRva + exportDirectorySize
        ) {
            const forwarderOffset = rvaToOffset(functionRva);
            if (forwarderOffset !== null) {
                forwarder = readNullTerminatedAscii(buffer, forwarderOffset);
            }
        }

        symbols.push({
            name: symbolName,
            ordinal,
            rva: functionRva,
            forwarder,
        });
    }

    return {
        succeeded: true,
        exportDirectory: {
            dllName,
            ordinalBase,
            numberOfFunctions,
            numberOfNames,
            symbols,
        },
    };
}
