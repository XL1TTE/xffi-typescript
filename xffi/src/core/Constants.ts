// PE and DOS constants
export const DOS_HEADER_MIN_SIZE = 64;
export const DOS_MAGIC = "MZ";
export const DOS_LFANEW_OFFSET = 0x3c;

export const PE_SIGNATURE_SIZE = 4;
export const PE_SIGNATURE = 0x00004550; // "PE\0\0" in uint32 little-endian

export const COFF_FILE_HEADER_SIZE = 20;

// Optional Header Magic
export const PE32_MAGIC = 0x010b;
export const PE32_PLUS_MAGIC = 0x020b;

// Optional Header Data Directory offsets
export const PE32_DATA_DIRECTORY_OFFSET = 96;
export const PE32_PLUS_DATA_DIRECTORY_OFFSET = 112;

// Data Directory entry size (VirtualAddress: 4 bytes, Size: 4 bytes)
export const DATA_DIRECTORY_ENTRY_SIZE = 8;
export const DATA_DIRECTORY_EXPORT_INDEX = 0;

// Section Header size
export const SECTION_HEADER_SIZE = 40;

// Export Directory size
export const IMAGE_EXPORT_DIRECTORY_SIZE = 40;

export enum MachineType {
    Unknown = 0x0,
    I386 = 0x014c,   // Intel 386 (x86 32-bit)
    Amd64 = 0x8664,  // AMD64 / x86-64 64-bit
    Arm64 = 0xaa64,  // ARM64 little-endian
}

export enum ImageCharacteristics {
    RelocsStripped = 0x0001,
    ExecutableImage = 0x0002,
    LargeAddressAware = 0x0020,
    Dll = 0x2000,
}
