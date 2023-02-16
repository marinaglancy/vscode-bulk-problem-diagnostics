import { Uri, workspace } from 'vscode';
import { moodleExcludedFiles } from './extra/moodle';

export async function extraExcludedFiles(rootUri:Uri): Promise<Array<string>> {
  const autoExclude:boolean =
    workspace.getConfiguration().get<boolean>('openAllFiles.autoExcludeFrameworkSuggestions') ?? true;
  if (!autoExclude) {
    return [];
  }

  // More framework detections can be added here:
  return [
    ...await moodleExcludedFiles(rootUri),
  ];
}
