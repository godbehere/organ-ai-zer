import { SuggestionCache } from '../services/suggestion-cache';
import { ProjectDetectionCache } from '../services/project-detection-cache';

export async function cache(action: string, options: { directory?: string }): Promise<void> {
  try {
    const cacheService = SuggestionCache.getInstance();
    const projectCache = ProjectDetectionCache.getInstance();

    switch (action) {
      case 'clear':
        await cacheService.clearCache(options.directory);
        if (options.directory) {
          await projectCache.clearCache(options.directory);
          console.log(`🗑️  Cleared cache for directory: ${options.directory}`);
        } else {
          await projectCache.clearAllCache();
          console.log('🗑️  Cleared all caches');
        }
        break;

      case 'clean':
        await cacheService.cleanExpiredCache();
        // Project cache doesn't have expired cache cleaning yet, but could be added
        console.log('🧹 Cleaned expired cache entries');
        break;

      case 'stats':
        const suggestionStats = cacheService.getCacheStats();
        const projectStats = await projectCache.getCacheStats();
        console.log('📊 Cache Statistics:');
        console.log('');
        console.log('🗂️  Suggestion Cache:');
        console.log(`   Memory entries: ${suggestionStats.memoryEntries}`);
        console.log(`   Disk cache dir: ${suggestionStats.diskCacheDir}`);
        console.log('');
        console.log('🏗️  Project Detection Cache:');
        console.log(`   Memory entries: ${projectStats.memoryCacheSize}`);
        console.log(`   Disk cache files: ${projectStats.diskCacheFiles}`);
        console.log(`   Total cache size: ${(projectStats.totalCacheSize / 1024).toFixed(1)} KB`);
        break;

      default:
        console.error('❌ Unknown cache action. Available actions: clear, clean, stats');
        console.log('Usage:');
        console.log('  organ-ai-zer cache clear              # Clear all caches');
        console.log('  organ-ai-zer cache clear -d ~/Photos  # Clear cache for specific directory');
        console.log('  organ-ai-zer cache clean             # Remove expired entries');
        console.log('  organ-ai-zer cache stats             # Show cache statistics');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Cache operation failed:', error);
    process.exit(1);
  }
}