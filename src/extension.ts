import { ExtensionContext, Uri, commands,
  languages, window, workspace, Tab, TabInputText, ProgressLocation, CancellationToken, Progress, Diagnostic } from 'vscode';
import { readDirectoryRecursively } from './fileutil';

let lastFolder:Uri|null = null;
let lastFolderIndex:number = 0;
let globWatchedFiles:{[key: string]:{[file:string]:boolean}} = {};

export function activate(context: ExtensionContext) {

  const commandId = 'bulk-problem-diagnostics.openAllFiles';
  const commandId2 = 'bulk-problem-diagnostics.openAllFilesContinue';
  setLastFolder(null);
  context.subscriptions.push(
    commands.registerCommand(commandId, (uri) => openAllFilesWithProgress(uri)));
  context.subscriptions.push(
    commands.registerCommand(commandId2, () => openAllFilesContinue()));

  languages.onDidChangeDiagnostics((e) => {
    e.uris.filter(isWatched).forEach(uri => showDocumentIfItHasProblems(uri));
  });
}

export function deactivate() {}

async function showDocumentIfItHasProblems(uri:Uri) {
  const maxSeverityLevel = (workspace.getConfiguration().get<number>('bulkProblemDiagnostics.maxSeverityLevel') ?? 2);
  const search = (workspace.getConfiguration().get<string>('bulkProblemDiagnostics.errorMessageMatch') ?? '');
  const diag = languages.getDiagnostics(uri)
    .filter((d:Diagnostic) => {
      if (d.severity >= maxSeverityLevel) { return false; }
      if (!search.length) { return true; }
      if (d.message.includes(search)) { return true; }
      if (d.code && typeof d.code === 'object' && d.code.value && `${d.code.value}`.includes(search)) { return true; }
      if (d.code && typeof d.code !== 'object' && `${d.code}`.includes(search)) { return true; }
      return false;
    });
  if (diag.length) {
    unWatch(uri);
    await commands.executeCommand('vscode.open', uri);
    await commands.executeCommand('workbench.action.keepEditor', uri);
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

function openAllFilesContinue() {
  if (lastFolder) {
    openAllFilesWithProgress(lastFolder, true);
  } else {
    window.showErrorMessage(`No more files to open`);
  }
}

async function openAllFilesWithProgress(uri:Uri|undefined = undefined, continueLastFolder:boolean=false) {
  uri = uri || (workspace.workspaceFolders ? workspace.workspaceFolders[0]?.uri : undefined);
  if (!uri) { return; }

  const location = ProgressLocation.Notification, cancellable = true;
  let title = 'Retrieving list of files...';
  let files:Array<Uri>|undefined = await window.withProgress({title, location, cancellable},
    async (progress, token) => uri ? await readDirectoryRecursively(uri.fsPath, token) : undefined);
  if (!files) { return; }

  const maxFiles = (workspace.getConfiguration().get<number>('bulkProblemDiagnostics.filesLimit') ?? 200);
  let firstIndex = 0, lastIndex = Math.min(maxFiles, files.length);
  if (continueLastFolder) {
    if (lastFolderIndex < files.length) {
      firstIndex = lastFolderIndex;
      lastIndex = Math.min(firstIndex + maxFiles, files.length);
    } else {
      window.showErrorMessage(`No more files to open`);
      setLastFolder(null);
      return;
    }
  }

  commands.executeCommand('workbench.action.problems.focus');
  title = `Analysing ${files.length} files`;
  if (files.length > maxFiles || firstIndex > 0) {
    title = `Analysing files ${firstIndex + 1}-${lastIndex} out of ${files.length}`;
  }
  lastIndex = await window.withProgress({ title, location, cancellable },
  async (progress: Progress<{ message?: string; increment?: number }>, token: CancellationToken) => {
    return await openAllFiles(files ?? [], firstIndex, lastIndex, progress, token);
  });

  if (files.length > lastIndex && uri) {
    setLastFolder(uri, lastIndex);
    window.showInformationMessage(
      `Finished analysing files ${firstIndex + 1}-${lastIndex} out of ${files.length}.`+
      ` To continue select "Open all files with problems (continue)" from the Command Palette or press "Continue".`,
      ...["Continue"]
    ).then((action) => {
      if (action === "Continue") {
        openAllFilesContinue();
      }
    });
  } else {
    setLastFolder(null);
  }
}

async function openAllFiles(files:Array<Uri>, firstIndex:number, lastIndex:number,
    progress: Progress<{ message?: string; increment?: number }>, token: CancellationToken): Promise<number> {

  const delay:number = workspace.getConfiguration().get<number>('bulkProblemDiagnostics.delay') ?? 200;
  const waitBeforeClosing:number = workspace.getConfiguration().get<number>('bulkProblemDiagnostics.waitBeforeClosing') ?? 3000;
  let watchedList = [];
  for (let j = firstIndex; j < lastIndex; j++) {
    watchedList.push(files[j]);
  }
  const watchKey = (Math.random() + 1).toString(36).substring(7);
  globWatchedFiles[watchKey] = watchedList.reduce((p, u) => ({...p, [u.path]: true}), {});
  let i = 0, timeStart = Date.now();
  for (i = 0; i < watchedList.length; i++) {
    if (token.isCancellationRequested) { break; }
    const remainingTime:number = i > 20 ? ((Date.now() - timeStart) * (lastIndex - firstIndex - i) / i) : 0;
    progress.report({message: remainingTime ? "Approximate time left - " + formatTimeLeft(remainingTime): '',
      increment: 100 / (lastIndex-firstIndex)});
    await ensureDocumentAnalysed(watchedList[i], waitBeforeClosing);
    delay > 0 && await sleep(delay);
  }
  setTimeout(() => { delete globWatchedFiles[watchKey]; }, 15000);
  return i + firstIndex;
}

async function ensureDocumentAnalysed(uri:Uri, waitBeforeClosing:number) {
  if (await showDocumentIfItHasProblems(uri)) {
    // We already know it has problems.
    return;
  }
  try {
    if (findFileInTabGroups(uri)) {
      // Document found in the tab groups, switch to it to ensure the event is fired and it is analysed.
      await commands.executeCommand('vscode.open', uri);
    } else {
      // Open document (not as preview), wait 10 times the delay interval and close it if it has no problems.
      await workspace.openTextDocument(uri); // this will throw an error if the file is binary.
      const res = await commands.executeCommand('vscode.open', uri); // open the document in the editor and switch to it.
      await commands.executeCommand("workbench.action.keepEditor", uri); // make sure the document is not opened in preview mode.
      setTimeout(async () => {
        if (!(await showDocumentIfItHasProblems(uri))) {
          let tab:Tab|null = findFileInTabGroups(uri);
          tab && await window.tabGroups.close(tab);
        }
      }, waitBeforeClosing);
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

function formatTimeLeft(ms:number):string {
  const f = (n:number, addZero:boolean = true):string => addZero && n < 10 ? '0' + n : '' + n;
  const time = [
    ...(ms > 3600000 ? [f(Math.floor(ms / 3600000), false)+'h'] : []),
    f(Math.floor(ms / 60000) % 60, ms > 3600000),
    f(Math.floor(ms / 1000) % 60),
  ];
  if (ms/60000 > 2) {
    // Do not show seconds if over 2 minutes left.
    return time.slice(0, -1).join(' ')+'m';
  }
  return time.join(':') + 's';
}
