import { execSync } from "node:child_process";

/**
 * Opens the native Windows File Explorer dialog using PowerShell with STA mode,
 * ensuring it pops up in the foreground and supports multi-selection of DLLs.
 */
export function openWindowsFileDialog(): string[] {
    const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Filter = "Dynamic Link Libraries (*.dll)|*.dll|All files (*.*)|*.*"
$dialog.Title = "Select one or more DLLs to inspect with xffi"
$dialog.Multiselect = $true
$dialog.RestoreDirectory = $true

# Create an invisible topmost window owner to guarantee dialog pops into foreground
$owner = New-Object System.Windows.Forms.Form
$owner.TopMost = $true

$result = $dialog.ShowDialog($owner)
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
    $dialog.FileNames | ForEach-Object { Write-Output $_ }
}
`.trim();

    try {
        const encodedCommand = Buffer.from(psScript, "utf16le").toString("base64");
        const output = execSync(
            `powershell -STA -NoProfile -EncodedCommand ${encodedCommand}`,
            { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }
        );

        return output
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0);
    } catch {
        return [];
    }
}
