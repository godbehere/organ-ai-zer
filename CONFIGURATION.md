# Configuration Guide

This guide provides detailed information about configuring Organ-AI-zer for your specific needs.

## Configuration File Location

Default: `~/.organ-ai-zer/config.json`

You can specify a custom location using the `-c` or `--config` flag with any command.

## Complete Configuration Schema

```json
{
  "ai": {
    "provider": "openai | anthropic",
    "apiKey": "string",
    "model": "string (optional)",
    "maxTokens": "number (100-4000, optional)",
    "temperature": "number (0-2, optional)",
    "timeout": "number (1000-60000ms, optional)"
  },
  "organization": {
    "confidenceThreshold": "number (0-1)",
    "createBackups": "boolean",
    "preserveOriginalNames": "boolean", 
    "maxDepth": "number (1-10)",
    "excludePatterns": ["array of glob patterns"],
    "includePatterns": ["array of glob patterns"]
  },
  "fileTypes": {
    "images": { /* FileTypeConfig */ },
    "videos": { /* FileTypeConfig */ },
    "audio": { /* FileTypeConfig */ },
    "documents": { /* FileTypeConfig */ },
    "spreadsheets": { /* FileTypeConfig */ },
    "presentations": { /* FileTypeConfig */ },
    "code": { /* FileTypeConfig */ },
    "archives": { /* FileTypeConfig */ },
    "misc": { /* FileTypeConfig */ }
  },
  "customCategories": {
    "categoryName": {
      "extensions": ["array of file extensions"],
      "config": { /* FileTypeConfig */ }
    }
  }
}
```

## AI Configuration

### OpenAI Configuration

```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "sk-your-openai-key",
    "model": "gpt-4",
    "maxTokens": 1000,
    "temperature": 0.3,
    "timeout": 30000
  }
}
```

**Available Models:**
- `gpt-4` (recommended, more accurate)
- `gpt-4-turbo`
- `gpt-3.5-turbo` (faster, cheaper)

### Anthropic Configuration

```json
{
  "ai": {
    "provider": "anthropic",
    "apiKey": "sk-ant-your-anthropic-key", 
    "model": "claude-3-sonnet-20240229",
    "maxTokens": 1000,
    "temperature": 0.3,
    "timeout": 30000
  }
}
```

**Available Models:**
- `claude-3-sonnet-20240229` (recommended balance)
- `claude-3-haiku-20240307` (faster)
- `claude-3-opus-20240229` (most capable)

### AI Parameters

- **maxTokens**: Maximum response length (100-4000)
  - Higher = more detailed analysis
  - Lower = faster, cheaper
  
- **temperature**: Creativity/randomness (0-2)
  - 0 = deterministic, consistent
  - 0.3 = slight variation (recommended)
  - 1+ = more creative/unpredictable

- **timeout**: Request timeout in milliseconds
  - 30000ms (30 seconds) recommended
  - Increase for large file batches

## Organization Configuration

### Confidence Threshold

```json
{
  "organization": {
    "confidenceThreshold": 0.7
  }
}
```

Only apply AI suggestions with confidence >= threshold:
- `0.5` = Accept most suggestions
- `0.7` = Balanced (recommended)
- `0.9` = Only high-confidence suggestions

### Backup Settings

```json
{
  "organization": {
    "createBackups": true
  }
}
```

When `true`, creates timestamped backup before organizing:
- Format: `backup_dirname_YYYY-MM-DDTHH-mm-ss`
- Location: Same parent directory

### Name Preservation

```json
{
  "organization": {
    "preserveOriginalNames": false
  }
}
```

- `true` = Keep original filenames, only move to new folders
- `false` = Apply naming patterns (rename files)

### Depth Limits

```json
{
  "organization": {
    "maxDepth": 5
  }
}
```

Maximum subdirectory depth to scan (1-10):
- Prevents infinite recursion
- Higher = more thorough but slower

### File Filtering

```json
{
  "organization": {
    "excludePatterns": [".DS_Store", "Thumbs.db", "*.tmp", "*.cache"],
    "includePatterns": ["*"]
  }
}
```

**Exclude Patterns** (skip these files):
- `.DS_Store` = macOS metadata
- `Thumbs.db` = Windows thumbnails  
- `*.tmp` = Temporary files
- `node_modules` = Dependencies

**Include Patterns** (only process these):
- `*` = All files (default)
- `*.jpg` = Only JPEG images
- `document*` = Files starting with "document"

## File Type Configuration

Each file type has this structure:

```json
{
  "enabled": true,
  "namingPatterns": {
    "patternName": {
      "pattern": "path/template/with/VARIABLES",
      "description": "Human readable description",
      "example": "concrete/example/file.ext"
    }
  },
  "organizationRules": {
    "byDate": true,
    "byType": false,
    "byProject": false,
    "customPath": "optional/fixed/path"
  }
}
```

### Naming Pattern Variables

Available variables in patterns:
- `YYYY` = Full year (2024)
- `MM` = Month with zero-padding (03)
- `DD` = Day with zero-padding (15)
- `CATEGORY` = AI-determined category
- `PROJECT_NAME` = Detected project name
- `ARTIST` = Music artist (audio files)
- `ALBUM` = Music album (audio files)
- `EVENT_NAME` = Detected event name

### Organization Rules

- **byDate**: Organize chronologically by modification date
- **byType**: Group by file type/category
- **byProject**: Group by detected project name
- **customPath**: Use fixed path instead of AI suggestion

### Example File Type Configurations

#### Images (Date-based)
```json
{
  "images": {
    "enabled": true,
    "namingPatterns": {
      "date": {
        "pattern": "photos/YYYY/MM/YYYY-MM-DD_filename",
        "description": "Organize photos by year and month",
        "example": "photos/2024/03/2024-03-15_vacation.jpg"
      },
      "event": {
        "pattern": "photos/events/EVENT_NAME/YYYY-MM-DD_filename", 
        "description": "Organize by detected events",
        "example": "photos/events/birthday_party/2024-03-15_cake.jpg"
      }
    },
    "organizationRules": {
      "byDate": true,
      "byType": false
    }
  }
}
```

#### Documents (Category-based)
```json
{
  "documents": {
    "enabled": true,
    "namingPatterns": {
      "category": {
        "pattern": "documents/CATEGORY/YYYY/filename",
        "description": "Organize documents by AI-detected category",
        "example": "documents/financial/2024/tax_return.pdf"
      },
      "flat": {
        "pattern": "documents/CATEGORY/filename",
        "description": "Simple category organization",
        "example": "documents/legal/contract.pdf"
      }
    },
    "organizationRules": {
      "byType": true,
      "byDate": false
    }
  }
}
```

#### Code (Project-based)
```json
{
  "code": {
    "enabled": true,
    "namingPatterns": {
      "project": {
        "pattern": "projects/PROJECT_NAME/filename",
        "description": "Group code files by detected project",
        "example": "projects/my_webapp/index.js"
      },
      "language": {
        "pattern": "code/LANGUAGE/filename",
        "description": "Organize by programming language",
        "example": "code/javascript/utils.js"
      }
    },
    "organizationRules": {
      "byProject": true
    }
  }
}
```

## Custom Categories

Define your own file categories:

```json
{
  "customCategories": {
    "3d_models": {
      "extensions": [".obj", ".fbx", ".blend", ".3ds"],
      "config": {
        "enabled": true,
        "namingPatterns": {
          "project": {
            "pattern": "3d_models/PROJECT_NAME/filename",
            "description": "Organize 3D models by project",
            "example": "3d_models/game_assets/character.obj"
          }
        },
        "organizationRules": {
          "byProject": true
        }
      }
    },
    "ebooks": {
      "extensions": [".epub", ".mobi", ".azw", ".azw3"],
      "config": {
        "enabled": true,
        "namingPatterns": {
          "author": {
            "pattern": "ebooks/AUTHOR/filename",
            "description": "Organize ebooks by author",
            "example": "ebooks/Stephen_King/The_Shining.epub"
          }
        },
        "organizationRules": {
          "byType": true
        }
      }
    }
  }
}
```

## Configuration Validation

The application validates your configuration on startup. Common validation errors:

### Invalid JSON
```
Error: Invalid configuration: Unexpected token in JSON
```
**Fix**: Check JSON syntax, missing commas, quotes, brackets

### Missing Required Fields
```
Error: Invalid configuration: "ai.apiKey" is required
```
**Fix**: Add missing required configuration fields

### Invalid Value Ranges
```
Error: Invalid configuration: "organization.confidenceThreshold" must be between 0 and 1
```
**Fix**: Ensure values are within specified ranges

### Invalid Provider
```
Error: Unsupported AI provider: invalid-provider
```
**Fix**: Use "openai" or "anthropic" only

## Performance Tuning

### For Large Directories
```json
{
  "ai": {
    "maxTokens": 500,
    "timeout": 60000
  },
  "organization": {
    "maxDepth": 3
  }
}
```

### For Better Accuracy
```json
{
  "ai": {
    "model": "gpt-4",
    "maxTokens": 2000,
    "temperature": 0.1
  },
  "organization": {
    "confidenceThreshold": 0.8
  }
}
```

### For Speed/Cost Optimization
```json
{
  "ai": {
    "model": "gpt-3.5-turbo",
    "maxTokens": 500,
    "temperature": 0.5
  },
  "organization": {
    "confidenceThreshold": 0.6
  }
}
```

## Environment Variables

Override config file settings with environment variables:

```bash
export ORGAN_AI_ZER_API_KEY="your-api-key"
export ORGAN_AI_ZER_PROVIDER="openai"
export ORGAN_AI_ZER_MODEL="gpt-4"

organ-ai-zer preview ~/Downloads
```

## Multiple Configurations

You can maintain different configurations for different scenarios:

```bash
# Work files with strict organization
organ-ai-zer organize ~/Work -c work-config.json

# Personal files with relaxed rules  
organ-ai-zer organize ~/Personal -c personal-config.json

# Photo organization with date focus
organ-ai-zer organize ~/Photos -c photo-config.json
```

This allows customized behavior per use case while maintaining the same tool.