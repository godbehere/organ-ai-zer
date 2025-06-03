import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import { FileInfo } from '../types';

export interface CachedData<T> {
  data: T;
  directoryHash: string;
  timestamp: number;
  fileCount: number;
  configHash?: string;
}

interface DirectoryState {
  files: Array<{
    name: string;
    size: number;
    modified: number;
  }>;
}

export interface CacheConfig {
  subDirectory: string;
  ttlMs: number;
  filePrefix?: string;
  useConfigHash?: boolean;
}

export interface CacheStats {
  memoryEntries: number;
  diskCacheDir: string;
  ttlMs: number;
  subDirectory: string;
}

/**
 * Base cache class providing common caching functionality
 * All specific cache implementations should extend this class
 */
export abstract class BaseCache<T> {
  protected memoryCache = new Map<string, CachedData<T>>();
  protected readonly cacheDir: string;
  protected readonly config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.cacheDir = path.join(os.homedir(), '.organ-ai-zer', 'cache', config.subDirectory);
  }

  /**
   * Get cached data for a directory
   */
  async getCached(
    directory: string,
    files: FileInfo[],
    configHash?: string
  ): Promise<T | null> {
    const cacheKey = this.getCacheKey(directory);
    const directoryHash = this.calculateDirectoryHash(files);

    // Check memory cache first
    const memoryCache = this.memoryCache.get(cacheKey);
    if (memoryCache && this.isValidCache(memoryCache, directoryHash, configHash)) {
      console.log(`💾 Using cached ${this.config.subDirectory} from memory`);
      return memoryCache.data;
    }

    // Check disk cache
    try {
      const diskCache = await this.loadFromDisk(cacheKey);
      if (diskCache && this.isValidCache(diskCache, directoryHash, configHash)) {
        console.log(`💿 Using cached ${this.config.subDirectory} from disk`);
        // Refresh memory cache
        this.memoryCache.set(cacheKey, diskCache);
        return diskCache.data;
      }
    } catch (error) {
      console.log(`📁 No valid ${this.config.subDirectory} cache found`);
    }

    return null;
  }

  /**
   * Cache data for a directory
   */
  async cache(
    directory: string,
    files: FileInfo[],
    data: T,
    configHash?: string
  ): Promise<void> {
    const cacheKey = this.getCacheKey(directory);
    const directoryHash = this.calculateDirectoryHash(files);
    
    const cachedData: CachedData<T> = {
      data,
      directoryHash,
      timestamp: Date.now(),
      fileCount: files.length,
      ...(configHash && { configHash })
    };

    // Store in memory
    this.memoryCache.set(cacheKey, cachedData);
    console.log(`💾 Cached ${this.config.subDirectory} for ${files.length} files in memory`);

    // Store on disk
    try {
      await this.saveToDisk(cacheKey, cachedData);
      console.log(`💿 Cached ${this.config.subDirectory} to disk`);
    } catch (error) {
      console.warn(`⚠️  Failed to save ${this.config.subDirectory} cache to disk:`, error);
    }
  }

  /**
   * Clear cache for specific directory or all
   */
  async clearCache(directory?: string): Promise<void> {
    if (directory) {
      const cacheKey = this.getCacheKey(directory);
      this.memoryCache.delete(cacheKey);
      
      try {
        const diskPath = this.getDiskCachePath(cacheKey);
        await fs.remove(diskPath);
        console.log(`🗑️  Cleared ${this.config.subDirectory} cache for directory`);
      } catch (error) {
        // Ignore if file doesn't exist
      }
    } else {
      this.memoryCache.clear();
      try {
        await fs.remove(this.cacheDir);
        console.log(`🗑️  Cleared all ${this.config.subDirectory} caches`);
      } catch (error) {
        // Ignore if directory doesn't exist
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return {
      memoryEntries: this.memoryCache.size,
      diskCacheDir: this.cacheDir,
      ttlMs: this.config.ttlMs,
      subDirectory: this.config.subDirectory
    };
  }

  /**
   * Clean expired cache entries
   */
  async cleanExpiredCache(): Promise<void> {
    const now = Date.now();
    
    // Clean memory cache
    for (const [key, cache] of this.memoryCache.entries()) {
      if ((now - cache.timestamp) >= this.config.ttlMs) {
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
              if ((now - data.timestamp) >= this.config.ttlMs) {
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
      console.warn(`⚠️  Failed to clean ${this.config.subDirectory} disk cache:`, error);
    }
  }

  /**
   * Get all cached directories
   */
  async getCachedDirectories(): Promise<string[]> {
    const directories: string[] = [];
    
    try {
      if (await fs.pathExists(this.cacheDir)) {
        const files = await fs.readdir(this.cacheDir);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const cacheKey = file.replace('.json', '');
            if (this.config.filePrefix) {
              if (file.startsWith(this.config.filePrefix)) {
                directories.push(cacheKey.replace(this.config.filePrefix, ''));
              }
            } else {
              directories.push(cacheKey);
            }
          }
        }
      }
    } catch (error) {
      // Ignore errors, return empty array
    }
    
    return directories;
  }

  /**
   * Generate cache key for directory
   */
  protected getCacheKey(directory: string): string {
    return crypto.createHash('md5').update(path.resolve(directory)).digest('hex');
  }

  /**
   * Calculate hash of directory contents for change detection
   */
  protected calculateDirectoryHash(files: FileInfo[]): string {
    const state: DirectoryState = {
      files: files.map(f => ({
        name: f.name,
        size: f.size,
        modified: f.modified.getTime()
      })).sort((a, b) => a.name.localeCompare(b.name))
    };

    return crypto.createHash('md5').update(JSON.stringify(state)).digest('hex');
  }

  /**
   * Check if cached data is still valid
   */
  protected isValidCache(
    cache: CachedData<T>,
    currentDirectoryHash: string,
    currentConfigHash?: string
  ): boolean {
    const now = Date.now();
    const isNotExpired = (now - cache.timestamp) < this.config.ttlMs;
    const directoryUnchanged = cache.directoryHash === currentDirectoryHash;
    const configUnchanged = this.config.useConfigHash ? 
      (cache.configHash === currentConfigHash) : true;

    if (!isNotExpired) {
      console.log(`⏰ ${this.config.subDirectory} cache expired`);
      return false;
    }

    if (!directoryUnchanged) {
      console.log(`📁 Directory contents changed, ${this.config.subDirectory} cache invalid`);
      return false;
    }

    if (!configUnchanged) {
      console.log(`⚙️  Configuration changed, ${this.config.subDirectory} cache invalid`);
      return false;
    }

    return true;
  }

  /**
   * Get disk cache file path
   */
  protected getDiskCachePath(cacheKey: string): string {
    const filename = this.config.filePrefix ? 
      `${this.config.filePrefix}${cacheKey}.json` : 
      `${cacheKey}.json`;
    return path.join(this.cacheDir, filename);
  }

  /**
   * Load cached data from disk
   */
  protected async loadFromDisk(cacheKey: string): Promise<CachedData<T> | null> {
    const cachePath = this.getDiskCachePath(cacheKey);
    
    if (!(await fs.pathExists(cachePath))) {
      return null;
    }

    const data = await fs.readJson(cachePath);
    return data as CachedData<T>;
  }

  /**
   * Save cached data to disk
   */
  protected async saveToDisk(cacheKey: string, data: CachedData<T>): Promise<void> {
    await fs.ensureDir(this.cacheDir);
    const cachePath = this.getDiskCachePath(cacheKey);
    await fs.writeJson(cachePath, data, { spaces: 2 });
  }
}