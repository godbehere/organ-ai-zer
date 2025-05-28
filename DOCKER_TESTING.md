# Docker Testing Environment

This Docker setup provides a safe, isolated environment for testing organ-ai-zer without affecting your local file system. The container automatically generates realistic test data scenarios for comprehensive testing.

## Quick Start

### Build and Run Interactive Container
```bash
# Build and start interactive container
docker-compose up --build

# Or run detached
docker-compose up -d --build

# Access the container
docker exec -it organ-ai-zer-test bash
```

### One-Shot Testing
```bash
# Run a single test command
docker-compose run --rm organ-ai-zer organ-ai-zer preview /test-data/scenarios/messy-downloads

# Run with different scenarios
docker-compose run --rm organ-ai-zer organ-ai-zer interactive /test-data/scenarios/media-library --dry-run
```

## Test Scenarios

The container automatically generates 5 different test scenarios:

### 1. 📁 Messy Downloads (`/test-data/scenarios/messy-downloads`)
Simulates a typical Downloads folder:
- Mixed document types (PDFs, presentations, receipts)
- Images and screenshots
- Software installers and archives
- Random files with poor naming

**Test Commands:**
```bash
organ-ai-zer preview /test-data/scenarios/messy-downloads
organ-ai-zer organize /test-data/scenarios/messy-downloads --dry-run
```

### 2. 🎬 Media Library (`/test-data/scenarios/media-library`)
Large media collection with inconsistent organization:
- Movies with various naming conventions and qualities
- TV shows with mixed season/episode formats
- Music with different organizational patterns
- Mixed video formats and sizes

**Test Commands:**
```bash
organ-ai-zer interactive /test-data/scenarios/media-library --recursive
organ-ai-zer preview /test-data/scenarios/media-library --recursive
```

### 3. 📸 Photo Collection (`/test-data/scenarios/photo-collection`)
Family photo archive with events:
- Event photos (birthdays, vacations, weddings)
- Regular daily photos
- Mixed photo and video content
- Inconsistent date and naming patterns

**Test Commands:**
```bash
organ-ai-zer interactive /test-data/scenarios/photo-collection
organ-ai-zer organize /test-data/scenarios/photo-collection --dry-run
```

### 4. 💼 Work Projects (`/test-data/scenarios/work-projects`)
Professional development environment:
- Client projects (web development, design files)
- Personal learning projects
- Business documents (invoices, contracts)
- Mixed programming languages and frameworks

**Test Commands:**
```bash
organ-ai-zer interactive /test-data/scenarios/work-projects --recursive
organ-ai-zer preview /test-data/scenarios/work-projects
```

### 5. 🖥️ Mixed Desktop (`/test-data/scenarios/mixed-desktop`)
Typical desktop chaos:
- Random downloads and screenshots
- Temporary files and notes
- Backup files in wrong locations
- Documents with generic names

**Test Commands:**
```bash
organ-ai-zer organize /test-data/scenarios/mixed-desktop --dry-run
organ-ai-zer preview /test-data/scenarios/mixed-desktop
```

## Configuration

### Default Test Configuration
The container uses a pre-configured setup optimized for testing:
- Located at `/root/.organ-ai-zer/config.json`
- All file types enabled
- Reasonable defaults for testing
- Placeholder API key (replace for AI testing)

### Using Your Own API Key
To test with real AI functionality:

1. **Method 1: Update config in container**
   ```bash
   # Access container
   docker exec -it organ-ai-zer-test bash
   
   # Edit config
   nano /root/.organ-ai-zer/config.json
   # Replace "your-api-key-here" with your actual API key
   ```

2. **Method 2: Mount your config file**
   ```bash
   # Create your config file locally
   cp docker/test-config.json my-config.json
   # Edit my-config.json with your API key
   
   # Mount it in docker-compose.yml
   # volumes:
   #   - ./my-config.json:/root/.organ-ai-zer/config.json
   ```

3. **Method 3: Environment variable**
   ```bash
   # Set API key via environment
   docker-compose run -e OPENAI_API_KEY=your-key organ-ai-zer bash
   ```

## Usage Examples

### Basic Testing Workflow
```bash
# Start container
docker-compose up -d --build

# Access container
docker exec -it organ-ai-zer-test bash

# Inside container - test different scenarios
organ-ai-zer preview /test-data/scenarios/messy-downloads
organ-ai-zer organize /test-data/scenarios/messy-downloads --dry-run
organ-ai-zer cache stats
organ-ai-zer cache clear
```

### Interactive Organization Testing
```bash
# Test the interactive AI feature
organ-ai-zer interactive /test-data/scenarios/media-library --recursive --dry-run

# Example interaction:
# Describe how you would like this directory organized:
# > "Organize movies by genre and year, TV shows by series with seasons"
```

### Caching System Testing
```bash
# Test cache functionality
organ-ai-zer preview /test-data/scenarios/photo-collection
organ-ai-zer organize /test-data/scenarios/photo-collection  # Should use cache

# Check cache status
organ-ai-zer cache stats

# Clear and test again
organ-ai-zer cache clear
organ-ai-zer preview /test-data/scenarios/photo-collection  # Fresh AI call
```

### Configuration Testing
```bash
# Test different AI providers
organ-ai-zer init --force  # Create new config interactively

# Test with custom config
organ-ai-zer preview /test-data/scenarios/work-projects -c /path/to/custom-config.json
```

## Development Testing

### Test Code Changes
```bash
# Rebuild with your changes
docker-compose build --no-cache

# Test specific functionality
docker-compose run --rm organ-ai-zer organ-ai-zer --help
```

### Debug Mode
```bash
# Run with debug output
docker-compose run --rm organ-ai-zer bash -c "DEBUG=* organ-ai-zer preview /test-data/scenarios/messy-downloads"
```

### Volume Management
```bash
# View generated test data
docker-compose run --rm organ-ai-zer ls -la /test-data/scenarios/

# Reset test data (regenerate fresh files)
docker-compose run --rm organ-ai-zer rm -rf /test-data/scenarios
docker-compose run --rm organ-ai-zer generate-test-data.sh

# Clear configuration (reset to defaults)
docker volume rm organ-ai-zer_config-data
```

## Advanced Usage

### Custom Test Scenarios
```bash
# Create your own test files
docker exec -it organ-ai-zer-test bash
mkdir -p /test-data/custom-scenario
# Add your own test files
organ-ai-zer preview /test-data/custom-scenario
```

### Performance Testing
```bash
# Test with large file counts
docker-compose run --rm organ-ai-zer bash -c "
  mkdir -p /test-data/large-test
  for i in {1..100}; do
    touch /test-data/large-test/file_\$i.txt
  done
  organ-ai-zer preview /test-data/large-test
"
```

### CI/CD Testing
```bash
# Automated testing script
docker-compose run --rm organ-ai-zer bash -c "
  organ-ai-zer preview /test-data/scenarios/messy-downloads > /tmp/test1.out
  organ-ai-zer cache stats
  organ-ai-zer cache clear
  echo 'All tests completed successfully'
"
```

## File Structure in Container

```
/app/                           # Application code
├── package.json
├── tsconfig.json
├── src/                        # Source code
└── dist/                       # Built application

/test-data/                     # Generated test data
└── scenarios/
    ├── messy-downloads/
    ├── media-library/
    ├── photo-collection/
    ├── work-projects/
    ├── mixed-desktop/
    └── README.md

/root/.organ-ai-zer/           # Configuration
└── config.json

/usr/local/bin/                # Scripts
├── generate-test-data.sh
└── entrypoint.sh
```

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker-compose logs

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### Test Data Issues
```bash
# Regenerate test data
docker exec -it organ-ai-zer-test generate-test-data.sh

# Check test data
docker exec -it organ-ai-zer-test ls -la /test-data/scenarios/
```

### Configuration Problems
```bash
# Reset configuration
docker volume rm organ-ai-zer_config-data
docker-compose up

# Check current config
docker exec -it organ-ai-zer-test cat /root/.organ-ai-zer/config.json
```

### API Key Issues
```bash
# Verify API key is set
docker exec -it organ-ai-zer-test organ-ai-zer cache stats

# Test without AI (rule-based fallback)
# The application should still work with placeholder API keys
```

## Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (clears all test data and config)
docker-compose down -v

# Remove images
docker rmi organ-ai-zer_organ-ai-zer

# Complete cleanup
docker system prune -a
```

This Docker setup provides a complete testing environment that's:
- ✅ **Safe**: No risk to your local files
- ✅ **Reproducible**: Same test data every time
- ✅ **Comprehensive**: Multiple realistic scenarios
- ✅ **Flexible**: Easy to modify and extend
- ✅ **Fast**: Quick setup and teardown