#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import {
    intro,
    outro,
    select,
    text,
    spinner,
    isCancel,
    cancel,
    note,
} from "@clack/prompts";
import pc from "picocolors";
import { xffi, Plugin, FunctionInfo } from "xffi/node";
import { openWindowsFileDialog } from "./file-picker.js";
import {
    printDllSummaryTable,
    printSectionsTable,
    printExportsTable,
    printMergedExportsTable,
} from "./tables.js";

// Global loaded plugins store
const loadedPlugins = new Map<string, Plugin>();

function getTotalFunctions(): number {
    let count = 0;
    for (const plugin of loadedPlugins.values()) {
        count += plugin.functions.length;
    }
    return count;
}

function loadDll(dllPath: string): boolean {
    const resolved = path.resolve(dllPath);
    if (loadedPlugins.has(resolved)) {
        note(`DLL is already loaded: ${resolved}`, "Info");
        return true;
    }

    try {
        const plugin = xffi.for(resolved);
        loadedPlugins.set(resolved, plugin);
        return true;
    } catch (err: any) {
        note(`Failed to load ${resolved}:\n${err.message}`, pc.red("Error"));
        return false;
    }
}

// ─── TAB 1: DLL Management ──────────────────────────────────────────
async function tabManageDlls(): Promise<void> {
    while (true) {
        const options: { value: string; label: string; hint?: string }[] = [
            {
                value: "explorer",
                label: "🗂️  Open Windows File Explorer",
                hint: "Pick one or multiple .dll files",
            },
            {
                value: "manual",
                label: "✍️  Enter file path manually",
                hint: "Type relative or absolute path",
            },
        ];

        if (loadedPlugins.size > 0) {
            options.push({
                value: "list",
                label: `📋 View loaded DLLs (${loadedPlugins.size})`,
                hint: "Inspect base addresses and unload options",
            });
            options.push({
                value: "unload",
                label: "🗑️  Unload a DLL",
                hint: "Free DLL memory and unlock file on disk",
            });
        }

        options.push({ value: "back", label: "🔙 Back to Main Menu" });

        const choice = await select({
            message: `[DLL Management] Currently loaded: ${pc.cyan(loadedPlugins.size.toString())} DLL(s)`,
            options,
        });

        if (isCancel(choice) || choice === "back") {
            break;
        }

        if (choice === "explorer") {
            const s = spinner();
            s.start("Waiting for Windows File Explorer...");
            const picked = openWindowsFileDialog();
            s.stop();

            if (picked.length === 0) {
                note("No files selected.", "Explorer");
            } else {
                let successCount = 0;
                for (const p of picked) {
                    if (loadDll(p)) successCount++;
                }
                note(`Successfully loaded ${successCount} of ${picked.length} selected DLL(s).`, pc.green("Success"));
            }
        } else if (choice === "manual") {
            const input = await text({
                message: "Enter path to .dll file:",
                placeholder: "../NativeLabrary/NativeLibrary/bin/Realese/net10.0/win-x64/publish/NativeLibrary.dll",
                validate(val) {
                    if (!val || val.trim().length === 0) return "Path cannot be empty.";
                    const resolved = path.resolve(val.trim());
                    if (!fs.existsSync(resolved)) return `File does not exist: ${resolved}`;
                },
            });

            if (!isCancel(input)) {
                if (loadDll(input.trim())) {
                    note(`Loaded: ${path.resolve(input.trim())}`, pc.green("Success"));
                }
            }
        } else if (choice === "list") {
            const lines: string[] = [];
            for (const [p, plugin] of loadedPlugins.entries()) {
                const name = plugin.pe.exportDirectory?.dllName || path.basename(p);
                lines.push(
                    `• ${pc.bold(name)} (${plugin.functions.length} funcs)\n  Path: ${p}\n  Base: 0x${plugin.baseAddress.toString(16)}`
                );
            }
            note(lines.join("\n\n"), pc.cyan("Loaded Libraries"));
        } else if (choice === "unload") {
            const unloadChoice = await select({
                message: "Select DLL to unload from memory:",
                options: [
                    ...Array.from(loadedPlugins.entries()).map(([p, plugin]) => ({
                        value: p,
                        label: plugin.pe.exportDirectory?.dllName || path.basename(p),
                        hint: p,
                    })),
                    { value: "cancel", label: "🔙 Cancel" },
                ],
            });

            if (!isCancel(unloadChoice) && unloadChoice !== "cancel") {
                const plugin = loadedPlugins.get(unloadChoice);
                if (plugin) {
                    plugin.close();
                    loadedPlugins.delete(unloadChoice);
                    note(`Unloaded and freed: ${path.basename(unloadChoice)}`, pc.green("Unloaded"));
                }
            }
        }
    }
}

// ─── TAB 2: Table Inspection ─────────────────────────────────────────
async function tabInspectTables(): Promise<void> {
    if (loadedPlugins.size === 0) {
        note("No DLLs currently loaded. Please load a DLL first in the [DLLs] tab.", pc.yellow("Notice"));
        return;
    }

    while (true) {
        const choice = await select({
            message: "[Inspection Tables] Choose display mode:",
            options: [
                {
                    value: "per_dll",
                    label: "📊 View detailed tables per DLL",
                    hint: "Header summary, Sections table, and Export Directory table for each DLL",
                },
                {
                    value: "merged",
                    label: "🔀 View single merged functions table",
                    hint: "Combines all functions across all loaded DLLs into one table",
                },
                {
                    value: "back",
                    label: "🔙 Back to Main Menu",
                },
            ],
        });

        if (isCancel(choice) || choice === "back") {
            break;
        }

        if (choice === "per_dll") {
            for (const plugin of loadedPlugins.values()) {
                const name = plugin.pe.exportDirectory?.dllName || path.basename(plugin.path);
                console.log(pc.bold(pc.magenta(`\n━━━ ${name} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)));
                printDllSummaryTable(plugin);
                console.log(pc.cyan("\n[Sections Table]"));
                printSectionsTable(plugin);
                console.log(pc.cyan("[Export Directory Table]"));
                printExportsTable(plugin);
            }
        } else if (choice === "merged") {
            console.log(pc.bold(pc.cyan("\n=== All Exported Functions Across Loaded Libraries ===")));
            printMergedExportsTable(Array.from(loadedPlugins.values()));
        }

        await text({
            message: pc.dim("Press Enter to return to table options..."),
        });
    }
}

// ─── TAB 3: Function Execution ───────────────────────────────────────
interface CallableItem {
    plugin: Plugin;
    fn: FunctionInfo;
    dllName: string;
}

async function tabExecuteFunctions(): Promise<void> {
    if (loadedPlugins.size === 0) {
        note("No DLLs currently loaded. Please load a DLL first in the [DLLs] tab.", pc.yellow("Notice"));
        return;
    }

    const callables: CallableItem[] = [];
    for (const plugin of loadedPlugins.values()) {
        const dllName = plugin.pe.exportDirectory?.dllName || path.basename(plugin.path);
        for (const fn of plugin.functions) {
            callables.push({ plugin, fn, dllName });
        }
    }

    if (callables.length === 0) {
        note("None of the loaded DLLs declare any exported functions.", pc.yellow("Notice"));
        return;
    }

    while (true) {
        const choice = await select({
            message: `[Function Execution] Pick an exported function to call (${callables.length} available):`,
            options: [
                ...callables.map((item, index) => ({
                    value: index,
                    label: `${pc.yellow(`[${item.dllName}]`)} ${pc.bold(item.fn.name)}`,
                    hint: item.fn.forwarder
                        ? `Forwarded -> ${item.fn.forwarder}`
                        : `RVA: 0x${item.fn.rva.toString(16).padStart(6, "0")} | Addr: 0x${item.fn.address.toString(16)}`,
                })),
                { value: -1, label: "🔙 Back to Main Menu" },
            ],
        });

        if (isCancel(choice) || choice === -1) {
            break;
        }

        const target = callables[choice];

        if (target.fn.forwarder) {
            note(`Cannot directly invoke '${target.fn.name}': it delegates to '${target.fn.forwarder}'`, "Forwarded");
            continue;
        }

        const mode = await select({
            message: `How should '${pc.bold(target.fn.name)}' be executed?`,
            options: [
                {
                    value: "string",
                    label: "📝 UTF-8 String (Allocates buffer, executes, and decodes string)",
                    hint: "Expects (bufferPtr, capacity) signature",
                },
                {
                    value: "numeric",
                    label: "🔢 Integer / Pointer Arguments",
                    hint: "Pass numbers into RCX, RDX, R8, R9 registers",
                },
                {
                    value: "cancel",
                    label: "🔙 Choose another function",
                },
            ],
        });

        if (isCancel(mode) || mode === "cancel") {
            continue;
        }

        if (mode === "string") {
            const capInput = await text({
                message: "Enter maximum buffer capacity in bytes:",
                initialValue: "256",
                validate(val) {
                    const n = parseInt(val, 10);
                    if (isNaN(n) || n <= 0) return "Must be a positive integer.";
                },
            });

            if (isCancel(capInput)) continue;

            const capacity = parseInt(capInput, 10);
            const callSpinner = spinner();
            callSpinner.start(`Invoking ${target.fn.name}(buffer, ${capacity})...`);

            try {
                const str = target.plugin.callForUtf8String(target.fn.name, capacity);
                callSpinner.stop(pc.green("✔ Execution succeeded!"));
                note(pc.bold(pc.green(`"${str}"`)), `Result of ${target.fn.name}`);
            } catch (err: any) {
                callSpinner.stop(pc.red("✖ Execution failed"));
                note(err.message, "Execution Error");
            }
        } else if (mode === "numeric") {
            const argsInput = await text({
                message: "Enter numeric arguments separated by spaces (e.g. '10 20'):",
                placeholder: "Leave blank if no arguments",
            });

            if (isCancel(argsInput)) continue;

            const rawArgs = argsInput.trim().length > 0 ? argsInput.trim().split(/\s+/) : [];
            const parsedArgs = rawArgs.map(arg => {
                if (/^-?\d+$/.test(arg)) return parseInt(arg, 10);
                if (/^-?\d+\.\d+$/.test(arg)) return parseFloat(arg);
                return 0;
            });

            const callSpinner = spinner();
            callSpinner.start(`Invoking ${target.fn.name}(${parsedArgs.join(", ")})...`);

            try {
                const retVal = target.plugin.call<number>(target.fn.name, ...(parsedArgs as number[]));
                callSpinner.stop(pc.green("✔ Execution succeeded!"));
                note(
                    `Return Value (RAX): ${pc.bold(pc.green(retVal.toString()))} (Hex: 0x${retVal.toString(16)})`,
                    `Result of ${target.fn.name}`
                );
            } catch (err: any) {
                callSpinner.stop(pc.red("✖ Execution failed"));
                note(err.message, "Execution Error");
            }
        }
    }
}

// ─── MAIN MENU DASHBOARD ─────────────────────────────────────────────
async function main() {
    console.clear();
    intro(pc.bold(pc.cyan("⚡ xffi — Interactive Native FFI Dashboard")));

    while (true) {
        const totalFuncs = getTotalFunctions();
        const statusLabel = loadedPlugins.size > 0
            ? pc.green(`[${loadedPlugins.size} DLL(s) loaded | ${totalFuncs} function(s)]`)
            : pc.dim("[No DLLs loaded]");

        const tab = await select({
            message: `Main Menu ${statusLabel}:`,
            options: [
                {
                    value: "dlls",
                    label: "📂 [DLLs] Manage Libraries",
                    hint: "Load from Explorer dialog, type path, or unload DLLs",
                },
                {
                    value: "tables",
                    label: "📊 [Tables] Inspect Binary Data",
                    hint: "PE headers summary, sections table, export directory",
                },
                {
                    value: "execute",
                    label: "⚡ [Execute] Call Functions",
                    hint: "Pick exported functions and execute with custom parameters",
                },
                {
                    value: "exit",
                    label: "🚪 [Exit] Quit xffi",
                    hint: "Unloads all DLLs from RAM and releases files",
                },
            ],
        });

        if (isCancel(tab) || tab === "exit") {
            break;
        }

        if (tab === "dlls") {
            await tabManageDlls();
        } else if (tab === "tables") {
            await tabInspectTables();
        } else if (tab === "execute") {
            await tabExecuteFunctions();
        }
    }

    // Cleanup all loaded modules
    for (const plugin of loadedPlugins.values()) {
        plugin.close();
    }

    outro(pc.bold(pc.cyan("✨ All libraries unmapped from RAM. Goodbye!")));
}

main().catch(err => {
    console.error(pc.red("\nFatal Error:"), err);
    process.exit(1);
});
