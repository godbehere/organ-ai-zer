# Caching System

Organ-AI-zer includes an intelligent multi-layer caching system that stores AI suggestions, pattern analysis, and project detection results to avoid redundant API calls and improve performance.

## How It Works

### 🧠 Smart Cache Validation
The cache automatically invalidates when:
- **Files change**: Any file is added, removed, or modified
- **Configuration changes**: AI model, organization rules, or file type settings change
- **Time expires**: Cache entries older than 10 minutes are discarded

### 💾 Multi-Layer Caching
- **Suggestion Cache**: AI organization suggestions and reasoning
- **Pattern Cache**: File pattern analysis (series, projects, dates)
- **Project Detection Cache**: Detected coding projects and their structures
- **Dual Storage**: Memory (fast) + Disk (persistent) for each cache type

### 🔍 Cache Key Generation
Each directory gets a unique cache key based on:
- Absolute directory path
- File metadata (names, sizes, modification times)
- Configuration hash (AI settings, organization rules)

## Usage Examples

### Basic Workflow (Automatic Caching)
```bash
# First run - calls AI API
organ-ai-zer preview ~/Downloads
# 🤖 Calling anthropic API with model claude-3-7-sonnet...
# ✅ AI analysis completed with 10 suggestions
# 💾 Cached 10 suggestions in memory
# 💿 Cached suggestions to disk

# Second run - uses cache
organ-ai-zer organize ~/Downloads
# 💾 Using cached suggestions from memory
# ✅ Organization complete!
```

### Cache Management Commands

#### View Cache Statistics
```bash
organ-ai-zer cache stats
```
```
📊 Cache Statistics:

🗂️ Suggestion Cache:
   Memory entries: 2
   TTL: 10 minutes
   Cache directory: /home/user/.organ-ai-zer/cache/suggestions

🏗️ Project Detection Cache:
   Memory entries: 1
   TTL: 10 minutes
   Cache directory: /home/user/.organ-ai-zer/cache/projects

🔍 Pattern Cache:
   Memory entries: 1
   TTL: 10 minutes
   Cache directory: /home/user/.organ-ai-zer/cache/patterns
```

#### Clear All Caches
```bash
organ-ai-zer cache clear
```
```
🗑️  Cleared all suggestions caches
🗑️  Cleared all projects caches
🗑️  Cleared all patterns caches
🗑️  Cleared all caches
```

#### Clear Specific Directory Cache
```bash
organ-ai-zer cache clear -d ~/Downloads
```
```
🗑️  Cleared cache for directory: /home/user/Downloads
```

#### Clean Expired Entries
```bash
organ-ai-zer cache clean
```
```
🧹 Cleaned expired cache entries from all caches
```

## Cache Behavior

### When Cache is Used
✅ **Cache HIT** scenarios:
- Same directory scanned within 10 minutes
- No file changes (additions, deletions, modifications)
- Same configuration (AI model, organization rules)
- `preview` followed immediately by `organize`

### When Cache is Bypassed
❌ **Cache MISS** scenarios:
- First time scanning a directory
- Files added, removed, or modified
- Configuration changed (different AI model, organization settings)
- Cache expired (>10 minutes old)
- Manual cache clearing

### Cache Invalidation Examples

#### File Changes
```bash
organ-ai-zer preview ~/Photos  # Creates cache
# ... add a new photo to ~/Photos
organ-ai-zer organize ~/Photos # Cache miss - files changed
# 📁 Directory contents changed
# 🤖 Calling AI API...
```

#### Configuration Changes
```bash
organ-ai-zer preview ~/Documents  # Creates cache
# ... change AI model in config
organ-ai-zer organize ~/Documents # Cache miss - config changed  
# ⚙️  Configuration changed
# 🤖 Calling AI API...
```

#### Time Expiration
```bash
organ-ai-zer preview ~/Downloads  # Creates cache
# ... wait 15 minutes
organ-ai-zer organize ~/Downloads # Cache miss - expired
# ⏰ Cache expired
# 🤖 Calling AI API...
```

## Performance Benefits

### API Cost Reduction
- **Before**: Every `preview` + `organize` = 2 API calls
- **After**: First `preview` + cached `organize` = 1 API call
- **Savings**: 50% reduction in API costs for typical workflows

### Speed Improvements
- **Memory cache**: ~5ms response time
- **Disk cache**: ~50ms response time  
- **AI API call**: ~3-10 seconds response time
- **Speedup**: 100-2000x faster for cached requests

### Bandwidth Savings
- No repeated file analysis
- Reduced network traffic
- Better offline workflow support

## Advanced Usage

### Disable Caching
For testing or debugging, you can bypass cache:
```bash
# Force fresh AI analysis for all cache types
organ-ai-zer preview ~/Downloads --no-cache
organ-ai-zer organize ~/Downloads --no-cache
organ-ai-zer interactive ~/Downloads --no-cache
```

### Cache Directory Structure
```
~/.organ-ai-zer/cache/
├── suggestions/
│   ├── a1b2c3d4e5f6.json    # AI suggestions for /home/user/Downloads
│   └── f6e5d4c3b2a1.json    # AI suggestions for /home/user/Documents
├── projects/
│   ├── projects_a1b2c3d4.json    # Project detection for Downloads
│   └── projects_f6e5d4c3.json    # Project detection for Documents
└── patterns/
    ├── patterns_a1b2c3d4.json    # Pattern analysis for Downloads
    └── patterns_f6e5d4c3.json    # Pattern analysis for Documents
```

### Cache File Format
```json
{
  "suggestions": [
    {
      "file": { "path": "...", "name": "..." },
      "suggestedPath": "organized/path/file.jpg",
      "reason": "AI reasoning...",
      "confidence": 0.85
    }
  ],
  "directoryHash": "abc123...",
  "timestamp": 1640995200000,
  "fileCount": 10,
  "configHash": "def456..."
}
```

## Troubleshooting

### Cache Not Working
1. **Check permissions**: Ensure write access to `~/.organ-ai-zer/cache/`
2. **Verify file stability**: Files must not change between runs
3. **Configuration consistency**: Don't modify config between `preview` and `organize`

### Cache Taking Too Much Space
```bash
# Check cache size
du -sh ~/.organ-ai-zer/cache/

# Clean old entries
organ-ai-zer cache clean

# Clear all if needed
organ-ai-zer cache clear
```

### Force Cache Refresh
```bash
# Clear cache for specific directory
organ-ai-zer cache clear -d ~/Downloads

# Then run fresh analysis
organ-ai-zer preview ~/Downloads
```

## Best Practices

### Optimal Workflow
1. **Preview first**: `organ-ai-zer preview ~/Downloads`
2. **Review suggestions**: Check the output carefully
3. **Organize immediately**: `organ-ai-zer organize ~/Downloads` (uses cache)

### Avoid Cache Misses
- Don't modify files between `preview` and `organize`
- Don't change configuration mid-workflow
- Run `organize` within 10 minutes of `preview`

### Periodic Maintenance
```bash
# Weekly cleanup (optional)
organ-ai-zer cache clean

# Monthly reset (if needed)
organ-ai-zer cache clear
```

The caching system is designed to be transparent and automatic - you don't need to think about it for normal usage, but these commands are available when you need manual control.