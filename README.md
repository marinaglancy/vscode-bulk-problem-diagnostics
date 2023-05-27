[![Version](https://img.shields.io/visual-studio-marketplace/v/MarinaGlancy.bulk-problem-diagnostics)](https://marketplace.visualstudio.com/items?itemName=MarinaGlancy.bulk-problem-diagnostics)

# VS Code extension "Bulk Problem Diagnostics"

Opens all files with problems. Splits large number of files in batches to prevent unloading.

Inspired by the issue:
https://github.com/microsoft/vscode/issues/13953

Normally VS Code only shows diagnostics for the opened files and automatically unloads files
and removes them from Problems view when too many files are open.

This extension iterates through all files, opens them one by one, waits a little and then closes
files that do not have problems.

To analyse first batch of files (by default 200):
- Right click on a folder in Explorer and choose **"Open all files with problems"**, or
- Choose command **"Open all files with problems"** from the Command Palette (Ctrl+Shift+P)

To continue:
- Right click on the folder again and choose **"Open all files with problems (continue)"**, or
- Press `Alt+Ctrl+Shift+O` or select **"Open all files with problems (continue)"** from the Command Palette, or
- Press "Continue" in the notification that appears after the first command execution

![Example](https://raw.githubusercontent.com/marinaglancy/vscode-bulk-problem-diagnostics/master/media/bulk-problem-diagnostics.png)

### Extension settings

| Setting | Description | Default |
|---|---|---|
| Files Limit | Maximum number of files to analyse in one operation. If the folder has more files, the next command execution will start from where it finished last time. | 200 |
| Open Files | Files to analyse. Examples: '**' - all files, '**/*.{php,js}' - only PHP and JS files | ** |
| Exclude Files | Configure glob patterns to exclude certain files and folders from analysing. Relative paths are calculated from the workspace root (not the folder being analysed). | ```**/.git/**, **/node_modules/**, ...``` |
| Auto Exclude Framework Suggestions | Automatically detect other files to exclude for some common projects or frameworks | true |
| Delay | Delay (in ms) between analysing files to allow diagnostics to catch up with the newly loaded files | 100 |
| Max Severity Level | Maximum problem severity level, file will only be open if it contains problems of this or lower levels (1 - errors, 2 - warnings, 3 - notices) | 2 |
| Error Message Match | If specified, will only open files that have problems that match this setting |  |