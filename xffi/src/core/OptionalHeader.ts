import {
    DATA_DIRECTORY_ENTRY_SIZE,
    DATA_DIRECTORY_EXPORT_INDEX,
    PE32_DATA_DIRECTORY_OFFSET,
    PE32_MAGIC,
    PE32_PLUS_DATA_DIRECTORY_OFFSET,
    PE32_PLUS_MAGIC,
} from "./Constants.js";

export type DataDirectory = {
    virtualAddress: number; // RVA
    size: number;
};

export type OptionalHeader = {
    magic: number;
    is64Bit: boolean;
    exportTable: DataDirectory;
};

export type OptionalHeaderParseResult =
    | { succeeded: true; header: OptionalHeader }
    | { succeeded: false; reason: string };

export function tryParseOptionalHeader(
    buffer: Readonly<Uint8Array>,
    view: Readonly<DataView>,
    offset: number,
    sizeOfOptionalHeader: number
): OptionalHeaderParseResult {
    if (sizeOfOptionalHeader === 0) {
        return {
            succeeded: false,
            reason: "SizeOfOptionalHeader is 0 (object files or stripped headers).",
        };
    }

    if (offset + sizeOfOptionalHeader > buffer.length) {
        return {
            succeeded: false,
            reason: `Buffer too small to contain Optional Header of size ${sizeOfOptionalHeader} at offset ${offset}.`,
        };
    }

    const magic = view.getUint16(offset + 0, true);
    let dataDirectoryBaseOffset: number;
    let is64Bit: boolean;

    if (magic === PE32_PLUS_MAGIC) {
        is64Bit = true;
        dataDirectoryBaseOffset = offset + PE32_PLUS_DATA_DIRECTORY_OFFSET;
    } else if (magic === PE32_MAGIC) {
        is64Bit = false;
        dataDirectoryBaseOffset = offset + PE32_DATA_DIRECTORY_OFFSET;
    } else {
        return {
            succeeded: false,
            reason: `Unknown Optional Header magic: 0x${magic.toString(16).padStart(4, "0")}. Expected PE32 (0x010b) or PE32+ (0x020b).`,
        };
    }

    const exportEntryOffset = dataDirectoryBaseOffset + (DATA_DIRECTORY_EXPORT_INDEX * DATA_DIRECTORY_ENTRY_SIZE);

    if (exportEntryOffset + DATA_DIRECTORY_ENTRY_SIZE > offset + sizeOfOptionalHeader) {
        return {
            succeeded: false,
            reason: "Optional Header size too small to reach Export Table data directory entry.",
        };
    }

    const exportVirtualAddress = view.getUint32(exportEntryOffset + 0, true);
    const exportSize = view.getUint32(exportEntryOffset + 4, true);

    return {
        succeeded: true,
        header: {
            magic,
            is64Bit,
            exportTable: {
                virtualAddress: exportVirtualAddress,
                size: exportSize,
            },
        },
    };
}
