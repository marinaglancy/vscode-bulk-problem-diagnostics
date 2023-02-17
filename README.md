# VS Code extension "Bulk Problem Diagnostics"

Opens all files in a folder and all subfolders recursively in order to
review problems. Splits large number of files in batches to prevent unloading.

Inspired by the issue:
https://github.com/microsoft/vscode/issues/13953

## Using the extension to review diagnostics

This extension is essential for reviewing problems on big projects. VS Code
only shows diagnostics for the opened files and automatically unloads files
and removes them from Problems view when too many files are open.

- Open "Problems" view (Ctrl+Shift+M)
- Right click on a folder in Explorer and choose "Open all files", this will open
  first 30 files
- Review the detected problems, make changes as needed
- Close all open files (Ctrl+K W)
- Right click on the folder again and choose "Open all files (continue)" or just
  press `Alt+Ctrl+Shift+O`, this will open the next batch of files
- Rinse and repeat

When using this extension for diagnostics you can adjust some settings, for example:
increase the delay between opening new files and choosing not to open them in an editor.

![Open All Files example](https://raw.githubusercontent.com/marinaglancy/vscode-bulk-problem-diagnostics/master/media/bulk-problem-diagnostics.png)

### Extension settings

| Setting                            | Description                                                                                                                                                     | Default                                   |
|------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------|
| Files Limit                        | Maximum number of files to open in one operation. If the folder has more files, the next command execution will start from where it finished last time.         | 30                                        |
| Open Files                         | Files to open. Examples: ```**``` - all files, ```**/*.{php,js}``` - only PHP and JS files",                                                                    | **                                        |
| Exclude Files                      | Configure glob patterns to exclude certain files and folders from opening. Relative paths are calculated from the workspace root (not the folder being opened). | ```**/.git/**, **/node_modules/**, ...``` |
| Auto Exclude Framework Suggestions | Automatically detect other files to exclude for some common projects or frameworks                                                                              | true                                      |
| Delay                              | Delay (in ms) between opening files to allow diagnostics to catch up with the newly loaded files                                                                | 200                                       |
| Open For Diagnostics Only          | Open files for diagnostics only, do not show in editor. The 'Problems' view will display all problems found in these files.                                     | false                                     |