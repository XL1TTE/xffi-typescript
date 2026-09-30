<div align="center">

# ⚡ xffi

**A lightweight, modern Native FFI and Windows PE library for TypeScript & JavaScript.**

Inspect Windows dynamic libraries (`.dll`), discover exported symbols, and invoke native functions directly from TypeScript with full type-safety and automatic memory management.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows_x64-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://microsoft.com/windows)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen?style=for-the-badge)](package.json)

</div>

---

## ✨ Highlights

- **🔍 Zero-Config PE Inspection**: Read and decode headers, sections, and export directories without `dumpbin` or external tools.
- **⚡ Direct Typed Invocation**: Invoke native C-ABI functions directly from TypeScript.
- **📝 UTF-8 String & Buffer Support**: First-class handling for native functions that populate caller-allocated buffers or return C-strings.
- **🛡️ Scope-Based Memory Management**: Supports TypeScript 5.2+ `using` explicit resource management and `.close()` to automatically unmap memory and release file locks.
- **🌐 Universal Engine**: Static PE binary parser is built on standard `Uint8Array` / `DataView` with zero OS dependencies—runs in Node.js, Bun, Deno, and web browsers.

---

## 📦 Installation

Install directly from GitHub via npm:

### Direct GitHub Dependency (`#path:xffi`)

```bash
# Using GitHub shorthand
npm install github:XL1TTE/xffi-typescript#path:xffi

# Or using the full Git URL
npm install git+https://github.com/XL1TTE/xffi-typescript.git#path:xffi
```

Or add it directly to your `package.json`:

```json
{
  "dependencies": {
    "xffi": "github:XL1TTE/xffi-typescript#path:xffi"
  }
}
```

---

### Local Clone & Link

```bash
# 1. Clone the repository
git clone https://github.com/XL1TTE/xffi-typescript.git
cd xffi-typescript/xffi

# 2. Build the library
npm install
npm run build

# 3. In your project, link the local directory
npm install ../path/to/xffi/xffi
```

---

## 🚀 Quick Start

### 1. Loading a Library & Calling Functions

```typescript
import { xffi } from "xffi/node";

// 1. Load and parse the dynamic library
const plugin = xffi.for("./MyLibrary.dll");

// 2. Discover exported functions
console.log(plugin.functions);
// => [
//   { name: "add_numbers", ordinal: 1, address: 0x7ffa12341040n, rva: 0x1040, ... },
//   { name: "get_message", ordinal: 2, ... }
// ]

// 3. Call a function with numeric arguments
const sum = plugin.call<number>("add_numbers", 10, 20);
console.log("Sum:", sum); // 30

// 4. Call a function that writes to a UTF-8 buffer
const message = plugin.callForUtf8String("get_message", 256);
console.log("Message:", message);

// 5. Unload the library from RAM when finished
plugin.close();
```

---

### 2. Automatic Scope Cleanup with `using`

`xffi` implements the ECMAScript / TypeScript standard `Disposable` interface. With TypeScript 5.2+, you can use the `using` keyword to ensure the DLL is automatically unmapped from RAM the moment execution leaves the block:

```typescript
import { xffi } from "xffi/node";

function executeTask() {
    using plugin = xffi.for("./MyLibrary.dll");

    const result = plugin.call<number>("process_data", 42);
    return result;
} // 'plugin' is automatically closed and freed from RAM here!
```

---

### 3. Static Inspection Anywhere (Browser, Deno, Bun)

The core inspection engine has zero native or Node.js dependencies. You can parse DLL binaries directly in the browser or any web-standard runtime:

```typescript
import { fromUrl, fromBlob, PeParser } from "xffi";

// Browser: inspect a DLL fetched over HTTP
const pe = await fromUrl("https://example.com/assets/plugin.dll");

console.log("Machine Architecture:", pe.fileHeader.machine);
console.log("Exported Symbols:", pe.exportDirectory?.symbols);
```

---

## 📖 API Reference

### `xffi` (Node.js Entry)

| Method | Description |
| :--- | :--- |
| `xffi.for(dllPath: string): Plugin` | Parses the PE binary on disk, maps it into process memory, and returns an encapsulated `Plugin` instance. |

### `Plugin` Instance

| Member | Type | Description |
| :--- | :--- | :--- |
| `functions` | `readonly FunctionInfo[]` | List of all exported functions (`name`, `ordinal`, `rva`, `address`, `forwarder`). |
| `baseAddress` | `bigint` | In-memory base address (`HMODULE`) where the DLL was loaded. |
| `pe` | `ParsedPe` | Full PE structure (DOS header, COFF header, Optional header, Sections, Export directory). |
| `has(name)` | `boolean` | Checks whether a symbol is exported by the DLL. |
| `call<TReturn>(name, ...args)` | `TReturn` | Calls the native function, passing numbers, bigints, or buffers into registers (`RCX`, `RDX`, `R8`, `R9`). |
| `callForUtf8String(name, cap?)` | `string` | Allocates a native buffer, calls `(bufferPtr, capacity)`, and decodes the resulting UTF-8 string. |
| `close()` | `boolean` | Unmaps the library from RAM via Win32 `FreeLibrary` and unlocks the file on disk. |
| `[Symbol.dispose]()` | `void` | Automatically called when exiting a `using` block. |

---

## 💻 Requirements & Compatibility

| Component | Requirement |
| :--- | :--- |
| **Operating System** | Windows 10 / 11 (x64) |
| **Node.js** | v16.0.0 or newer |
| **TypeScript** | v5.0 or newer (v5.2+ for `using` keyword) |
| **Compiled Targets** | Any C-ABI dynamic library (`.dll`) from C, C++, Rust, Zig, or C# (Native AOT) |

---

## 📜 Resource Ownership & Safety

- **Calling Convention**: Targets standard 64-bit Windows calling convention (`__cdecl`, `extern "C"`, `[UnmanagedCallersOnly]`).
- **Memory Safety**: Always close libraries when finished in long-running processes via `.close()` or `using` to reclaim memory pages and release OS file locks.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
