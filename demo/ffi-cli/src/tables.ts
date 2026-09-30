import Table from "cli-table3";
import pc from "picocolors";
import { Plugin } from "xffi/node";

export function printDllSummaryTable(plugin: Plugin): void {
    const table = new Table({
        head: [pc.cyan("Property"), pc.cyan("Value")],
        style: { head: [], border: [] },
    });

    const arch = plugin.pe.fileHeader.machine === 0x8664 ? "AMD64 (x86-64 64-bit)" : `0x${plugin.pe.fileHeader.machine.toString(16)}`;
    const format = plugin.pe.optionalHeader.is64Bit ? "PE32+ (64-bit)" : "PE32 (32-bit)";

    table.push(
        [pc.bold("File Path"), plugin.path],
        [pc.bold("Internal Name"), plugin.pe.exportDirectory?.dllName || "N/A"],
        [pc.bold("Base Address (HMODULE)"), pc.green(`0x${plugin.baseAddress.toString(16)}`)],
        [pc.bold("Architecture"), arch],
        [pc.bold("Format"), format],
        [pc.bold("Section Count"), plugin.pe.sections.length.toString()],
        [pc.bold("Exported Functions"), plugin.functions.length.toString()]
    );

    console.log(table.toString());
}

export function printSectionsTable(plugin: Plugin): void {
    const table = new Table({
        head: [
            pc.cyan("Section"),
            pc.cyan("Virtual Address"),
            pc.cyan("Virtual Size"),
            pc.cyan("Raw File Offset"),
        ],
        style: { head: [], border: [] },
    });

    for (const sec of plugin.pe.sections) {
        table.push([
            pc.yellow(sec.name),
            `0x${sec.virtualAddress.toString(16).padStart(8, "0")}`,
            `0x${sec.virtualSize.toString(16).padStart(8, "0")} (${sec.virtualSize} bytes)`,
            `0x${sec.pointerToRawData.toString(16).padStart(8, "0")}`,
        ]);
    }

    console.log(table.toString());
}

export function printExportsTable(plugin: Plugin): void {
    if (plugin.functions.length === 0) {
        console.log(pc.yellow("  (No exported symbols declared in this binary)"));
        return;
    }

    const table = new Table({
        head: [
            pc.cyan("Ordinal"),
            pc.cyan("Function Symbol"),
            pc.cyan("RVA"),
            pc.cyan("Memory Address"),
            pc.cyan("Target / Status"),
        ],
        style: { head: [], border: [] },
    });

    for (const fn of plugin.functions) {
        const target = fn.forwarder
            ? pc.magenta(`Forwarded -> ${fn.forwarder}`)
            : pc.green("Native Code");

        table.push([
            `#${fn.ordinal}`,
            pc.bold(fn.name),
            `0x${fn.rva.toString(16).padStart(8, "0")}`,
            pc.green(`0x${fn.address.toString(16)}`),
            target,
        ]);
    }

    console.log(table.toString());
}

export function printMergedExportsTable(plugins: Plugin[]): void {
    const table = new Table({
        head: [
            pc.cyan("Source DLL"),
            pc.cyan("Ordinal"),
            pc.cyan("Function Symbol"),
            pc.cyan("RVA"),
            pc.cyan("Memory Address"),
            pc.cyan("Status"),
        ],
        style: { head: [], border: [] },
    });

    for (const plugin of plugins) {
        const dllName = plugin.pe.exportDirectory?.dllName || plugin.path.split(/[\\/]/).pop() || "unknown";

        for (const fn of plugin.functions) {
            const target = fn.forwarder
                ? pc.magenta(`-> ${fn.forwarder}`)
                : pc.green("Native Code");

            table.push([
                pc.yellow(dllName),
                `#${fn.ordinal}`,
                pc.bold(fn.name),
                `0x${fn.rva.toString(16).padStart(8, "0")}`,
                pc.green(`0x${fn.address.toString(16)}`),
                target,
            ]);
        }
    }

    console.log(table.toString());
}
