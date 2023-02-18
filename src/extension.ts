import { ExtensionContext, StatusBarAlignment, StatusBarItem, Uri, commands,
  languages, window, workspace, Tab, TabInputText } from 'vscode';
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
    e.uris.filter(isWatched).forEach(uri => showDocumentIfItHasProblems(uri));
  });
}

export function deactivate() {}

function showDocumentIfItHasProblems(uri:Uri) {
  const maxSeverityLevel = (workspace.getConfiguration().get<number>('bulkProblemDiagnostics.maxSeverityLevel') ?? 2);
  const search = (workspace.getConfiguration().get<string>('bulkProblemDiagnostics.errorMessageMatch') ?? '');
  const diag = languages.getDiagnostics(uri)
    .filter(d => d.severity < maxSeverityLevel && (!search.length || d.message.includes(search)));
  if (diag.length) {
    unWatch(uri);
    commands.executeCommand('vscode.open', uri);
    return true;
  }
  return false;
}

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
    myStatusBarItem.text = `Analysing ${i+1}/${lastIndex-firstIndex} files`;
    await ensureDocumentAnalysed(watchedList[i]);
    delay > 0 && await sleep(delay);
  }
  setTimeout(() => { delete globWatchedFiles[watchKey]; }, 15000);

  myStatusBarItem.hide();
}

async function ensureDocumentAnalysed(uri:Uri) {
  if (showDocumentIfItHasProblems(uri)) {
    // We already know it has problems.
    return;
  }
  let res;
  try {
    let tds = workspace.textDocuments.filter(td => td.uri.path === uri.path);
    if (!tds.length) {
      // The document is not loaded in vscode.
      // By calling workspace.openTextDocument we fire the onDidOpenTextDocument that will
      // prompt other extensions to recalculate and register diagnostics.
      // This command will load the document but not show it in a tab.
      await workspace.openTextDocument(uri);
    } else {
      // This file is already loaded, we can not call workspace.openTextDocument because it will not fire event.
      if (findFileInTabGroups(uri)) {
        // Document found in the tab groups, switch to it to ensure the event is fired and it is analysed.
        await commands.executeCommand('vscode.open', uri);
      } else {
        // Document is loaded but not in any tab groups. Open it, close and load again.
        // Yes, this causes annoying blinking if the "Open all files with problems" is executed several
        // times on the small folder but it's better than not to report diagnostics.
        await commands.executeCommand('vscode.open', uri);
        let tab:Tab|null = findFileInTabGroups(uri);
        tab && await window.tabGroups.close(tab);
        await workspace.openTextDocument(uri);
      }
    }
  } catch (e) {
    if (!(e instanceof Error) || !e.message.includes('File seems to be binary')) { console.error(e); }
  };
}

function sleep(ms:number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function findFileInTabGroups(uri:Uri):Tab|null {
  const tabs: Tab[] = window.tabGroups.all.map(tg => tg.tabs).flat();
  const index = tabs.findIndex(tab => tab.input instanceof TabInputText && tab.input.uri.path === uri.path);
  if (index !== -1) {
      return tabs[index];
  }
  return null;
}
