# Organ-AI-zer 🤖📁

An intelligent file organizer powered by AI that automatically categorizes and organizes your files using advanced machine learning models.

## Features

- 🤖 **3-Phase Conversational AI**: Advanced AI architecture with analysis, conversation, and autonomous organization
- 🧠 **True AI Content Analysis**: Goes beyond file extensions to understand actual file content and patterns
- 🏗️ **Project Structure Preservation**: Automatically detects and maintains coding project integrity
- 📋 **Enhanced Preview System**: Category grouping with samples and interactive exploration options
- 🧹 **Automatic Cleanup**: Removes empty directories left after organization
- 🔍 **Preview Mode**: See what changes will be made before applying them
- 🛡️ **Safe Operations**: Automatic backups and dry-run capabilities
- 🎯 **Smart Categorization**: Recognizes file types, dates, projects, and content patterns
- ⚡ **CLI Interface**: Fast command-line tool with spinner animations and progress feedback

## Installation

### Prerequisites

- Node.js 16+ and npm
- An API key from either:
  - [OpenAI](https://platform.openai.com/api-keys) (recommended: GPT-4)
  - [Anthropic](https://console.anthropic.com/) (Claude 3 models)

### Install via npm

```bash
npm install -g organ-ai-zer
```

### Install from source

```bash
git clone https://github.com/godbehere/organ-ai-zer.git
cd organ-ai-zer
npm install
npm run build
npm install -g .
```

## Quick Start

1. **Interactive setup** (recommended):
   ```bash
   organ-ai-zer init
   ```
   Follow the interactive prompts to configure AI provider, API key, and preferences.

2. **Preview organization**:
   ```bash
   organ-ai-zer preview ~/Downloads
   ```

3. **Organize files**:
   ```bash
   organ-ai-zer organize ~/Downloads
   ```

### New: 3-Phase Conversational AI Organization

For complex organization needs, use the advanced conversational AI feature with intelligent 3-phase architecture:

```bash
organ-ai-zer interactive ~/Media
```

**Phase 1: AI Analysis** - Intelligently detects projects, analyzes file content, and identifies patterns
**Phase 2: Conversation** - Conducts smart dialogue to understand your preferences for each content type
**Phase 3: Organization** - Autonomously organizes files with enhanced preview and empty directory cleanup

Perfect for media libraries, project files, and custom organization schemes with true AI content understanding.

### Alternative: Non-Interactive Setup

1. **Create default config**:
   ```bash
   organ-ai-zer init --no-interactive
   ```

2. **Edit config file** to add your API key:
   ```bash
   nano ~/.organ-ai-zer/config.json
   ```

## Configuration

### Initial Setup

Run `organ-ai-zer init` to create a configuration file at `~/.organ-ai-zer/config.json`.

### Configuration File Structure

```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "your-api-key-here",
    "model": "gpt-4",
    "maxTokens": 1000,
    "temperature": 0.3,
    "timeout": 30000
  },
  "organization": {
    "confidenceThreshold": 0.7,
    "createBackups": true,
    "preserveOriginalNames": false,
    "maxDepth": 5,
    "excludePatterns": [".DS_Store", "Thumbs.db", "*.tmp", "*.cache"],
    "includePatterns": ["*"]
  },
  "fileTypes": {
    "images": {
      "enabled": true,
      "namingPatterns": {
        "date": {
          "pattern": "YYYY/MM/YYYY-MM-DD_filename",
          "description": "Organize by year/month with date prefix",
          "example": "2024/03/2024-03-15_vacation.jpg"
        }
      },
      "organizationRules": {
        "byDate": true,
        "byType": false
      }
    }
  }
}
```

### AI Provider Configuration

#### OpenAI Setup
```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "sk-...",
    "model": "gpt-4",
    "maxTokens": 1000,
    "temperature": 0.3
  }
}
```

#### Anthropic Setup
```json
{
  "ai": {
    "provider": "anthropic",
    "apiKey": "sk-ant-...",
    "model": "claude-3-sonnet-20240229",
    "maxTokens": 1000,
    "temperature": 0.3
  }
}
```

### File Type Configuration

Each file type can be configured with:

- **enabled**: Whether to organize this file type
- **namingPatterns**: Different naming conventions
- **organizationRules**: How to group files

Example for documents:
```json
{
  "documents": {
    "enabled": true,
    "namingPatterns": {
      "category": {
        "pattern": "documents/CATEGORY/YYYY/filename",
        "description": "Organize by category and year",
        "example": "documents/financial/2024/tax_return.pdf"
      }
    },
    "organizationRules": {
      "byType": true,
      "byDate": false
    }
  }
}
```

### Organization Rules

- **confidenceThreshold**: Minimum AI confidence (0.0-1.0) to apply suggestions
- **createBackups**: Automatically backup directories before organizing
- **preserveOriginalNames**: Keep original filenames vs. applying naming patterns
- **maxDepth**: Maximum directory depth to scan
- **excludePatterns**: File patterns to ignore (supports wildcards)
- **includePatterns**: File patterns to include (supports wildcards)

## Commands

### `init`
Initialize configuration file with interactive setup.

```bash
organ-ai-zer init [options]
```

**Options:**
- `--force`: Overwrite existing config file
- `--no-interactive`: Skip interactive setup, use defaults
- `-c, --config <path>`: Custom config file path

**Examples:**
```bash
# Interactive setup (recommended)
organ-ai-zer init

# Non-interactive with defaults
organ-ai-zer init --no-interactive

# Force overwrite existing config
organ-ai-zer init --force

# Custom config location
organ-ai-zer init -c /path/to/custom/config.json
```

### `preview`
Preview organization suggestions without making changes.

```bash
organ-ai-zer preview <directory> [options]
```

**Options:**
- `-r, --recursive`: Include subdirectories
- `-c, --config <path>`: Custom config file path

**Example:**
```bash
organ-ai-zer preview ~/Downloads
organ-ai-zer preview ~/Documents --recursive
organ-ai-zer preview ~/Photos -c custom-config.json
```

### `interactive`
Interactive AI-guided organization with conversation.

```bash
organ-ai-zer interactive <directory> [options]
```

**Options:**
- `-d, --dry-run`: Simulate organization without moving files
- `-c, --config <path>`: Custom config file path

**Example:**
```bash
# Interactive media library organization
organ-ai-zer interactive ~/Media

# Test with dry run first
organ-ai-zer interactive ~/Downloads --dry-run

# Organize work projects interactively
organ-ai-zer interactive ~/Projects -c work-config.json
```

This command uses advanced 3-phase AI architecture:

1. **AI Analysis Phase**: Intelligently detects coding projects, analyzes file content with AI, and identifies patterns
2. **Conversation Phase**: Conducts targeted dialogue to understand your preferences for each detected content type
3. **Organization Phase**: Executes organization with enhanced preview (category grouping, samples) and automatic empty directory cleanup

Features true AI content analysis, project structure preservation, spinner animations during analysis, and interactive preview options. See [INTERACTIVE_ORGANIZE.md](INTERACTIVE_ORGANIZE.md) for detailed usage examples.

### `organize`
Organize files according to AI suggestions.

```bash
organ-ai-zer organize <directory> [options]
```

**Options:**
- `-d, --dry-run`: Preview changes without applying them
- `-r, --recursive`: Include subdirectories
- `-c, --config <path>`: Custom config file path

**Example:**
```bash
organ-ai-zer organize ~/Downloads --dry-run
organ-ai-zer organize ~/Documents --recursive
organ-ai-zer organize ~/Photos -c custom-config.json
```

## File Organization Patterns

### Images and Videos
- **By Date**: `2024/03/2024-03-15_vacation.jpg`
- **By Event**: `events/birthday_party/2024-03-15_cake.jpg`

### Documents
- **By Category**: `documents/financial/2024/tax_return.pdf`
- **By Type**: `documents/legal/contract_2024.pdf`

### Code Files
- **By Project**: `projects/my_app/index.js`
- **By Language**: `code/javascript/utils.js`

### Audio Files
- **By Artist**: `music/The_Beatles/Abbey_Road/Come_Together.mp3`
- **By Genre**: `music/rock/classic_rock/song.mp3`

## Examples

### Basic Usage

```bash
# Initialize and configure
organ-ai-zer init
# Edit ~/.organ-ai-zer/config.json to add your API key

# Preview what would happen
organ-ai-zer preview ~/Downloads

# Organize with dry-run first
organ-ai-zer organize ~/Downloads --dry-run

# Actually organize the files
organ-ai-zer organize ~/Downloads
```

### Advanced Usage

```bash
# Organize recursively with custom config
organ-ai-zer organize ~/Documents \
  --recursive \
  --config ./project-config.json

# Preview with specific file type focus
organ-ai-zer preview ~/Photos --recursive
```

## AI Behavior

The AI analyzes files based on:

1. **File names and extensions**
2. **File modification dates**
3. **Existing directory structure**
4. **User-defined preferences**
5. **Content patterns and keywords**

### AI Prompting

The AI receives context about:
- File metadata (name, size, date, type)
- Existing directory structure
- User preferences from config
- File categorization patterns

### Fallback Behavior

If AI analysis fails:
1. Application falls back to rule-based organization
2. Uses file extensions and basic patterns
3. Maintains functionality without AI dependency

## Docker Testing Environment

For safe testing without affecting your local files, use the Docker setup:

```bash
# Quick start - build and run interactive container
./docker/test-runner.sh build
./docker/test-runner.sh interactive

# Inside container - test various scenarios
organ-ai-zer preview /test-data/scenarios/messy-downloads
organ-ai-zer interactive /test-data/scenarios/media-library --dry-run
```

The Docker environment includes:
- 🗂️ **5 realistic test scenarios** (downloads, media, photos, work, desktop)
- 🔒 **Safe isolated environment** - no risk to your local files  
- ⚙️ **Pre-configured setup** - ready to test immediately
- 📊 **Comprehensive test data** - movies, music, photos, documents, code

See [DOCKER_TESTING.md](DOCKER_TESTING.md) for detailed setup and usage instructions.

## Troubleshooting

### Common Issues

#### "No API key configured"
- Run `organ-ai-zer init` to create config file
- Add your API key to the config file
- Verify the key is valid and has sufficient credits

#### "AI analysis failed"
- Check your internet connection
- Verify API key is correct and active
- Check API service status
- Application will fall back to rule-based organization

#### "No files to organize"
- Check include/exclude patterns in config
- Verify file types are enabled
- Use `--recursive` flag for subdirectories

### Configuration Validation

The application validates your configuration and will show specific error messages for:
- Invalid JSON syntax
- Missing required fields
- Invalid value ranges
- Malformed patterns

### API Limits

Be aware of:
- **OpenAI**: Rate limits and token costs
- **Anthropic**: Message limits and costs
- **File batching**: Large directories are processed in batches

## Security and Privacy

- **API Keys**: Stored locally in config file (secure file permissions recommended)
- **File Analysis**: Only metadata sent to AI (not file contents)
- **Backups**: Created automatically before organization (if enabled)
- **Dry Run**: Always test with `--dry-run` or `preview` first

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/your-username/organ-ai-zer/issues)
- **Documentation**: This README and inline help (`organ-ai-zer --help`)
- **Examples**: See `examples/` directory in the repository

---

**Made with ❤️ for better file organization**