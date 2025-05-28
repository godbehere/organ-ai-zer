import * as fs from 'fs-extra';
import * as path from 'path';
import { OrganizationSuggestion } from '../types';

export class FileOrganizer {
  async applySuggestions(suggestions: OrganizationSuggestion[]): Promise<void> {
    for (const suggestion of suggestions) {
      try {
        await this.moveFile(suggestion);
        console.log(`✅ Moved: ${suggestion.file.name} → ${suggestion.suggestedPath}`);
      } catch (error) {
        console.error(`❌ Failed to move ${suggestion.file.name}: ${error}`);
      }
    }
  }

  private async moveFile(suggestion: OrganizationSuggestion): Promise<void> {
    const targetDir = path.dirname(suggestion.suggestedPath);
    
    // Ensure target directory exists
    await fs.ensureDir(targetDir);
    
    // Check if target file already exists
    if (await fs.pathExists(suggestion.suggestedPath)) {
      const newPath = await this.generateUniqueFilename(suggestion.suggestedPath);
      suggestion.suggestedPath = newPath;
    }
    
    // Move the file
    await fs.move(suggestion.file.path, suggestion.suggestedPath);
  }

  private async generateUniqueFilename(filePath: string): Promise<string> {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);
    
    let counter = 1;
    let newPath = filePath;
    
    while (await fs.pathExists(newPath)) {
      newPath = path.join(dir, `${name}_${counter}${ext}`);
      counter++;
    }
    
    return newPath;
  }

  async createBackup(directory: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resolvedDir = path.resolve(directory);
    const parentDir = path.dirname(resolvedDir);
    const dirName = path.basename(resolvedDir);
    const backupPath = path.join(parentDir, `backup_${dirName}_${timestamp}`);
    
    await fs.copy(directory, backupPath);
    return backupPath;
  }
}