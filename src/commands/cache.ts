import { SuggestionCache } from '../services/suggestion-cache';

export async function cache(action: string, options: { directory?: string }): Promise<void> {
  try {
    const cacheService = SuggestionCache.getInstance();

    switch (action) {
      case 'clear':
        await cacheService.clearCache(options.directory);
        if (options.directory) {
          console.log(`🗑️  Cleared cache for directory: ${options.directory}`);
        } else {
          console.log('🗑️  Cleared all caches');
        }
        break;

      case 'clean':
        await cacheService.cleanExpiredCache();
        console.log('🧹 Cleaned expired cache entries');
        break;

      case 'stats':
        const stats = cacheService.getCacheStats();
        console.log('📊 Cache Statistics:');
        console.log(`   Memory entries: ${stats.memoryEntries}`);
        console.log(`   Disk cache dir: ${stats.diskCacheDir}`);
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