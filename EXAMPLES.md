# Usage Examples

This document provides practical examples of using Organ-AI-zer in various scenarios.

## Basic Workflow Examples

### First-Time Setup

```bash
# Install the tool
npm install -g organ-ai-zer

# Initialize configuration
organ-ai-zer init

# Edit config file to add API key
# Location shown after init command

# Test with preview
organ-ai-zer preview ~/Downloads

# Organize files
organ-ai-zer organize ~/Downloads
```

### Safe Organization Process

```bash
# Always start with preview
organ-ai-zer preview ~/Documents --recursive

# Try dry-run first
organ-ai-zer organize ~/Documents --dry-run --recursive

# Apply changes
organ-ai-zer organize ~/Documents --recursive
```

### Interactive AI Organization (Recommended)

```bash
# For complex organization needs with personalized structure
organ-ai-zer interactive ~/Media

# Test first with dry-run
organ-ai-zer interactive ~/Downloads --dry-run

# Interactive organization features:
# - AI content analysis (beyond file extensions)  
# - Project structure preservation
# - Targeted conversation for each content type
# - Enhanced preview with category grouping
# - Automatic empty directory cleanup
# - Always includes subdirectories for comprehensive analysis
```

## Scenario-Based Examples

### Organizing Downloaded Files

```bash
# Preview what would happen to downloads
organ-ai-zer preview ~/Downloads

# Organize with backup (enabled in config)
organ-ai-zer organize ~/Downloads
```

**Expected Results:**
```
~/Downloads/
├── images/
│   └── 2024/03/2024-03-15_screenshot.png
├── documents/
│   ├── financial/2024/invoice.pdf
│   └── manuals/user_guide.pdf
├── archives/
│   └── backup.zip
└── code/
    └── projects/sample_app/index.js
```

### Photo Organization by Date

```bash
# Configure for date-based photo organization
# Edit config to enable images.organizationRules.byDate

organ-ai-zer organize ~/Photos --recursive
```

**Config:**
```json
{
  "fileTypes": {
    "images": {
      "enabled": true,
      "namingPatterns": {
        "date": {
          "pattern": "YYYY/MM/YYYY-MM-DD_filename",
          "example": "2024/03/2024-03-15_vacation.jpg"
        }
      },
      "organizationRules": {
        "byDate": true
      }
    }
  }
}
```

**Results:**
```
~/Photos/
├── 2023/
│   ├── 12/2023-12-25_christmas.jpg
│   └── 11/2023-11-15_vacation.jpg
└── 2024/
    ├── 03/2024-03-15_family.jpg
    └── 02/2024-02-14_valentine.jpg
```

### Document Organization by Type

```bash
# Organize documents by AI-detected categories
organ-ai-zer organize ~/Documents/Misc --recursive
```

**Results:**
```
~/Documents/Misc/
├── financial/
│   ├── tax_return_2024.pdf
│   ├── bank_statement.pdf
│   └── invoice_march.pdf
├── legal/
│   ├── contract.pdf
│   └── agreement.pdf
├── career/
│   ├── resume.pdf
│   └── cover_letter.pdf
└── manuals/
    ├── car_manual.pdf
    └── appliance_guide.pdf
```

### Code Project Organization

```bash
# Organize loose code files by detected projects
organ-ai-zer organize ~/Code/misc --recursive
```

**Expected Results:**
```
~/Code/misc/
└── projects/
    ├── web_scraper/
    │   ├── scraper.py
    │   └── utils.py
    ├── data_analysis/
    │   ├── analysis.py
    │   └── visualization.py
    └── misc/
        └── random_script.js
```

## Advanced Configuration Examples

### Multiple File Type Focus

**Config for Media Organization:**
```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "your-key",
    "model": "gpt-4"
  },
  "organization": {
    "confidenceThreshold": 0.6,
    "createBackups": true
  },
  "fileTypes": {
    "images": {
      "enabled": true,
      "organizationRules": {
        "byDate": true
      }
    },
    "videos": {
      "enabled": true,
      "organizationRules": {
        "byDate": true
      }
    },
    "audio": {
      "enabled": true,
      "organizationRules": {
        "byType": true
      }
    },
    "documents": {
      "enabled": false
    }
  }
}
```

**Usage:**
```bash
organ-ai-zer organize ~/Media -c media-config.json --recursive
```

### Work Documents Configuration

**Config for Professional Use:**
```json
{
  "ai": {
    "provider": "anthropic",
    "apiKey": "your-key",
    "model": "claude-3-sonnet-20240229"
  },
  "organization": {
    "confidenceThreshold": 0.8,
    "createBackups": true,
    "preserveOriginalNames": true,
    "excludePatterns": ["*.tmp", "~$*", ".DS_Store"]
  },
  "fileTypes": {
    "documents": {
      "enabled": true,
      "namingPatterns": {
        "category": {
          "pattern": "CATEGORY/YYYY/filename",
          "example": "contracts/2024/service_agreement.pdf"
        }
      }
    },
    "spreadsheets": {
      "enabled": true,
      "namingPatterns": {
        "category": {
          "pattern": "spreadsheets/CATEGORY/filename",
          "example": "spreadsheets/budgets/q1_budget.xlsx"
        }
      }
    }
  }
}
```

**Usage:**
```bash
organ-ai-zer organize ~/Work/Documents -c work-config.json
```

### Custom Categories Example

**Config with Custom File Types:**
```json
{
  "customCategories": {
    "design_files": {
      "extensions": [".psd", ".ai", ".sketch", ".figma"],
      "config": {
        "enabled": true,
        "namingPatterns": {
          "project": {
            "pattern": "design/PROJECT_NAME/filename",
            "example": "design/website_redesign/homepage.psd"
          }
        },
        "organizationRules": {
          "byProject": true
        }
      }
    },
    "ebooks": {
      "extensions": [".epub", ".mobi", ".pdf"],
      "config": {
        "enabled": true,
        "namingPatterns": {
          "genre": {
            "pattern": "ebooks/GENRE/filename",
            "example": "ebooks/fiction/great_novel.epub"
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

## Command Line Examples

### Preview Operations

```bash
# Basic preview
organ-ai-zer preview ~/Downloads

# Recursive preview
organ-ai-zer preview ~/Documents --recursive

# Preview with custom config
organ-ai-zer preview ~/Photos -c photo-config.json

# Preview specific subdirectory
organ-ai-zer preview ~/Downloads/Recent --recursive
```

### Organize Operations

```bash
# Dry run (safe preview of changes)
organ-ai-zer organize ~/Downloads --dry-run

# Actual organization
organ-ai-zer organize ~/Downloads

# Recursive organization
organ-ai-zer organize ~/Documents --recursive

# With custom configuration
organ-ai-zer organize ~/Work -c work-config.json --recursive

# Force overwrite protection
organ-ai-zer organize ~/Important --dry-run --recursive
```

### Configuration Management

```bash
# Initialize default config
organ-ai-zer init

# Force recreate config
organ-ai-zer init --force

# Create config in custom location
organ-ai-zer init -c /path/to/project/config.json

# Use custom config location
organ-ai-zer preview ~/Data -c /path/to/config.json
```

## Output Examples

### Successful Preview Output

```
$ organ-ai-zer preview ~/Downloads

Previewing organization for: /Users/john/Downloads
📁 Found 8 files to analyze

🤖 Organization Preview (6 suggestions):
════════════════════════════════════════════════════════════

1. IMG_1234.jpg
   From: /Users/john/Downloads/IMG_1234.jpg
   To:   /Users/john/Downloads/images/2024/03/2024-03-15_IMG_1234.jpg
   Reason: Image file from March 2024, organizing by date
   Confidence: 85%

2. invoice_march.pdf
   From: /Users/john/Downloads/invoice_march.pdf
   To:   /Users/john/Downloads/documents/financial/2024/invoice_march.pdf
   Reason: Financial document detected, organizing by category and year
   Confidence: 92%

💡 Use the "organize" command to apply these changes
```

### Successful Organization Output

```
$ organ-ai-zer organize ~/Downloads

Starting organization of: /Users/john/Downloads
📁 Found 8 files to process
🤖 Generated 6 organization suggestions
📦 Backup created: /Users/john/backup_Downloads_2024-03-15T14-30-00
✅ Moved: IMG_1234.jpg → images/2024/03/2024-03-15_IMG_1234.jpg
✅ Moved: invoice_march.pdf → documents/financial/2024/invoice_march.pdf
✅ Moved: project.zip → archives/project.zip
✅ Organization complete!
```

### Error Handling Examples

```bash
# Missing API key
$ organ-ai-zer preview ~/Downloads
❌ No API key configured. Please run "organ-ai-zer init" and add your API key to the config file.
💡 Run "organ-ai-zer init" to set up your configuration

# Invalid directory
$ organ-ai-zer preview /nonexistent
❌ Error during preview: ENOENT: no such file or directory

# AI service failure with fallback
$ organ-ai-zer organize ~/Downloads
Starting organization of: /Users/john/Downloads
📁 Found 5 files to process
❌ AI analysis failed, falling back to rule-based organization
🔄 Using rule-based fallback organization
🤖 Generated 3 organization suggestions
✅ Organization complete!
```

## Performance Examples

### Large Directory Handling

```bash
# For directories with 1000+ files
organ-ai-zer preview ~/BigDirectory --recursive > preview.txt
# Review preview.txt before proceeding

# Organize in stages
organ-ai-zer organize ~/BigDirectory/SubDir1
organ-ai-zer organize ~/BigDirectory/SubDir2
# etc.
```

### Batch Processing Script

```bash
#!/bin/bash
# organize-multiple.sh

DIRS=(
  "~/Downloads"
  "~/Desktop" 
  "~/Documents/Unsorted"
)

for dir in "${DIRS[@]}"; do
  echo "Processing $dir..."
  organ-ai-zer organize "$dir" --dry-run
  read -p "Apply changes to $dir? (y/n): " confirm
  if [[ $confirm == "y" ]]; then
    organ-ai-zer organize "$dir"
  fi
done
```

## Integration Examples

### Automated Workflow

```bash
#!/bin/bash
# daily-organization.sh

# Run daily organization on Downloads
cd ~/Downloads

# Check if there are files to organize
if [ "$(ls -A .)" ]; then
  echo "Organizing Downloads folder..."
  organ-ai-zer organize . --dry-run > /tmp/org-preview.txt
  
  # Email preview (optional)
  mail -s "Daily Organization Preview" user@example.com < /tmp/org-preview.txt
  
  # Apply organization
  organ-ai-zer organize .
  
  echo "Organization complete at $(date)"
else
  echo "No files to organize"
fi
```

### Cron Job Setup

```bash
# Add to crontab (crontab -e)
# Run every day at 6 PM
0 18 * * * /path/to/daily-organization.sh >> /var/log/organ-ai-zer.log 2>&1
```

These examples should help you understand how to effectively use Organ-AI-zer in various real-world scenarios.