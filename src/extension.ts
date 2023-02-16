import { ExtensionContext, Uri, commands, window } from 'vscode';
import { readDirectoryRecursively } from './fileutil';

export function activate(context: ExtensionContext) {

	context.subscriptions.push(
		commands.registerCommand('vscode-open-all-files.openAllFiles', (e) => {
		window.showInformationMessage('Hello World from vscode-open-all-files!');
		console.log(e);
		openAllFiles(e);
	}));
}

export function deactivate() {}

async function openAllFiles(uri:Uri) {
  let files:Array<Uri> = await readDirectoryRecursively(uri.fsPath);
  for (let f of files) {
		await window.showTextDocument(f);
  }
}
