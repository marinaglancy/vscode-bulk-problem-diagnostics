import * as fs from 'fs';
import * as path from 'path';
import { RelativePattern, Uri, workspace } from 'vscode';
import * as xmlParser from 'fast-xml-parser';

export async function moodleExcludedFiles(rootUri:Uri): Promise<Array<string>> {
  // If root folder is a Moodle folder, exclude build files and third party libs.
  if (!detectHasMoodle(rootUri)) { return []; }
  const libs = [
    ...getThirdPartyLibraries(rootUri, 'lib'),
    ...await getPluginsThirdPartyLibraries(rootUri)
  ];
  return [
    '**/amd/build/**',
    '**/yui/build/**',
    ...libs,
    ...libs.map(l => `${l}/**`)
  ];
}

function detectHasMoodle(rootUri:Uri): boolean {
  const d:string = rootUri.fsPath;
  return (
    pathExists(path.join(d, 'lib', 'moodlelib.php')) &&
    pathExists(path.join(d, 'version.php')) &&
    pathExists(path.join(d, 'lib', 'db', 'install.xml')) &&
    pathExists(path.join(d, 'lib', 'classes', 'plugin_manager.php')) &&
    pathExists(path.join(d, 'lang', 'en', 'moodle.php')) &&
    pathExists(path.join(d, 'lib', 'classes', 'component.php')) &&
    pathExists(path.join(d, 'lib', 'thirdpartylibs.xml')));
}

function pathExists(p: string): boolean {
  try {
    fs.accessSync(p);
  } catch (err) {
    return false;
  }
  return true;
}

export function getThirdPartyLibraries(rootUri:Uri, relpath:string):Array<string> {
  const tplpath = path.join(rootUri.fsPath, relpath, 'thirdpartylibs.xml');
  let libs:Array<string> = [];
  if (pathExists(tplpath)) {
    const parser = new xmlParser.XMLParser();
    const text = fs.readFileSync(tplpath).toString();
    let jObj = parser.parse(text);
    if (jObj && jObj.libraries && jObj.libraries.library && jObj.libraries.library.length) {
      jObj.libraries.library.forEach((l:{location?:string}) => {
        l.location && libs.push(`${relpath}/${l.location}`);
      });
    } else if (jObj && jObj.libraries && jObj.libraries.library && jObj.libraries.library.location) {
      libs.push(`${relpath}/${jObj.libraries.library.location}`);
    }
  }
  return libs;
}

async function getPluginsThirdPartyLibraries(rootUri:Uri):Promise<Array<string>> {
  const ptypes = await getPluginTypesDirs(path.join(rootUri.fsPath, 'lib', 'components.json'));
  let res:Array<string> = [];
  for (let ptypeDir of Object.values(ptypes)) {
    const files = await workspace.findFiles(
      new RelativePattern(path.join(rootUri.fsPath, ptypeDir), '*/thirdpartylibs.xml'));
    for (let f of files) {
      const relpath = path.dirname(path.relative(rootUri.path, f.path));
      res = [...res, ...getThirdPartyLibraries(rootUri, relpath)];
    }
  }
  return res;
}

async function getPluginTypesDirs(jsonpath:string):Promise<{ [key: string]: string }> {
  if (pathExists(jsonpath)) {
    const json = await JSON.parse(fs.readFileSync(jsonpath, 'utf-8'));
    return json.plugintypes ? json.plugintypes : {};
  }
  return {};
}
