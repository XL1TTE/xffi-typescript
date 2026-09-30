
using System.Runtime.InteropServices;
using System.Text;

namespace NativeLibrary;

public static unsafe class Lib
{
    [UnmanagedCallersOnly(EntryPoint = "get_message")]
    public static int GetMessage(byte* buffer, int bufferCapacity)
    {
        string message = "Hello from native AOT library!";

        int reqBytes = Encoding.UTF8.GetByteCount(message) + 1;

        if(buffer == null || bufferCapacity <= 0) return reqBytes;

        if(bufferCapacity < reqBytes) return -1;

        Span<byte> dest = new Span<byte>(buffer, bufferCapacity);
        
        int written = Encoding.UTF8.GetBytes(message, dest);
        dest[written] = 0;

        return written;
    }

}
