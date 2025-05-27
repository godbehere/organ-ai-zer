# Interactive Setup Guide

Organ-AI-zer now features an interactive setup process that guides you through configuring the application step by step.

## Interactive Initialization

Run the following command to start the interactive setup:

```bash
organ-ai-zer init
```

## Setup Flow

### 1. Welcome Screen
```
🚀 Welcome to Organ-AI-zer configuration setup!
Press Enter to use default values, or enter your preferred settings.
```

### 2. AI Configuration
You'll be prompted to configure your AI provider:

```
🤖 AI Configuration
? Which AI provider would you like to use? (Use arrow keys)
❯ OpenAI (GPT-4, GPT-3.5-turbo)
  Anthropic (Claude 3)

? Enter your API key (or leave empty to add later): [hidden]
? Enter model name for openai: (gpt-4)
? Maximum tokens for AI responses: (1000)
? AI temperature (0 = deterministic, 1 = creative): (0.3)
```

**AI Provider Options:**
- **OpenAI**: Uses GPT models (GPT-4, GPT-3.5-turbo)
- **Anthropic**: Uses Claude 3 models (Sonnet, Haiku, Opus)

**Model Selection:**
- **OpenAI**: `gpt-4` (recommended), `gpt-3.5-turbo` (faster/cheaper)
- **Anthropic**: `claude-3-sonnet-20240229` (recommended), `claude-3-haiku-20240307` (faster)

**Parameters:**
- **Max Tokens**: 100-4000 (higher = more detailed analysis)
- **Temperature**: 0-2 (0 = consistent, 0.3 = slight variation, 1+ = creative)

### 3. Organization Settings
Configure how files should be organized:

```
📁 Organization Settings
? Minimum confidence threshold for AI suggestions (0-1): (0.7)
? Create backups before organizing? (Y/n)
? Preserve original filenames (only move, don't rename)? (y/N)
? Maximum directory depth to scan: (5)
```

**Settings Explained:**
- **Confidence Threshold**: Only apply AI suggestions above this confidence level
- **Create Backups**: Automatically backup directories before organizing
- **Preserve Names**: Keep original filenames vs. applying naming patterns
- **Max Depth**: Limit how deep to scan subdirectories

### 4. File Type Selection
Choose which file types to organize:

```
🗂️ File Type Configuration
? Which file types should be organized? (Press <space> to select, <a> to toggle all, <i> to invert selection)
❯◉ Images (jpg, png, gif, etc.)
 ◉ Videos (mp4, avi, mov, etc.)
 ◉ Audio (mp3, wav, flac, etc.)
 ◉ Documents (pdf, doc, txt, etc.)
 ◉ Spreadsheets (xlsx, csv, etc.)
 ◉ Presentations (pptx, ppt, etc.)
 ◉ Code files (js, py, java, etc.)
 ◉ Archives (zip, rar, tar, etc.)
 ◉ Miscellaneous files
```

Use spacebar to select/deselect file types you want to organize.

### 5. Completion
```
✅ Config saved to: /home/user/.organ-ai-zer/config.json

✅ Configuration setup complete!
📁 Config location: /home/user/.organ-ai-zer/config.json

🚀 Ready to organize! Try:
   organ-ai-zer preview ~/Downloads
   organ-ai-zer organize ~/Downloads --dry-run
```

## Command Options

### Interactive Mode (Default)
```bash
organ-ai-zer init
```
Walks through interactive setup prompts.

### Non-Interactive Mode
```bash
organ-ai-zer init --no-interactive
```
Creates config with default values (legacy behavior).

### Force Overwrite
```bash
organ-ai-zer init --force
```
Overwrites existing configuration without prompting.

### Custom Config Location
```bash
organ-ai-zer init -c /path/to/custom/config.json
```
Creates configuration at a custom location.

### Combined Options
```bash
organ-ai-zer init --force --no-interactive -c ./project-config.json
```

## Example Interactive Session

```bash
$ organ-ai-zer init

🚀 Welcome to Organ-AI-zer configuration setup!
Press Enter to use default values, or enter your preferred settings.

🤖 AI Configuration
? Which AI provider would you like to use? OpenAI (GPT-4, GPT-3.5-turbo)
? Enter your API key (or leave empty to add later): sk-...
? Enter model name for openai: gpt-4
? Maximum tokens for AI responses: 1500
? AI temperature (0 = deterministic, 1 = creative): 0.2

📁 Organization Settings
? Minimum confidence threshold for AI suggestions (0-1): 0.8
? Create backups before organizing? Yes
? Preserve original filenames (only move, don't rename)? No
? Maximum directory depth to scan: 3

🗂️ File Type Configuration
? Which file types should be organized? 
❯◉ Images (jpg, png, gif, etc.)
 ◉ Videos (mp4, avi, mov, etc.)
 ◯ Audio (mp3, wav, flac, etc.)
 ◉ Documents (pdf, doc, txt, etc.)
 ◯ Spreadsheets (xlsx, csv, etc.)
 ◯ Presentations (pptx, ppt, etc.)
 ◉ Code files (js, py, java, etc.)
 ◯ Archives (zip, rar, tar, etc.)
 ◯ Miscellaneous files

✅ Config saved to: /home/user/.organ-ai-zer/config.json
✅ Configuration setup complete!
```

## Tips for Setup

### API Keys
- **OpenAI**: Get from https://platform.openai.com/api-keys
- **Anthropic**: Get from https://console.anthropic.com/
- You can leave the API key empty during setup and add it later by editing the config file

### Recommended Settings

#### For Photo Organization
```
AI Provider: OpenAI (gpt-4)
Confidence: 0.7
File Types: Images, Videos enabled only
Preserve Names: No (to apply date-based naming)
```

#### For Document Management
```
AI Provider: Anthropic (claude-3-sonnet)
Confidence: 0.8
File Types: Documents, Spreadsheets, Presentations
Preserve Names: Yes (keep original names)
```

#### For Code Organization
```
AI Provider: OpenAI (gpt-4)
Confidence: 0.6
File Types: Code files enabled
Max Depth: 3 (avoid deep scanning)
```

### Security Considerations
- API keys are stored locally in the config file
- Set appropriate file permissions: `chmod 600 ~/.organ-ai-zer/config.json`
- Never commit config files with API keys to version control

## Post-Setup

After completing the interactive setup:

1. **Test the configuration**:
   ```bash
   organ-ai-zer preview ~/Downloads
   ```

2. **Make adjustments** by editing the config file directly:
   ```bash
   nano ~/.organ-ai-zer/config.json
   ```

3. **Re-run setup** if needed:
   ```bash
   organ-ai-zer init --force
   ```

The interactive setup makes it easy to get started with Organ-AI-zer while understanding all the available configuration options.