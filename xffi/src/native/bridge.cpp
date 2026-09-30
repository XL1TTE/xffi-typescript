#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#define NAPI_VERSION 8
#include "node_api.h"

// JS: loadLibrary(path: string): bigint
// Calls Win32 LoadLibraryW to map the DLL into memory, returning the base memory address (HMODULE)
static napi_value LoadLibraryCallback(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, NULL, NULL);

    wchar_t path[MAX_PATH];
    size_t copied = 0;
    napi_get_value_string_utf16(env, args[0], (char16_t*)path, MAX_PATH, &copied);
    path[copied] = L'\0';

    HMODULE handle = LoadLibraryW(path);
    napi_value result;
    napi_create_bigint_uint64(env, (uint64_t)handle, &result);
    return result;
}

// JS: unloadLibrary(baseAddress: bigint): boolean
// Calls Win32 FreeLibrary to decrement module ref count and unmap when 0
static napi_value UnloadLibraryCallback(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, NULL, NULL);

    uint64_t handle = 0;
    bool lossless = true;
    napi_get_value_bigint_uint64(env, args[0], &handle, &lossless);

    BOOL success = FALSE;
    if (handle != 0) {
        success = FreeLibrary((HMODULE)handle);
    }

    napi_value result;
    napi_get_boolean(env, success != 0, &result);
    return result;
}

// JS: call(functionAddress: bigint, ...args: (number | bigint | Buffer)[]): int64
// Invokes the native function pointer directly according to x64 Windows ABI
static napi_value CallCallback(napi_env env, napi_callback_info info) {
    size_t argc = 5; // 1 function address + up to 4 native arguments
    napi_value args[5];
    napi_get_cb_info(env, info, &argc, args, NULL, NULL);

    uint64_t fnAddr = 0;
    bool lossless = true;
    napi_get_value_bigint_uint64(env, args[0], &fnAddr, &lossless);

    uint64_t nativeArgs[4] = {0, 0, 0, 0};

    for (size_t i = 1; i < argc && i <= 4; i++) {
        bool isBuf = false;
        napi_is_buffer(env, args[i], &isBuf);

        if (isBuf) {
            void* bufPtr = NULL;
            size_t bufLen = 0;
            napi_get_buffer_info(env, args[i], &bufPtr, &bufLen);
            nativeArgs[i - 1] = (uint64_t)bufPtr;
        } else {
            napi_valuetype type;
            napi_typeof(env, args[i], &type);
            if (type == napi_bigint) {
                uint64_t val = 0;
                napi_get_value_bigint_uint64(env, args[i], &val, &lossless);
                nativeArgs[i - 1] = val;
            } else {
                int64_t val = 0;
                napi_get_value_int64(env, args[i], &val);
                nativeArgs[i - 1] = (uint64_t)val;
            }
        }
    }

    // Windows x64 Calling Convention:
    // Arguments placed into RCX, RDX, R8, R9.
    // Return value in RAX.
    typedef uint64_t (*GenericFn)(uint64_t, uint64_t, uint64_t, uint64_t);
    GenericFn func = (GenericFn)fnAddr;
    uint64_t retVal = func(nativeArgs[0], nativeArgs[1], nativeArgs[2], nativeArgs[3]);

    napi_value result;
    napi_create_int64(env, (int64_t)retVal, &result);
    return result;
}

NAPI_MODULE_INIT() {
    napi_property_descriptor desc[] = {
        { "loadLibrary", NULL, LoadLibraryCallback, NULL, NULL, NULL, napi_default, NULL },
        { "unloadLibrary", NULL, UnloadLibraryCallback, NULL, NULL, NULL, napi_default, NULL },
        { "call", NULL, CallCallback, NULL, NULL, NULL, napi_default, NULL },
    };
    napi_define_properties(env, exports, 3, desc);
    return exports;
}
