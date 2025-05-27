import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import { OrganizationSuggestion, FileInfo } from '../types';

interface CachedSuggestions {
  suggestions: OrganizationSuggestion[];
  directoryHash: string;
  timestamp: number;
  fileCount: number;
  configHash: string;
}

interface DirectoryState {
  files: Array<{
    name: string;
    size: number;
    modified: number;
  }>;
}

export class SuggestionCache {
  private static instance: SuggestionCache;
  private memoryCache = new Map<string, CachedSuggestions>();
  private readonly cacheDir: string;
  private readonly cacheTTL = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.cacheDir = path.join(os.homedir(), '.organ-ai-zer', 'cache');
  }

  static getInstance(): SuggestionCache {
    if (!SuggestionCache.instance) {
      SuggestionCache.instance = new SuggestionCache();
    }
    return SuggestionCache.instance;
  }

  async getCachedSuggestions(
    directory: string,
    files: FileInfo[],
    configHash: string
  ): Promise<OrganizationSuggestion[] | null> {
    const cacheKey = this.getCacheKey(directory);
    const directoryHash = this.calculateDirectoryHash(files);

    // Check memory cache first
    const memoryCache = this.memoryCache.get(cacheKey);
    if (memoryCache && this.isValidCache(memoryCache, directoryHash, configHash)) {
      console.log('💾 Using cached suggestions from memory');
      return memoryCache.suggestions;
    }

    // Check disk cache
    try {
      const diskCache = await this.loadFromDisk(cacheKey);
      if (diskCache && this.isValidCache(diskCache, directoryHash, configHash)) {
        console.log('💿 Using cached suggestions from disk');
        // Refresh memory cache
        this.memoryCache.set(cacheKey, diskCache);
        return diskCache.suggestions;
      }
    } catch (error) {
      console.log('📁 No valid disk cache found');
    }

    return null;
  }

  async cacheSuggestions(
    directory: string,
    files: FileInfo[],
    suggestions: OrganizationSuggestion[],
    configHash: string
  ): Promise<void> {
    const cacheKey = this.getCacheKey(directory);
    const directoryHash = this.calculateDirectoryHash(files);
    
    const cachedData: CachedSuggestions = {
      suggestions,
      directoryHash,
      timestamp: Date.now(),
      fileCount: files.length,
      configHash
    };

    // Store in memory
    this.memoryCache.set(cacheKey, cachedData);
    console.log(`💾 Cached ${suggestions.length} suggestions in memory`);

    // Store on disk
    try {
      await this.saveToDisk(cacheKey, cachedData);
      console.log(`💿 Cached suggestions to disk`);
    } catch (error) {
      console.warn('⚠️  Failed to save cache to disk:', error);
    }
  }

  async clearCache(directory?: string): Promise<void> {
    if (directory) {
      const cacheKey = this.getCacheKey(directory);
      this.memoryCache.delete(cacheKey);
      
      try {
        const diskPath = this.getDiskCachePath(cacheKey);
        await fs.remove(diskPath);
        console.log('🗑️  Cleared cache for directory');
      } catch (error) {
        // Ignore if file doesn't exist
      }
    } else {
      this.memoryCache.clear();
      try {
        await fs.remove(this.cacheDir);
        console.log('🗑️  Cleared all caches');
      } catch (error) {
        // Ignore if directory doesn't exist
      }
    }
  }

  private getCacheKey(directory: string): string {
    return crypto.createHash('md5').update(path.resolve(directory)).digest('hex');
  }

  private calculateDirectoryHash(files: FileInfo[]): string {
    const state: DirectoryState = {
      files: files.map(f => ({
        name: f.name,
        size: f.size,
        modified: f.modified.getTime()
      })).sort((a, b) => a.name.localeCompare(b.name))
    };

    return crypto.createHash('md5').update(JSON.stringify(state)).digest('hex');
  }

  private isValidCache(
    cache: CachedSuggestions,
    currentDirectoryHash: string,
    currentConfigHash: string
  ): boolean {
    const now = Date.now();
    const isNotExpired = (now - cache.timestamp) < this.cacheTTL;
    const directoryUnchanged = cache.directoryHash === currentDirectoryHash;
    const configUnchanged = cache.configHash === currentConfigHash;

    if (!isNotExpired) {
      console.log('⏰ Cache expired');
      return false;
    }

    if (!directoryUnchanged) {
      console.log('📁 Directory contents changed');
      return false;
    }

    if (!configUnchanged) {
      console.log('⚙️  Configuration changed');
      return false;
    }

    return true;
  }

  private getDiskCachePath(cacheKey: string): string {
    return path.join(this.cacheDir, `${cacheKey}.json`);
  }

  private async loadFromDisk(cacheKey: string): Promise<CachedSuggestions | null> {
    const cachePath = this.getDiskCachePath(cacheKey);
    
    if (!(await fs.pathExists(cachePath))) {
      return null;
    }

    const data = await fs.readJson(cachePath);
    return data as CachedSuggestions;
  }

  private async saveToDisk(cacheKey: string, data: CachedSuggestions): Promise<void> {
    await fs.ensureDir(this.cacheDir);
    const cachePath = this.getDiskCachePath(cacheKey);
    await fs.writeJson(cachePath, data);
  }

  getCacheStats(): { memoryEntries: number; diskCacheDir: string } {
    return {
      memoryEntries: this.memoryCache.size,
      diskCacheDir: this.cacheDir
    };
  }

  async cleanExpiredCache(): Promise<void> {
    const now = Date.now();
    
    // Clean memory cache
    for (const [key, cache] of this.memoryCache.entries()) {
      if ((now - cache.timestamp) >= this.cacheTTL) {
        this.memoryCache.delete(key);
      }
    }

    // Clean disk cache
    try {
      if (await fs.pathExists(this.cacheDir)) {
        const files = await fs.readdir(this.cacheDir);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(this.cacheDir, file);
            try {
              const data = await fs.readJson(filePath);
              if ((now - data.timestamp) >= this.cacheTTL) {
                await fs.remove(filePath);
              }
            } catch (error) {
              // Remove corrupted cache files
              await fs.remove(filePath);
            }
          }
        }
      }
    } catch (error) {
      console.warn('⚠️  Failed to clean disk cache:', error);
    }
  }
}