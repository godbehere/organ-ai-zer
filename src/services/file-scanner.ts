import * as fs from 'fs-extra';
import * as path from 'path';
import * as mime from 'mime-types';
import { FileInfo } from '../types';

export class FileScanner {
  async scanDirectory(directory: string, recursive: boolean = false): Promise<FileInfo[]> {
    const files: FileInfo[] = [];
    
    try {
      const items = await fs.readdir(directory);
      
      for (const item of items) {
        const fullPath = path.join(directory, item);
        const stats = await fs.stat(fullPath);
        
        if (stats.isFile()) {
          const fileInfo: FileInfo = {
            path: fullPath,
            name: item,
            extension: path.extname(item).toLowerCase(),
            size: stats.size,
            modified: stats.mtime,
            type: 'file'
          };
          files.push(fileInfo);
        } else if (stats.isDirectory() && recursive) {
          const subdirectoryFiles = await this.scanDirectory(fullPath, recursive);
          files.push(...subdirectoryFiles);
        }
      }
    } catch (error) {
      throw new Error(`Failed to scan directory ${directory}: ${error}`);
    }
    
    return files;
  }

  getFileCategory(file: FileInfo): string {
    const ext = file.extension;
    const mimeType = mime.lookup(file.name) || '';
    
    // Image files
    if (mimeType.startsWith('image/')) {
      return 'images';
    }
    
    // Video files
    if (mimeType.startsWith('video/')) {
      return 'videos';
    }
    
    // Audio files
    if (mimeType.startsWith('audio/')) {
      return 'audio';
    }
    
    // Document files
    if (['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'].includes(ext)) {
      return 'documents';
    }
    
    // Spreadsheet files
    if (['.xls', '.xlsx', '.csv', '.ods'].includes(ext)) {
      return 'spreadsheets';
    }
    
    // Presentation files
    if (['.ppt', '.pptx', '.odp'].includes(ext)) {
      return 'presentations';
    }
    
    // Archive files
    if (['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'].includes(ext)) {
      return 'archives';
    }
    
    // Code files
    if (['.js', '.ts', '.py', '.java', '.cpp', '.c', '.html', '.css', '.php', '.rb'].includes(ext)) {
      return 'code';
    }
    
    return 'misc';
  }
}