import { ExtensionContext, StatusBarAlignment, StatusBarItem, Uri, commands, window, workspace } from 'vscode';
import { readDirectoryRecursively } from './fileutil';

let myStatusBarItem: StatusBarItem;
let lastFolder:Uri|null = null;
let lastFolderIndex:number = 0;

export function activate(context: ExtensionContext) {

  const commandId = 'bulk-problem-diagnostics.openAllFiles';
  const commandId2 = 'bulk-problem-diagnostics.openAllFilesContinue';
  setLastFolder(null);
  context.subscriptions.push(
    commands.registerCommand(commandId, (uri) => openAllFiles(uri)));
  context.subscriptions.push(
    commands.registerCommand(commandId2, () => openAllFilesContinue()));

  myStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 100);
  context.subscriptions.push(myStatusBarItem);
}

export function deactivate() {}

function setLastFolder(uri:Uri|null, idx:number = 0) {
  if (uri) {
    lastFolder = uri;
    commands.executeCommand('setContext', 'bulkProblemDiagnostics.lastFolder', [lastFolder.fsPath]);
    commands.executeCommand('setContext', 'bulkProblemDiagnostics.hasLastFolder', true);
    lastFolderIndex = idx;
  } else {
    lastFolder = null;
    commands.executeCommand('setContext', 'bulkProblemDiagnostics.lastFolder', []);
    commands.executeCommand('setContext', 'bulkProblemDiagnostics.hasLastFolder', false);
    lastFolderIndex = 0;
  }
}

async function openAllFilesContinue() {
  if (lastFolder) {
    await openAllFiles(lastFolder, true);
  } else {
    window.showErrorMessage(`No more files to open`);
  }
}

async function openAllFiles(uri:Uri, continueLastFolder:boolean=false) {
  myStatusBarItem.text = `Retrieving all folder files...`;
  myStatusBarItem.show();

  const maxFiles = (workspace.getConfiguration().get<number>('bulkProblemDiagnostics.filesLimit') ?? 30);
  let files:Array<Uri> = await readDirectoryRecursively(uri.fsPath),
      firstIndex = 0, lastIndex = Math.min(maxFiles, files.length);

  if (continueLastFolder) {
    if (lastFolderIndex < files.length) {
      firstIndex = lastFolderIndex;
      lastIndex = Math.min(firstIndex + maxFiles, files.length);
    } else {
      window.showErrorMessage(`No more files to open`);
      setLastFolder(null);
      myStatusBarItem.hide();
      return;
    }
  }
  if (files.length > maxFiles || firstIndex > 0) {
    window.showInformationMessage(`Opening files ${firstIndex + 1}-${lastIndex} out of ${files.length}`);
  }
  setLastFolder(files.length > lastIndex ? uri : null, lastIndex);

  const diagnOnly:boolean = workspace.getConfiguration().get<boolean>('bulkProblemDiagnostics.openForDiagnosticsOnly') ?? false;
  const delay:number = workspace.getConfiguration().get<number>('bulkProblemDiagnostics.delay') ?? 200;
  for (let i = firstIndex; i < lastIndex; i++) {
    try {
      if (diagnOnly) {
        await workspace.openTextDocument(files[i]);
      } else {
        await commands.executeCommand('vscode.open', files[i]);
      }
      myStatusBarItem.text = `Opened ${i-firstIndex+1}/${lastIndex-firstIndex} files`;
      delay > 0 && await sleep(delay);
    } catch (e) {
      console.error(e);
    };
  }

  myStatusBarItem.hide();
}

function sleep(ms:number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
