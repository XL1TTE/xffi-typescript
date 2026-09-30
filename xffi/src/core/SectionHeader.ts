import { SECTION_HEADER_SIZE } from "./Constants.js";

export type SectionHeader = {
    name: string;
    virtualSize: number;
    virtualAddress: number;
    sizeOfRawData: number;
    pointerToRawData: number;
    characteristics: number;
};

export type SectionHeadersParseResult =
    | { succeeded: true; sections: SectionHeader[] }
    | { succeeded: false; reason: string };

export function tryParseSectionHeaders(
    buffer: Readonly<Uint8Array>,
    view: Readonly<DataView>,
    offset: number,
    numberOfSections: number
): SectionHeadersParseResult {
    const totalRequiredSize = numberOfSections * SECTION_HEADER_SIZE;
    if (offset + totalRequiredSize > buffer.length) {
        return {
            succeeded: false,
            reason: `Buffer too small to contain ${numberOfSections} section headers at offset ${offset}.`,
        };
    }

    const sections: SectionHeader[] = [];
    const decoder = new TextDecoder("ascii");

    for (let i = 0; i < numberOfSections; i++) {
        const entryOffset = offset + i * SECTION_HEADER_SIZE;

        const nameBytes = buffer.subarray(entryOffset, entryOffset + 8);
        const nullIndex = nameBytes.indexOf(0);
        const nameSlice = nullIndex === -1 ? nameBytes : nameBytes.subarray(0, nullIndex);
        const name = decoder.decode(nameSlice);

        const virtualSize = view.getUint32(entryOffset + 8, true);
        const virtualAddress = view.getUint32(entryOffset + 12, true);
        const sizeOfRawData = view.getUint32(entryOffset + 16, true);
        const pointerToRawData = view.getUint32(entryOffset + 20, true);
        const characteristics = view.getUint32(entryOffset + 36, true);

        sections.push({
            name,
            virtualSize,
            virtualAddress,
            sizeOfRawData,
            pointerToRawData,
            characteristics,
        });
    }

    return {
        succeeded: true,
        sections,
    };
}

export function rvaToFileOffset(rva: number, sections: readonly SectionHeader[]): number | null {
    for (const section of sections) {
        const effectiveVirtualSize = section.virtualSize > 0 ? section.virtualSize : section.sizeOfRawData;

        if (rva >= section.virtualAddress && rva < section.virtualAddress + effectiveVirtualSize) {
            const delta = rva - section.virtualAddress;
            return section.pointerToRawData + delta;
        }
    }

    return null;
}
