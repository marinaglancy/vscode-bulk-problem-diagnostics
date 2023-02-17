import * as path from 'path';
import { RelativePattern, Uri, window, workspace } from 'vscode';
import { extraExcludedFiles } from './extraExcludedfiles';

export async function readDirectoryRecursively(fsPath:string): Promise<Array<Uri>> {
  const rootUri = getContainerRoot(fsPath);
  const relPath:string = path.relative(rootUri.fsPath, fsPath);

  let excludeFiles:Array<string> = workspace.getConfiguration().get<Array<string>>('bulkProblemDiagnostics.excludeFiles') ?? [];
  excludeFiles = [...excludeFiles, ...await extraExcludedFiles(rootUri)];
  const openFiles:string = workspace.getConfiguration().get<string>('bulkProblemDiagnostics.openFiles') ?? '**';

  const files = await workspace.findFiles(
    path.join(relPath, openFiles),
    excludeFiles.length ? new RelativePattern(rootUri, '{'+excludeFiles.join(',')+'}') : null
  );
  return files.sort((n1, n2) => n1.path.localeCompare(n2.path));
}

export function isSubDir(parent:string, dir:string): boolean {
  const relative = path.relative(parent, dir);
  return (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) ? true : false;
}

function getContainerRoot(fsPath:string): Uri {
  if (workspace.workspaceFolders && (workspace.workspaceFolders.length > 0)) {
    for (let f of workspace.workspaceFolders) {
      if (isSubDir(f.uri.fsPath, fsPath)) {
        return f.uri;
      }
    }
  }
  const error = `Path '${fsPath} is not inside of any workplace folders`;
  window.showErrorMessage(error);
  throw new Error(error);
}
