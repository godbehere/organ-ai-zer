# Interactive AI Organization

The interactive organize feature provides a conversational AI experience that learns your preferences through dialogue to create the perfect organization structure for your files.

## Overview

Unlike the standard `organize` and `preview` commands that use predefined patterns, the `interactive` command:

1. 🗣️ **Asks you to describe** how you want files organized
2. 🤖 **Analyzes your intent** using AI to understand your requirements  
3. 📋 **Shows suggestions** based on your description
4. 💬 **Gathers feedback** and refines the approach through conversation
5. ✅ **Iterates until perfect** - keeps improving until you're satisfied

## Use Cases

### 📺 Media Library Organization
Perfect for organizing large media collections with specific requirements:
- Movies by genre, year, and quality
- TV shows with season/episode structure
- Music by artist, album, or genre
- Personal videos by date or event

### 📁 Project File Management
Ideal for organizing work files with custom structures:
- Code projects by language and framework
- Design files by client and project type
- Documents by department and date
- Research materials by topic and date

### 🏠 Personal File Collections
Great for household digital organization:
- Photos by family events and dates
- Documents by category and importance
- Downloads by type and relevance
- Backups with clear naming schemes

## Command Usage

### Basic Syntax
```bash
organ-ai-zer interactive <directory> [options]
```

### Options
- `-r, --recursive`: Include subdirectories
- `-d, --dry-run`: Simulate organization without moving files
- `-c, --config <path>`: Use custom configuration file

### Examples
```bash
# Organize media library interactively
organ-ai-zer interactive ~/Media --recursive

# Dry run for testing
organ-ai-zer interactive ~/Downloads --dry-run

# Organize with custom config
organ-ai-zer interactive ~/Projects -c work-config.json
```

## Interactive Flow

### 1. Initial Description
You'll be prompted to describe your organization goals:

```
📝 Let's understand how you want to organize your files...

? Describe how you would like this directory organized:
> I want my movie collection organized by genre, then year, with quality in the filename
```

### 2. File Analysis
The system scans and categorizes your files:

```
📁 Scanning directory...
📊 Found 150 files to analyze

📋 File Overview:
   Videos: 120 files
   Images: 25 files
   Other: 5 files
```

### 3. AI Suggestions
Based on your description, AI generates organization suggestions:

```
📋 Proposed Organization (showing 10 of 120 files):

1. The_Matrix_1999_1080p.mkv
   → Movies/Sci-Fi/1999/The_Matrix_1999_1080p.mkv
   Reason: Sci-fi movie from 1999, organized by genre and year with quality

2. Inception_2010_4K.mkv  
   → Movies/Sci-Fi/2010/Inception_2010_4K.mkv
   Reason: Sci-fi movie from 2010, 4K quality maintained in filename

3. Titanic_1997_720p.mp4
   → Movies/Romance/1997/Titanic_1997_720p.mp4
   Reason: Romance/drama from 1997, organized by primary genre
```

### 4. Feedback Collection
You can approve, adjust, or reject the suggestions:

```
? How do these organization suggestions look?
❯ ✅ Perfect! Apply this organization
  🔧 Good direction, but needs some adjustments  
  ❌ Not what I want, let me explain differently
  ❓ I need to see more examples first
```

### 5. Refinement Through Conversation
If adjustments are needed, the AI asks clarifying questions:

```
? What adjustments would you like?
> I prefer the year before the genre, and separate action movies from sci-fi

❓ Let me ask a few questions to better understand your preferences:

? For video files, how would you like to distinguish between movies and TV shows?
> TV shows should go in a separate "TV Shows" folder with Season subfolders

? What folder structure do you prefer? 
> Movies/Year/Genre/Title_Year_Quality
```

### 6. Iterative Improvement
The AI generates new suggestions based on your feedback:

```
🔄 Analysis attempt 2/5...

📋 Updated Organization:

1. The_Matrix_1999_1080p.mkv
   → Movies/1999/Sci-Fi/The_Matrix_1999_1080p.mkv
   Reason: Year-first structure as requested, sci-fi genre classification

2. Die_Hard_1988_720p.mkv
   → Movies/1988/Action/Die_Hard_1988_720p.mkv  
   Reason: Action movie separated from sci-fi as requested
```

### 7. Final Approval and Execution
Once you approve the plan:

```
? Do you want to execute this organization plan? Yes

📦 Backup created: /home/user/backup_Media_2024-05-27T15-30-00
🚀 Executing organization...
✅ Moved: The_Matrix_1999_1080p.mkv → Movies/1999/Sci-Fi/The_Matrix_1999_1080p.mkv
✅ Moved: Inception_2010_4K.mkv → Movies/2010/Sci-Fi/Inception_2010_4K.mkv
...
✅ Interactive organization complete!
```

## Example Conversations

### Media Library Example
```
User: "Organize my movie collection by genre, year, and include quality in filename"

AI: Shows organization like Movies/Action/2023/Movie_2023_1080p.mkv

User: "Good but I want year first, then genre"

AI: Shows Movies/2023/Action/Movie_2023_1080p.mkv

User: "Perfect! But separate TV shows into their own structure"

AI: Asks about TV show organization preferences

User: "TV Shows/Series Name/Season X/episodes"

AI: Creates final structure with both movies and TV shows
```

### Photo Organization Example
```
User: "Organize family photos by year and events"

AI: Shows Photos/2024/Events/Birthday_2024-03-15.jpg

User: "I want events separate from regular photos"

AI: "How should I distinguish between event photos and regular photos?"

User: "Event photos have specific keywords, regular photos by month"

AI: Creates Photos/2024/Events/ and Photos/2024/03-March/ structure
```

### Project Files Example
```
User: "Organize my code projects by language and framework"

AI: Shows Projects/JavaScript/React/project-name/

User: "Add client folders for work projects"

AI: "How do you identify work projects vs personal projects?"

User: "Work projects have client names in folder or filename"

AI: Creates Projects/Work/ClientName/JavaScript/React/ structure
```

## Advanced Features

### Context Memory
The AI remembers conversation history:
- Previous rejections inform new suggestions
- Approved patterns influence similar files
- Clarifications apply to entire organization

### Smart Questions
Contextual questions based on file types:
- Video files: Movie vs TV show distinction
- Audio files: Artist/Album vs Genre organization  
- Images: Date vs Event vs Type organization
- Documents: Work vs Personal vs Archive structure

### Feedback Learning
The system learns from your feedback:
- Rejected patterns are avoided in future suggestions
- Approved structures are replicated for similar files
- Specific requirements are applied consistently

### Safety Features
- **Dry run mode**: Test organization without moving files
- **Automatic backups**: Creates backup before execution
- **Incremental approval**: Review suggestions before applying
- **Conversation limits**: Prevents infinite loops (max 5 attempts)

## Tips for Best Results

### Be Specific in Descriptions
❌ **Vague**: "Organize my files better"  
✅ **Specific**: "Organize movies by genre and year, TV shows by series with seasons"

### Provide Examples
❌ **Abstract**: "Use good naming conventions"  
✅ **Concrete**: "I want Movie_Title_2023_1080p.mkv format"

### Use the Feedback Loop
- Try the first suggestion to see the pattern
- Provide specific adjustments rather than complete rejections
- Answer clarifying questions to help the AI understand

### Start with Clear Requirements
- Think about your end goal before starting
- Consider how you'll browse the organized files
- Mention any existing conventions you want to keep

## Troubleshooting

### AI Suggestions Don't Match Intent
1. Provide more specific descriptions
2. Answer the clarifying questions in detail
3. Give concrete examples of your preferred structure
4. Use the adjustment feedback option

### Too Many Conversation Rounds
1. Be more specific in initial description
2. Provide complete requirements upfront
3. Use examples in your descriptions
4. Answer all clarifying questions thoroughly

### Unsatisfied with Final Result
1. Use dry-run mode to test first
2. Clear cache and start fresh conversation
3. Try different wording in your initial description
4. Break complex requirements into simpler parts

The interactive organize feature is designed to understand exactly how you want your files organized through natural conversation, creating a personalized organization system that matches your specific needs and preferences.