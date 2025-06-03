import { OrganizationSuggestion, FileInfo } from '../types';
import { BaseCache } from './base-cache';

export class SuggestionCache extends BaseCache<OrganizationSuggestion[]> {
  private static instance: SuggestionCache;

  constructor() {
    super({
      subDirectory: 'suggestions',
      ttlMs: 10 * 60 * 1000, // 10 minutes (matches documentation)
      useConfigHash: true
    });
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
    return this.getCached(directory, files, configHash);
  }

  async cacheSuggestions(
    directory: string,
    files: FileInfo[],
    suggestions: OrganizationSuggestion[],
    configHash: string
  ): Promise<void> {
    return this.cache(directory, files, suggestions, configHash);
  }
}