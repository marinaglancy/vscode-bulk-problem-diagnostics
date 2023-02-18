import { ExtensionContext, StatusBarAlignment, StatusBarItem, Uri, commands, languages, window, workspace } from 'vscode';
import { readDirectoryRecursively } from './fileutil';

let myStatusBarItem: StatusBarItem;
let lastFolder:Uri|null = null;
let lastFolderIndex:number = 0;
let globWatchedFiles:{[key: string]:{[file:string]:boolean}} = {};

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

  languages.onDidChangeDiagnostics((e) => {
    const maxSeverityLevel = (workspace.getConfiguration().get<number>('bulkProblemDiagnostics.maxSeverityLevel') ?? 2);
    const search = (workspace.getConfiguration().get<string>('bulkProblemDiagnostics.errorMessageMatch') ?? '');
    e.uris.filter(isWatched).forEach(uri => {
      const diag = languages.getDiagnostics(uri)
        .filter(d => d.severity < maxSeverityLevel && (!search.length || d.message.includes(search)));
      if (diag.length) {
        unWatch(uri);
        commands.executeCommand('vscode.open', uri);
      }
    });
  });
}

export function deactivate() {}

function isWatched(uri:Uri) {
  for (let key in globWatchedFiles) {
    if (globWatchedFiles[key][uri.path]) { return true; }
  }
  return false;
}

function unWatch(uri:Uri) {
  for (let key in globWatchedFiles) {
    delete globWatchedFiles[key][uri.path];
  }
}

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

async function openAllFiles(uri:Uri|null = null, continueLastFolder:boolean=false) {
  if (uri === null) {
    if (workspace.workspaceFolders && workspace.workspaceFolders.length) {
      uri = workspace.workspaceFolders[0].uri;
    } else {
      return;
    }
  }

  myStatusBarItem.text = `Retrieving all folder files...`;
  myStatusBarItem.show();

  const maxFiles = (workspace.getConfiguration().get<number>('bulkProblemDiagnostics.filesLimit') ?? 200);
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
    window.showInformationMessage(`Analysing files ${firstIndex + 1}-${lastIndex} out of ${files.length}`);
  }
  setLastFolder(files.length > lastIndex ? uri : null, lastIndex);

  const delay:number = workspace.getConfiguration().get<number>('bulkProblemDiagnostics.delay') ?? 100;
  let watchedList = [];
  for (let j = firstIndex; j < lastIndex; j++) {
    watchedList.push(files[j]);
  }
  const watchKey = (Math.random() + 1).toString(36).substring(7);
  globWatchedFiles[watchKey] = watchedList.reduce((p, u) => ({...p, [u.path]: true}), {});
  for (let i = 0; i < watchedList.length; i++) {
    try {
      await workspace.openTextDocument(watchedList[i]);
      myStatusBarItem.text = `Analysing ${i+1}/${lastIndex-firstIndex} files`;
      delay > 0 && await sleep(delay);
    } catch (e) {
      console.error(e);
    };
  }
  setTimeout(() => { delete globWatchedFiles[watchKey]; }, 15000);

  myStatusBarItem.hide();
}

function sleep(ms:number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
