import {
    COFF_FILE_HEADER_SIZE,
    ImageCharacteristics,
    MachineType,
} from "./Constants.js";

export type CoffFileHeader = {
    machine: MachineType | number;
    numberOfSections: number;
    timeDateStamp: number;
    pointerToSymbolTable: number;
    numberOfSymbols: number;
    sizeOfOptionalHeader: number;
    characteristics: number;
    isDll: boolean;
};

export type CoffFileHeaderParseResult =
    | { succeeded: true; header: CoffFileHeader }
    | { succeeded: false; reason: string };

export function tryParseCoffFileHeader(
    buffer: Readonly<Uint8Array>,
    view: Readonly<DataView>,
    offset: number
): CoffFileHeaderParseResult {
    if (offset + COFF_FILE_HEADER_SIZE > buffer.length) {
        return {
            succeeded: false,
            reason: `Buffer too small to contain COFF File Header at offset ${offset}`,
        };
    }

    const machine = view.getUint16(offset + 0, true);
    const numberOfSections = view.getUint16(offset + 2, true);
    const timeDateStamp = view.getUint32(offset + 4, true);
    const pointerToSymbolTable = view.getUint32(offset + 8, true);
    const numberOfSymbols = view.getUint32(offset + 12, true);
    const sizeOfOptionalHeader = view.getUint16(offset + 16, true);
    const characteristics = view.getUint16(offset + 18, true);

    const header: CoffFileHeader = {
        machine,
        numberOfSections,
        timeDateStamp,
        pointerToSymbolTable,
        numberOfSymbols,
        sizeOfOptionalHeader,
        characteristics,
        isDll: (characteristics & ImageCharacteristics.Dll) !== 0,
    };

    return {
        succeeded: true,
        header,
    };
}
