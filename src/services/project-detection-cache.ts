import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import { DetectedProject, FileInfo } from '../types';

interface CachedProjects {
  projects: DetectedProject[];
  directoryHash: string;
  timestamp: number;
  fileCount: number;
  scanDepth: number;
}

interface DirectoryState {
  files: Array<{
    name: string;
    path: string;
    size: number;
    modified: number;
  }>;
  scanDepth: number;
}

/**
 * Project Detection Cache Service
 * Caches expensive project detection operations to improve performance
 */
export class ProjectDetectionCache {
  private static instance: ProjectDetectionCache;
  private memoryCache = new Map<string, CachedProjects>();
  private readonly cacheDir: string;
  private readonly cacheTTL = 30 * 60 * 1000; // 30 minutes (longer than suggestions since project structure changes less)

  constructor() {
    this.cacheDir = path.join(os.homedir(), '.organ-ai-zer', 'cache', 'projects');
  }

  static getInstance(): ProjectDetectionCache {
    if (!ProjectDetectionCache.instance) {
      ProjectDetectionCache.instance = new ProjectDetectionCache();
    }
    return ProjectDetectionCache.instance;
  }

  /**
   * Get cached project detection results
   */
  async getCachedProjects(
    directory: string,
    files: FileInfo[]
  ): Promise<DetectedProject[] | null> {
    const cacheKey = this.getCacheKey(directory);
    const directoryHash = this.calculateDirectoryHash(files, directory);

    // Check memory cache first
    const memoryCache = this.memoryCache.get(cacheKey);
    if (memoryCache && this.isValidCache(memoryCache, directoryHash, files.length)) {
      console.log('🚀 Using cached project detection results');
      return memoryCache.projects;
    }

    // Check disk cache
    try {
      await fs.ensureDir(this.cacheDir);
      const diskCachePath = this.getDiskCachePath(cacheKey);
      
      if (await fs.pathExists(diskCachePath)) {
        const cachedData: CachedProjects = await fs.readJson(diskCachePath);
        
        if (this.isValidCache(cachedData, directoryHash, files.length)) {
          // Update memory cache
          this.memoryCache.set(cacheKey, cachedData);
          console.log('💾 Using disk-cached project detection results');
          return cachedData.projects;
        }
      }
    } catch (error) {
      console.warn('Failed to read project detection cache:', error);
    }

    return null;
  }

  /**
   * Cache project detection results
   */
  async cacheProjects(
    directory: string,
    files: FileInfo[],
    projects: DetectedProject[]
  ): Promise<void> {
    const cacheKey = this.getCacheKey(directory);
    const directoryHash = this.calculateDirectoryHash(files, directory);
    
    const cached: CachedProjects = {
      projects,
      directoryHash,
      timestamp: Date.now(),
      fileCount: files.length,
      scanDepth: this.calculateScanDepth(files, directory)
    };

    // Update memory cache
    this.memoryCache.set(cacheKey, cached);

    // Update disk cache
    try {
      await fs.ensureDir(this.cacheDir);
      const diskCachePath = this.getDiskCachePath(cacheKey);
      await fs.writeJson(diskCachePath, cached, { spaces: 2 });
      console.log('💾 Project detection results cached');
    } catch (error) {
      console.warn('Failed to write project detection cache:', error);
    }
  }

  /**
   * Clear cache for a specific directory
   */
  async clearCache(directory: string): Promise<void> {
    const cacheKey = this.getCacheKey(directory);
    
    // Clear memory cache
    this.memoryCache.delete(cacheKey);
    
    // Clear disk cache
    try {
      const diskCachePath = this.getDiskCachePath(cacheKey);
      if (await fs.pathExists(diskCachePath)) {
        await fs.remove(diskCachePath);
      }
    } catch (error) {
      console.warn('Failed to clear project detection cache:', error);
    }
  }

  /**
   * Clear all cached project detection results
   */
  async clearAllCache(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();
    
    // Clear disk cache
    try {
      if (await fs.pathExists(this.cacheDir)) {
        await fs.remove(this.cacheDir);
      }
    } catch (error) {
      console.warn('Failed to clear all project detection cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    memoryCacheSize: number;
    diskCacheFiles: number;
    totalCacheSize: number;
  }> {
    const memoryCacheSize = this.memoryCache.size;
    let diskCacheFiles = 0;
    let totalCacheSize = 0;

    try {
      if (await fs.pathExists(this.cacheDir)) {
        const files = await fs.readdir(this.cacheDir);
        diskCacheFiles = files.filter(f => f.endsWith('.json')).length;
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(this.cacheDir, file);
            const stats = await fs.stat(filePath);
            totalCacheSize += stats.size;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to get project detection cache stats:', error);
    }

    return {
      memoryCacheSize,
      diskCacheFiles,
      totalCacheSize
    };
  }

  /**
   * Generate cache key for directory
   */
  private getCacheKey(directory: string): string {
    const normalized = path.resolve(directory);
    return crypto.createHash('md5').update(normalized).digest('hex').substring(0, 16);
  }

  /**
   * Calculate hash for directory state
   */
  private calculateDirectoryHash(files: FileInfo[], directory: string): string {
    const state: DirectoryState = {
      files: files.map(f => ({
        name: f.name,
        path: path.relative(directory, f.path),
        size: f.size,
        modified: f.modified.getTime()
      })).sort((a, b) => a.path.localeCompare(b.path)),
      scanDepth: this.calculateScanDepth(files, directory)
    };

    return crypto.createHash('md5').update(JSON.stringify(state)).digest('hex');
  }

  /**
   * Calculate scan depth for better cache invalidation
   */
  private calculateScanDepth(files: FileInfo[], baseDirectory: string): number {
    let maxDepth = 0;
    
    files.forEach(file => {
      const relativePath = path.relative(baseDirectory, file.path);
      const depth = relativePath.split(path.sep).length;
      maxDepth = Math.max(maxDepth, depth);
    });

    return maxDepth;
  }

  /**
   * Check if cached data is still valid
   */
  private isValidCache(
    cache: CachedProjects,
    currentDirectoryHash: string,
    currentFileCount: number
  ): boolean {
    const now = Date.now();
    const isNotExpired = (now - cache.timestamp) < this.cacheTTL;
    const directoryUnchanged = cache.directoryHash === currentDirectoryHash;
    const fileCountUnchanged = cache.fileCount === currentFileCount;

    if (!isNotExpired) {
      console.log('⏰ Project detection cache expired');
      return false;
    }

    if (!directoryUnchanged) {
      console.log('📁 Directory structure changed, invalidating project cache');
      return false;
    }

    if (!fileCountUnchanged) {
      console.log('📊 File count changed, invalidating project cache');
      return false;
    }

    return true;
  }

  /**
   * Get disk cache file path
   */
  private getDiskCachePath(cacheKey: string): string {
    return path.join(this.cacheDir, `projects_${cacheKey}.json`);
  }
}