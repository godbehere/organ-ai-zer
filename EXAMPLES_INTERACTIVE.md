# Interactive Organization Examples

Here are real-world examples of how the interactive organize feature works in practice.

## Example 1: Media Library Organization

### Scenario
User has a mixed media collection with movies, TV shows, and music that needs systematic organization.

### Conversation Flow

```bash
$ organ-ai-zer interactive ~/Media --recursive

🤖 Starting interactive AI organization for: /home/user/Media

📝 Let's understand how you want to organize your files...

? Describe how you would like this directory organized:
> I want movies organized by genre and year, TV shows by series with seasons, and music by artist and album

📁 Scanning directory...
📊 Found 245 files to analyze

📋 File Overview:
   Videos: 180 files
   Audio: 60 files
   Images: 5 files

🤖 Starting AI analysis and conversation...

🔄 Analysis attempt 1/5...

📋 Proposed Organization (showing 10 of 245 files):

1. The_Avengers_2012_1080p.mkv
   → Movies/Action/2012/The_Avengers_2012_1080p.mkv
   Reason: Action movie from 2012, organized by genre and year as requested

2. Breaking_Bad_S01E01_1080p.mkv
   → TV_Shows/Breaking_Bad/Season_01/Breaking_Bad_S01E01_1080p.mkv
   Reason: TV show episode organized by series and season structure

3. The_Beatles_Abbey_Road_01_Come_Together.mp3
   → Music/The_Beatles/Abbey_Road/01_Come_Together.mp3
   Reason: Music organized by artist and album as requested

... and 242 more files organized similarly.

? How do these organization suggestions look?
❯ 🔧 Good direction, but needs some adjustments

? What adjustments would you like?
> I prefer the year to come before the genre for movies, and I want explicit "Movies" and "TV_Shows" folders

📝 Added your feedback to the conversation context.

❓ Let me ask a few questions to better understand your preferences:

? For video files, how would you like to distinguish between movies and TV shows?
> Movies are single files, TV shows have season/episode indicators like S01E01

? What folder structure do you prefer?
> Movies/Year/Genre/Title and TV_Shows/Series/Season_XX/episodes

? Any specific naming conventions you prefer?
> Keep the quality indicators like 1080p, 4K in the filename

🔄 Analysis attempt 2/5...

📋 Updated Organization (showing 10 of 245 files):

1. The_Avengers_2012_1080p.mkv
   → Movies/2012/Action/The_Avengers_2012_1080p.mkv
   Reason: Year-first structure as requested, action genre, quality preserved

2. Breaking_Bad_S01E01_1080p.mkv
   → TV_Shows/Breaking_Bad/Season_01/Breaking_Bad_S01E01_1080p.mkv
   Reason: TV show with explicit TV_Shows folder and season structure

3. The_Beatles_Abbey_Road_01_Come_Together.mp3
   → Music/The_Beatles/Abbey_Road/01_Come_Together.mp3
   Reason: Artist/album structure maintained as approved

? How do these organization suggestions look?
❯ ✅ Perfect! Apply this organization

Do you want to execute this organization plan? Yes

📦 Backup created: /home/user/backup_Media_2024-05-27T15-30-00
🚀 Executing organization...

✅ Moved: The_Avengers_2012_1080p.mkv → Movies/2012/Action/The_Avengers_2012_1080p.mkv
✅ Moved: Breaking_Bad_S01E01_1080p.mkv → TV_Shows/Breaking_Bad/Season_01/Breaking_Bad_S01E01_1080p.mkv
✅ Moved: The_Beatles_Abbey_Road_01_Come_Together.mp3 → Music/The_Beatles/Abbey_Road/01_Come_Together.mp3
... [242 more files moved]

✅ Interactive organization complete!
```

### Final Structure
```
Media/
├── Movies/
│   ├── 2012/
│   │   ├── Action/
│   │   │   └── The_Avengers_2012_1080p.mkv
│   │   └── Sci-Fi/
│   │       └── Prometheus_2012_1080p.mkv
│   └── 2019/
│       └── Action/
│           └── John_Wick_3_2019_4K.mkv
├── TV_Shows/
│   ├── Breaking_Bad/
│   │   ├── Season_01/
│   │   │   ├── Breaking_Bad_S01E01_1080p.mkv
│   │   │   └── Breaking_Bad_S01E02_1080p.mkv
│   │   └── Season_02/
│   └── Game_of_Thrones/
│       └── Season_01/
└── Music/
    ├── The_Beatles/
    │   └── Abbey_Road/
    └── Pink_Floyd/
        └── Dark_Side_of_the_Moon/
```

## Example 2: Work Project Organization

### Scenario
Freelance designer with mixed client files needs organization by client and project type.

### Conversation Flow

```bash
$ organ-ai-zer interactive ~/Work --recursive --dry-run

🤖 Starting interactive AI organization for: /home/user/Work

📝 Let's understand how you want to organize your files...

? Describe how you would like this directory organized:
> Organize by client name, then project type (logos, websites, print), then by date

📁 Scanning directory...
📊 Found 89 files to analyze

📋 File Overview:
   Images: 45 files
   Documents: 25 files
   Archives: 15 files
   Other: 4 files

🔄 Analysis attempt 1/5...

📋 Proposed Organization (showing 10 of 89 files):

1. AcmeCorp_logo_final.ai
   → Clients/AcmeCorp/Logos/2024/AcmeCorp_logo_final.ai
   Reason: Logo file for AcmeCorp client, organized by client/type/date

2. TechStart_website_mockup.psd
   → Clients/TechStart/Websites/2024/TechStart_website_mockup.psd
   Reason: Website design for TechStart client

? How do these organization suggestions look?
❯ 🔧 Good direction, but needs some adjustments

? What adjustments would you like?
> I want the year to be more specific - use actual project dates, not just 2024. Also add version numbers for final files

❓ Let me ask a few questions to better understand your preferences:

? How do you identify different clients in your filenames?
> Client names are usually at the beginning of filenames, or in folder names

? What folder structure do you prefer?
> Clients/ClientName/ProjectType/YYYY-MM/files

? Any specific naming conventions you prefer?
> Keep version indicators like _final, _v1, _v2 in filenames

🔄 Analysis attempt 2/5...

📋 Updated Organization (showing 10 of 89 files):

1. AcmeCorp_logo_final.ai
   → Clients/AcmeCorp/Logos/2024-03/AcmeCorp_logo_final.ai
   Reason: Logo for AcmeCorp, March 2024 based on file date, final version preserved

2. TechStart_website_mockup_v2.psd
   → Clients/TechStart/Websites/2024-02/TechStart_website_mockup_v2.psd
   Reason: Website mockup for TechStart, February 2024, version number maintained

? How do these organization suggestions look?
❯ ✅ Perfect! Apply this organization

🔍 DRY RUN - No files would actually be moved
Would move: AcmeCorp_logo_final.ai → Clients/AcmeCorp/Logos/2024-03/AcmeCorp_logo_final.ai
Would move: TechStart_website_mockup_v2.psd → Clients/TechStart/Websites/2024-02/TechStart_website_mockup_v2.psd
... [87 more files would be moved]
```

## Example 3: Photo Archive Organization

### Scenario
Family photo collection spanning years needs organization by events and dates.

### Conversation Flow

```bash
$ organ-ai-zer interactive ~/Photos

📝 Let's understand how you want to organize your files...

? Describe how you would like this directory organized:
> Organize family photos by year, then by events like birthdays, vacations, holidays, with regular photos by month

📁 Scanning directory...
📊 Found 1,247 files to analyze

📋 File Overview:
   Images: 1,245 files
   Videos: 2 files

🔄 Analysis attempt 1/5...

📋 Proposed Organization (showing 10 of 1,247 files):

1. IMG_2024_03_15_birthday_cake.jpg
   → Photos/2024/Events/Birthdays/March_Birthday/IMG_2024_03_15_birthday_cake.jpg
   Reason: Birthday event photo from March 2024, organized under events

2. vacation_beach_sunset.jpg
   → Photos/2023/Events/Vacations/Summer_Vacation/vacation_beach_sunset.jpg
   Reason: Vacation photo, organized under events/vacations

3. random_selfie_monday.jpg
   → Photos/2024/Regular/March/random_selfie_monday.jpg
   Reason: Regular photo, not event-specific, organized by month

? How do these organization suggestions look?
❯ ❌ Not what I want, let me explain differently

? Please explain how you would prefer the files to be organized:
> I want to detect events automatically from filenames and EXIF data. Events should be separate from regular monthly photos. Use simpler event names.

❓ Let me ask a few questions to better understand your preferences:

? For photo organization, how would you like images organized?
> Events in separate folders, regular photos by YYYY/MM format

? How should I detect events vs regular photos?
> Event keywords like birthday, vacation, wedding, holiday, or dates close together suggest events

🔄 Analysis attempt 2/5...

📋 Updated Organization (showing 10 of 1,247 files):

1. IMG_2024_03_15_birthday_cake.jpg
   → Photos/2024/Events/Birthday_March_2024/IMG_2024_03_15_birthday_cake.jpg
   Reason: Birthday event detected from filename, simplified event naming

2. vacation_beach_sunset.jpg
   → Photos/2023/Events/Vacation_Summer_2023/vacation_beach_sunset.jpg
   Reason: Vacation event with season and year identifier

3. random_selfie_monday.jpg
   → Photos/2024/2024-03/random_selfie_monday.jpg
   Reason: Regular photo, organized by year/month format as requested

? How do these organization suggestions look?
❯ ✅ Perfect! Apply this organization
```

## Example 4: Code Project Organization

### Scenario
Developer with mixed personal and work projects needs clear separation and organization.

### Conversation Flow

```bash
$ organ-ai-zer interactive ~/Code --recursive

📝 Let's understand how you want to organize your files...

? Describe how you would like this directory organized:
> Separate work and personal projects, organize by programming language and framework, keep active vs archived projects separate

📁 Scanning directory...
📊 Found 156 files to analyze

📋 File Overview:
   Code: 140 files
   Documents: 10 files
   Other: 6 files

🔄 Analysis attempt 1/5...

📋 Proposed Organization (showing 10 of 156 files):

1. client-website-react/package.json
   → Work/JavaScript/React/Active/client-website-react/package.json
   Reason: Work project (client in name), React framework, appears active

2. my-python-script.py
   → Personal/Python/Scripts/my-python-script.py
   Reason: Personal script, Python language, simple script category

? How do these organization suggestions look?
❯ 🔧 Good direction, but needs some adjustments

? What adjustments would you like?
> I want to organize by client name for work projects, and by project purpose for personal ones

❓ Let me ask a few questions to better understand your preferences:

? How do you identify work vs personal projects?
> Work projects have client names or company names, personal projects are learning, tools, or hobby projects

? What folder structure do you prefer?
> Work/Client/Language-Framework/ProjectName and Personal/Purpose/Language/ProjectName

🔄 Analysis attempt 2/5...

📋 Updated Organization:

1. client-website-react/package.json
   → Work/ClientCorp/JavaScript-React/client-website-react/package.json
   Reason: Work project for ClientCorp, React framework identified

2. my-python-script.py
   → Personal/Tools/Python/my-python-script.py
   Reason: Personal utility tool, Python language

? How do these organization suggestions look?
❯ ✅ Perfect! Apply this organization
```

## Tips for Successful Interactive Organization

### 1. Start with Clear Intent
- Describe the overall structure you want
- Mention specific requirements upfront
- Give examples of your preferred naming

### 2. Use the Feedback Loop Effectively
- Review the first few suggestions carefully
- Provide specific adjustments rather than complete rejection
- Build on what works, refine what doesn't

### 3. Answer Clarifying Questions
- The AI asks targeted questions to understand your needs
- Provide detailed answers to get better results
- Think about edge cases and special requirements

### 4. Test with Dry Run
- Always test complex organizations with `--dry-run` first
- Review the full plan before executing
- Make sure the structure matches your mental model

The interactive organize feature learns from your feedback and creates personalized organization structures that perfectly match your specific needs and workflow.