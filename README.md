[![Version](https://img.shields.io/visual-studio-marketplace/v/MarinaGlancy.bulk-problem-diagnostics)](https://marketplace.visualstudio.com/items?itemName=MarinaGlancy.bulk-problem-diagnostics)

# VS Code extension "Bulk Problem Diagnostics"

Opens all files with problems. Splits large number of files in batches to prevent unloading.

Inspired by the issue:
https://github.com/microsoft/vscode/issues/13953

## Using the extension to review diagnostics

This extension is essential for reviewing problems in big projects. VS Code
only shows diagnostics for the opened files and automatically unloads files
and removes them from Problems view when too many files are open.

- Open "Problems" view (Ctrl+Shift+M)
- Right click on a folder in Explorer and choose "Open all files with problems",
  this will analyse first 200 files and open the ones that have problems
- **To run the command "Open all files with problems" on the whole workspace
  choose it from the command menu (Ctrl+Shift+P)**
- Review the detected problems, make changes as needed
- Close all open files (Ctrl+K W) if needed
- Right click on the folder again and choose "Open all files with problems (continue)"
  or just press `Alt+Ctrl+Shift+O`, this will analyse the next batch of files
- Rinse and repeat

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