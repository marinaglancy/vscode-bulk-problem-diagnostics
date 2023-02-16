import { ExtensionContext, Uri, commands, window, workspace } from 'vscode';
import { readDirectoryRecursively } from './fileutil';

export function activate(context: ExtensionContext) {

	context.subscriptions.push(
		commands.registerCommand('vscode-open-all-files.openAllFiles', (e) => {
		console.log(e);
		openAllFiles(e);
	}));
}

export function deactivate() {}

let lastFolder:string|null = null;
let lastFolderIndex:number = 0;

async function openAllFiles(uri:Uri) {
	const maxFiles = (workspace.getConfiguration().get<number>('openAllFiles.maxFiles') ?? 30);
  let files:Array<Uri> = await readDirectoryRecursively(uri.fsPath),
	    firstIndex = 0, lastIndex = Math.min(maxFiles, files.length);
	if (files.length > maxFiles) {
		if (lastFolder === uri.fsPath && lastFolderIndex < files.length) {
			firstIndex = lastFolderIndex;
			lastIndex = Math.min(firstIndex + maxFiles, files.length);
		}
		window.showInformationMessage(`Opening ${firstIndex + 1}-${lastIndex} of ${files.length} files`);
		lastFolder = uri.fsPath;
		lastFolderIndex = lastIndex;
	} else {
		lastFolder = null;
	}
	let count = 0;
  for (let i = firstIndex; i < lastIndex; i++) {
		await window.showTextDocument(files[i]);
  }
}
