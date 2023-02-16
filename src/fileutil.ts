import * as fs from 'fs';
import * as path from 'path';
import { Uri, window, workspace } from 'vscode';

function isPathIncluded(relPath:string, rootUri:Uri, isDirectory:boolean): boolean {
  // TODO
  return true;
}

export async function readDirectoryRecursively(fsPath:string): Promise<Array<Uri>> {
  const rootUri = getContainerRoot(fsPath);
  const relPath:string = path.relative(rootUri.fsPath, fsPath);
  const paths = relPath === '' ? [] : normalizeFilePath(relPath).split('/');
  return await _readDirectoryRecursively(rootUri, paths);
}

export function isSubDir(parent:string, dir:string): boolean {
  const relative = path.relative(parent, dir);
  return (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) ? true : false;
}

async function _readDirectoryRecursively(rootUri:Uri,
    dirPathRelative:Array<string>): Promise<Array<Uri>> {
  let res:Array<Uri> = [], children;
  try {
    children = await fs.promises.readdir(
      path.join(rootUri.fsPath, ...dirPathRelative),
      { withFileTypes: true }
    );
  } catch (e) {
    console.error(e);
    return [];
  }

  for (let child of children.sort(compareDirent)) {
    const childPath = [...dirPathRelative, child.name].join('/');
    if (!isPathIncluded(childPath, rootUri, child.isDirectory())) { continue; }
    if (child.isDirectory()) {
      const res2 = await _readDirectoryRecursively(rootUri, [...dirPathRelative, child.name]);
      res = [...res, ...res2];
    } else {
      res.push(Uri.file(path.join(rootUri.fsPath, ...dirPathRelative, child.name)));
    }
  }
  return res;
}

export function normalizeFilePath(fsPath:string): string {
  return path.sep === '\\' ? fsPath.replace(/\\/g, '/') : fsPath;
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

/**
 * Compares two directory entries, returns first files and then folders sorted alphabetically
 */
export function compareDirent(n1:fs.Dirent, n2:fs.Dirent) {
  if (n1.isDirectory() && !n2.isDirectory()) {
    return 1;
  }

  if (!n1.isDirectory() && n2.isDirectory()) {
    return -1;
  }

  return n1.name.localeCompare(n2.name);
}
