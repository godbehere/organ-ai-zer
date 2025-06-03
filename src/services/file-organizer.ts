import * as fs from 'fs-extra';
import * as path from 'path';
import { OrganizationSuggestion } from '../types';

export class FileOrganizer {
  async applySuggestions(suggestions: OrganizationSuggestion[]): Promise<void> {
    const sourceDirectories = new Set<string>();
    
    for (const suggestion of suggestions) {
      try {
        // Track source directories for cleanup
        const sourceDir = path.dirname(suggestion.file.path);
        sourceDirectories.add(sourceDir);
        
        await this.moveFile(suggestion, sourceDir);
        console.log(`✅ Moved: ${suggestion.file.name} → ${suggestion.suggestedPath}`);
      } catch (error) {
        console.error(`❌ Failed to move ${suggestion.file.name}: ${error}`);
      }
    }
    
    // Clean up empty directories
    await this.cleanupEmptyDirectories(Array.from(sourceDirectories));
  }

  private async moveFile(suggestion: OrganizationSuggestion, sourceDir: string): Promise<void> {
    const targetDir = path.join(sourceDir, path.dirname(suggestion.suggestedPath));
    
    // Ensure target directory exists
    await fs.ensureDir(targetDir);
    
    // Check if target file already exists
    if (await fs.pathExists(suggestion.suggestedPath)) {
      const newPath = await this.generateUniqueFilename(suggestion.suggestedPath);
      suggestion.suggestedPath = newPath;
    }
    
    // Move the file
    await fs.move(path.resolve(suggestion.file.path), path.resolve(path.join(sourceDir, suggestion.suggestedPath)));
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

  private async cleanupEmptyDirectories(directories: string[]): Promise<void> {
    // Sort directories by depth (deepest first) to ensure we clean up child directories before parents
    const sortedDirectories = directories.sort((a, b) => b.split('/').length - a.split('/').length);
    
    for (const directory of sortedDirectories) {
      try {
        await this.cleanupEmptyDirectory(directory);
      } catch (error) {
        console.warn(`⚠️  Could not cleanup directory ${directory}: ${error}`);
      }
    }
  }

  private async cleanupEmptyDirectory(directory: string): Promise<void> {
    try {
      // Check if directory exists
      if (!(await fs.pathExists(directory))) {
        return;
      }

      // Read directory contents
      const contents = await fs.readdir(directory);
      
      // If directory is empty, remove it
      if (contents.length === 0) {
        await fs.remove(directory);
        console.log(`🗑️  Removed empty directory: ${directory}`);
        
        // Recursively check parent directory
        const parentDir = path.dirname(directory);
        if (parentDir !== directory) { // Avoid infinite recursion at root
          await this.cleanupEmptyDirectory(parentDir);
        }
      }
      // If directory only contains hidden files (like .DS_Store), we might want to remove it too
      else if (contents.every(item => item.startsWith('.'))) {
        // Only remove if all files are common system files
        const systemFiles = ['.DS_Store', '.Thumbs.db', 'desktop.ini'];
        if (contents.every(item => systemFiles.includes(item))) {
          // Remove system files first
          for (const file of contents) {
            await fs.remove(path.join(directory, file));
          }
          // Then remove the directory
          await fs.remove(directory);
          console.log(`🗑️  Removed directory with only system files: ${directory}`);
          
          // Recursively check parent directory
          const parentDir = path.dirname(directory);
          if (parentDir !== directory) {
            await this.cleanupEmptyDirectory(parentDir);
          }
        }
      }
    } catch (error) {
      // Silently ignore errors during cleanup - it's not critical
      console.warn(`⚠️  Could not cleanup directory ${directory}: ${error}`);
    }
  }
}