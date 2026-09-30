import { COFF_FILE_HEADER_SIZE, PE_SIGNATURE_SIZE } from "./Constants.js";
import { isValidPESignature, tryParseDosHeader } from "./DosHeader.js";
import { ExportDirectory, tryParseExportDirectory } from "./ExportDirectory.js";
import { CoffFileHeader, tryParseCoffFileHeader } from "./NtHeader.js";
import { OptionalHeader, tryParseOptionalHeader } from "./OptionalHeader.js";
import { rvaToFileOffset, SectionHeader, tryParseSectionHeaders } from "./SectionHeader.js";

export type ParsedPe = {
    fileHeader: CoffFileHeader;
    optionalHeader: OptionalHeader;
    sections: SectionHeader[];
    exportDirectory: ExportDirectory | null;
    rvaToFileOffset: (rva: number) => number | null;
};

export class PeParser {
    public static parse(input: Readonly<Uint8Array> | ArrayBuffer): ParsedPe {
        const buffer = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
        const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

        const dosResult = tryParseDosHeader(buffer, view);
        if (dosResult.succeeded === false) {
            throw new Error(`Failed to parse DOS header: ${dosResult.reason}`);
        }

        const peSignatureOffset = dosResult.header.offset;
        if (!isValidPESignature(view, peSignatureOffset)) {
            throw new Error(`Invalid PE signature at offset ${peSignatureOffset}.`);
        }

        const coffOffset = peSignatureOffset + PE_SIGNATURE_SIZE;
        const coffResult = tryParseCoffFileHeader(buffer, view, coffOffset);
        if (coffResult.succeeded === false) {
            throw new Error(`Failed to parse COFF file header: ${coffResult.reason}`);
        }

        const fileHeader = coffResult.header;
        const optionalHeaderOffset = coffOffset + COFF_FILE_HEADER_SIZE;

        const optResult = tryParseOptionalHeader(
            buffer,
            view,
            optionalHeaderOffset,
            fileHeader.sizeOfOptionalHeader
        );
        if (optResult.succeeded === false) {
            throw new Error(`Failed to parse Optional Header: ${optResult.reason}`);
        }

        const optionalHeader = optResult.header;
        const sectionHeadersOffset = optionalHeaderOffset + fileHeader.sizeOfOptionalHeader;

        const sectionResult = tryParseSectionHeaders(
            buffer,
            view,
            sectionHeadersOffset,
            fileHeader.numberOfSections
        );
        if (sectionResult.succeeded === false) {
            throw new Error(`Failed to parse Section Headers: ${sectionResult.reason}`);
        }

        const sections = sectionResult.sections;
        const mapRvaToOffset = (rva: number) => rvaToFileOffset(rva, sections);

        let exportDirectory: ExportDirectory | null = null;
        if (optionalHeader.exportTable.virtualAddress !== 0) {
            const expResult = tryParseExportDirectory(
                buffer,
                view,
                optionalHeader.exportTable.virtualAddress,
                optionalHeader.exportTable.size,
                mapRvaToOffset
            );

            if (expResult.succeeded) {
                exportDirectory = expResult.exportDirectory;
            }
        }

        return {
            fileHeader,
            optionalHeader,
            sections,
            exportDirectory,
            rvaToFileOffset: mapRvaToOffset,
        };
    }
}
