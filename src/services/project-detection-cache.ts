import { DetectedProject, FileInfo } from '../types';
import { BaseCache } from './base-cache';

interface CachedProjectData {
  projects: DetectedProject[];
  scanDepth: number;
}

/**
 * Project Detection Cache Service
 * Caches expensive project detection operations to improve performance
 */
export class ProjectDetectionCache extends BaseCache<CachedProjectData> {
  private static instance: ProjectDetectionCache;

  constructor() {
    super({
      subDirectory: 'projects',
      ttlMs: 10 * 60 * 1000, // 10 minutes (aligned with documentation TTL)
      filePrefix: 'projects_'
    });
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
    const cachedData = await this.getCached(directory, files);
    return cachedData ? cachedData.projects : null;
  }

  /**
   * Cache project detection results
   */
  async cacheProjects(
    directory: string,
    files: FileInfo[],
    projects: DetectedProject[]
  ): Promise<void> {
    const scanDepth = this.calculateScanDepth(files, directory);
    const projectData: CachedProjectData = {
      projects,
      scanDepth
    };
    
    return this.cache(directory, files, projectData);
  }

  /**
   * Calculate scan depth for a set of files relative to base directory
   */
  private calculateScanDepth(files: FileInfo[], baseDirectory: string): number {
    if (files.length === 0) return 0;
    
    const maxDepth = Math.max(
      ...files.map(file => {
        const relativePath = file.path.replace(baseDirectory, '').replace(/^[\/\\]/, '');
        return relativePath.split(/[\/\\]/).length;
      })
    );
    
    return maxDepth;
  }
}