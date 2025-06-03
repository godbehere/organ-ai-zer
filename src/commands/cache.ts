import { SuggestionCache } from '../services/suggestion-cache';
import { ProjectDetectionCache } from '../services/project-detection-cache';
import { PatternCache } from '../services/pattern-cache';

export async function cache(action: string, options: { directory?: string }): Promise<void> {
  try {
    // Get all cache instances using the unified BaseCache architecture
    const caches = [
      { name: 'Suggestion Cache', icon: '🗂️', instance: SuggestionCache.getInstance() },
      { name: 'Project Detection Cache', icon: '🏗️', instance: ProjectDetectionCache.getInstance() },
      { name: 'Pattern Cache', icon: '🔍', instance: PatternCache.getInstance() }
    ];

    switch (action) {
      case 'clear':
        if (options.directory) {
          // Clear cache for specific directory across all cache types
          for (const cache of caches) {
            await cache.instance.clearCache(options.directory);
          }
          console.log(`🗑️  Cleared cache for directory: ${options.directory}`);
        } else {
          // Clear all caches
          for (const cache of caches) {
            await cache.instance.clearCache();
          }
          console.log('🗑️  Cleared all caches');
        }
        break;

      case 'clean':
        // Clean expired entries from all caches
        for (const cache of caches) {
          await cache.instance.cleanExpiredCache();
        }
        console.log('🧹 Cleaned expired cache entries from all caches');
        break;

      case 'stats':
        console.log('📊 Cache Statistics:');
        console.log('');
        
        for (const cache of caches) {
          const stats = cache.instance.getCacheStats();
          console.log(`${cache.icon} ${cache.name}:`);
          console.log(`   Memory entries: ${stats.memoryEntries}`);
          console.log(`   TTL: ${Math.round(stats.ttlMs / 1000 / 60)} minutes`);
          console.log(`   Cache directory: ${stats.diskCacheDir}`);
          console.log('');
        }
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