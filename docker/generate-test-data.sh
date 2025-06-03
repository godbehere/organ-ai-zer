#!/bin/bash

# Test data generation script for organ-ai-zer
# Creates realistic file structures for testing without real content

set -e

TEST_DATA_DIR="/test-data"
SCENARIOS_DIR="$TEST_DATA_DIR/scenarios"

echo "🚀 Generating test data for organ-ai-zer..."

# Clean existing test data
rm -rf "$TEST_DATA_DIR"/*

# Create scenario directories
mkdir -p "$SCENARIOS_DIR"/{messy-downloads,media-library,photo-collection,work-projects,mixed-desktop}

# Function to create fake files with realistic names
create_fake_file() {
    local filepath="$1"
    local size="${2:-1024}"  # Default 1KB
    
    mkdir -p "$(dirname "$filepath")"
    
    # Create file with some basic content and metadata
    {
        echo "# Test file: $(basename "$filepath")"
        echo "# Generated for organ-ai-zer testing"
        echo "# Size: ${size} bytes"
        echo "# Created: $(date)"
        echo ""
        
        # Fill to desired size
        head -c "$size" /dev/zero 2>/dev/null || dd if=/dev/zero bs=1 count="$size" 2>/dev/null
    } > "$filepath"
    
    # Set realistic modification time (random within last 2 years)
    local random_days=$((RANDOM % 730))
    touch -d "$random_days days ago" "$filepath"
}

echo "📁 Creating messy downloads scenario..."
# Messy Downloads - Mixed file types as typically found in Downloads folder
DOWNLOADS="$SCENARIOS_DIR/messy-downloads"

create_fake_file "$DOWNLOADS/IMG_2024_vacation_beach.jpg" 2048000
create_fake_file "$DOWNLOADS/document_important.pdf" 512000
create_fake_file "$DOWNLOADS/setup_installer.exe" 10240000
create_fake_file "$DOWNLOADS/receipt_amazon_march.pdf" 256000
create_fake_file "$DOWNLOADS/presentation_work.pptx" 5120000
create_fake_file "$DOWNLOADS/screenshot_bug_report.png" 1024000
create_fake_file "$DOWNLOADS/music_album.zip" 52428800
create_fake_file "$DOWNLOADS/contract_signed.pdf" 1024000
create_fake_file "$DOWNLOADS/random_meme.gif" 512000
create_fake_file "$DOWNLOADS/bank_statement_april.pdf" 256000
create_fake_file "$DOWNLOADS/game_save_backup.dat" 2048000
create_fake_file "$DOWNLOADS/profile_picture_new.jpg" 1024000

echo "🎬 Creating media library scenario..."
# Media Library - Movies, TV Shows, Music
MEDIA="$SCENARIOS_DIR/media-library"

# Movies (mixed organization)
create_fake_file "$MEDIA/The_Matrix_1999_1080p.mkv" 2147483648
create_fake_file "$MEDIA/inception.2010.4k.mp4" 4294967296
create_fake_file "$MEDIA/Avengers Endgame (2019) [1080p].mkv" 3221225472
create_fake_file "$MEDIA/john_wick_chapter_4_2023_hdr.mkv" 5368709120
create_fake_file "$MEDIA/the-godfather-1972-criterion.mkv" 1073741824
create_fake_file "$MEDIA/Pulp Fiction 1994 Director's Cut.mp4" 2147483648

# TV Shows (inconsistent naming)
create_fake_file "$MEDIA/Breaking.Bad.S01E01.1080p.mkv" 1073741824
create_fake_file "$MEDIA/Breaking.Bad.S01E02.1080p.mkv" 1073741824
create_fake_file "$MEDIA/Game of Thrones - Season 1 Episode 1.mkv" 1610612736
create_fake_file "$MEDIA/GOT_S01E02_Winter_is_Coming.mkv" 1610612736
create_fake_file "$MEDIA/stranger_things_s4e1_2022.mkv" 2147483648
create_fake_file "$MEDIA/The Office US S02E01 - The Dundies.mp4" 524288000

# Music (various formats and organization)
create_fake_file "$MEDIA/The Beatles - Abbey Road - 01 - Come Together.mp3" 8388608
create_fake_file "$MEDIA/abbey_road_02_something.mp3" 7340032
create_fake_file "$MEDIA/Pink Floyd/Dark Side of the Moon/Time.flac" 41943040
create_fake_file "$MEDIA/random_song.mp3" 5242880
create_fake_file "$MEDIA/Led Zeppelin - Stairway to Heaven (Remastered).wav" 83886080
create_fake_file "$MEDIA/beethoven_symphony_9.mp3" 12582912

echo "📸 Creating photo collection scenario..."
# Photo Collection - Family photos with events and dates
PHOTOS="$SCENARIOS_DIR/photo-collection"

# Family photos with events
create_fake_file "$PHOTOS/IMG_2024_03_15_birthday_party_cake.jpg" 3145728
create_fake_file "$PHOTOS/birthday_mom_surprise.jpg" 2097152
create_fake_file "$PHOTOS/DSC_0234_birthday_guests.jpg" 4194304
create_fake_file "$PHOTOS/vacation_hawaii_2023_beach.jpg" 5242880
create_fake_file "$PHOTOS/hawaii_sunset_beautiful.jpg" 3145728
create_fake_file "$PHOTOS/vacation_group_photo.jpg" 4194304
create_fake_file "$PHOTOS/christmas_2023_tree.jpg" 2621440
create_fake_file "$PHOTOS/xmas_family_dinner.jpg" 3670016
create_fake_file "$PHOTOS/wedding_ceremony_2024.jpg" 6291456
create_fake_file "$PHOTOS/wedding_reception_dance.jpg" 5767168

# Regular photos
create_fake_file "$PHOTOS/random_selfie_monday.jpg" 1048576
create_fake_file "$PHOTOS/IMG_1234.jpg" 2097152
create_fake_file "$PHOTOS/phone_pic_coffee.jpg" 1572864
create_fake_file "$PHOTOS/cat_sleeping_cute.jpg" 1310720
create_fake_file "$PHOTOS/garden_flowers_spring.jpg" 2359296
create_fake_file "$PHOTOS/sunset_from_window.jpg" 1835008

# Videos
create_fake_file "$PHOTOS/birthday_video_singing.mp4" 104857600
create_fake_file "$PHOTOS/vacation_drone_footage.mov" 209715200
create_fake_file "$PHOTOS/baby_first_steps.mp4" 52428800

echo "💼 Creating work projects scenario..."
# Work Projects - Code, documents, designs
WORK="$SCENARIOS_DIR/work-projects"

# Client projects (should be kept together)
create_fake_file "$WORK/acme_corp_website/index.html" 8192
create_fake_file "$WORK/acme_corp_website/style.css" 4096
create_fake_file "$WORK/acme_corp_website/app.js" 16384
create_fake_file "$WORK/acme_corp_website/package.json" 1024
create_fake_file "$WORK/acme_corp_website/README.md" 2048
create_fake_file "$WORK/client_logo_design_final.ai" 2097152
create_fake_file "$WORK/client_branding_guidelines.pdf" 1048576
create_fake_file "$WORK/techstart_mobile_app.sketch" 5242880
create_fake_file "$WORK/startup_pitch_deck.pptx" 10485760

# Personal projects (project grouping examples)
create_fake_file "$WORK/my_python_tool.py" 4096
create_fake_file "$WORK/learning_react/package.json" 1024
create_fake_file "$WORK/learning_react/src/App.js" 2048
create_fake_file "$WORK/learning_react/src/components/Header.js" 1024
create_fake_file "$WORK/learning_react/README.md" 1536
create_fake_file "$WORK/data_analysis_script.R" 8192
create_fake_file "$WORK/portfolio_website/index.html" 4096
create_fake_file "$WORK/portfolio_website/style.css" 2048
create_fake_file "$WORK/side_project_ideas.txt" 2048

# Related document groups
create_fake_file "$WORK/Budget_2024_Q1.xlsx" 262144
create_fake_file "$WORK/Budget_2024_Q1_Summary.pdf" 131072
create_fake_file "$WORK/Budget_2024_Q1_Notes.txt" 1024
create_fake_file "$WORK/Project_Plan_v2.docx" 65536
create_fake_file "$WORK/Project_Plan_v2_Timeline.xlsx" 32768
create_fake_file "$WORK/invoice_march_2024.pdf" 131072
create_fake_file "$WORK/contract_freelance_work.pdf" 524288
create_fake_file "$WORK/meeting_notes_client_call.docx" 65536
create_fake_file "$WORK/time_tracking_march.xlsx" 262144

echo "🖥️ Creating mixed desktop scenario..."
# Mixed Desktop - Typical desktop chaos
DESKTOP="$SCENARIOS_DIR/mixed-desktop"

create_fake_file "$DESKTOP/Untitled Document.docx" 32768
create_fake_file "$DESKTOP/Screenshot 2024-03-15 at 10.30.45.png" 1048576
create_fake_file "$DESKTOP/New folder/random_file.txt" 1024
create_fake_file "$DESKTOP/downloaded_image.jpg" 2097152
create_fake_file "$DESKTOP/important_backup.zip" 104857600
create_fake_file "$DESKTOP/grocery_list.txt" 512
create_fake_file "$DESKTOP/password_manager_backup.csv" 16384
create_fake_file "$DESKTOP/old_resume_2023.pdf" 524288
create_fake_file "$DESKTOP/temp_notes.md" 2048
create_fake_file "$DESKTOP/software_download.dmg" 536870912

echo "📋 Creating test scenarios summary..."
# Create a README for each scenario
cat > "$SCENARIOS_DIR/README.md" << 'EOF'
# Test Scenarios for Organ-AI-zer

This directory contains various test scenarios to evaluate the organ-ai-zer application:

## Available Scenarios

### 1. `messy-downloads/`
Simulates a typical Downloads folder with mixed file types:
- Documents (PDFs, presentations)
- Images (photos, screenshots)
- Software installers
- Archives
- Random files

**Test with:** `organ-ai-zer preview /test-data/scenarios/messy-downloads`

### 2. `media-library/`
Large media collection with inconsistent organization:
- Movies with various naming conventions
- TV shows with mixed season/episode formats
- Music with different organizational structures
- Mixed video qualities and formats

**Test with:** `organ-ai-zer interactive /test-data/scenarios/media-library`

### 3. `photo-collection/`
Family photo collection spanning events and dates:
- Event photos (birthdays, vacations, holidays)
- Regular day-to-day photos
- Videos mixed with photos
- Inconsistent naming patterns

**Test with:** `organ-ai-zer interactive /test-data/scenarios/photo-collection`

### 4. `work-projects/`
Professional work environment with mixed project types:
- Client projects (web development, design)
- Personal learning projects
- Business documents (invoices, contracts)
- Mixed programming languages

**Test with:** `organ-ai-zer interactive /test-data/scenarios/work-projects`

### 5. `mixed-desktop/`
Typical desktop chaos scenario:
- Random downloads
- Screenshots
- Temporary files
- Backup files
- Documents in wrong places

**Test with:** `organ-ai-zer organize /test-data/scenarios/mixed-desktop --dry-run`

## Testing Commands

```bash
# Basic organization
organ-ai-zer preview /test-data/scenarios/messy-downloads

# Interactive organization
organ-ai-zer interactive /test-data/scenarios/media-library --recursive --dry-run

# Test with caching
organ-ai-zer preview /test-data/scenarios/photo-collection
organ-ai-zer organize /test-data/scenarios/photo-collection  # Uses cache

# Clear cache between tests
organ-ai-zer cache clear

# View cache statistics
organ-ai-zer cache stats
```

All files are generated programmatically and contain no real content.
They are sized and named to simulate realistic usage scenarios.
EOF

# Set proper permissions
find "$TEST_DATA_DIR" -type f -exec chmod 644 {} \;
find "$TEST_DATA_DIR" -type d -exec chmod 755 {} \;

echo "✅ Test data generation complete!"
echo ""
echo "📊 Generated scenarios:"
find "$SCENARIOS_DIR" -name "*.md" -exec echo "   📁 {}" \;
echo ""
echo "🔍 Total files created:"
find "$SCENARIOS_DIR" -type f ! -name "*.md" | wc -l
echo ""
echo "💾 Total size:"
du -sh "$SCENARIOS_DIR" 2>/dev/null | cut -f1
echo ""
echo "🚀 Ready for testing! Try:"
echo "   organ-ai-zer preview /test-data/scenarios/messy-downloads"