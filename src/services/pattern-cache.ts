import { FileInfo } from '../types';
import { BaseCache } from './base-cache';
import { PatternAnalysis } from './pattern-matching-service';

/**
 * Pattern Cache Service
 * Caches pattern analysis results to improve performance for repeated analysis
 */
export class PatternCache extends BaseCache<PatternAnalysis> {
  private static instance: PatternCache;

  constructor() {
    super({
      subDirectory: 'patterns',
      ttlMs: 10 * 60 * 1000, // 10 minutes (aligned with documentation TTL)
      filePrefix: 'patterns_'
    });
  }

  static getInstance(): PatternCache {
    if (!PatternCache.instance) {
      PatternCache.instance = new PatternCache();
    }
    return PatternCache.instance;
  }

  /**
   * Get cached pattern analysis results
   */
  async getCachedAnalysis(
    directory: string,
    files: FileInfo[]
  ): Promise<PatternAnalysis | null> {
    return this.getCached(directory, files);
  }

  /**
   * Cache pattern analysis results
   */
  async cacheAnalysis(
    directory: string,
    files: FileInfo[],
    analysis: PatternAnalysis
  ): Promise<void> {
    return this.cache(directory, files, analysis);
  }
}