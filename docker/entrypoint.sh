#!/bin/bash

# Entrypoint script for organ-ai-zer Docker container
set -e

echo "🚀 Starting organ-ai-zer test container..."

# Generate test data on first run
if [ ! -d "/test-data/scenarios" ]; then
    echo "📁 Generating test data..."
    generate-test-data.sh
else
    echo "📁 Test data already exists"
fi

# Initialize organ-ai-zer configuration if not exists
if [ ! -f "/root/.organ-ai-zer/config.json" ]; then
    echo "⚙️  Setting up organ-ai-zer configuration..."
    
    # Create config directory
    mkdir -p /root/.organ-ai-zer
    
    # Copy test configuration
    cp /app/test-config.json /root/.organ-ai-zer/config.json
    
    echo "✅ Configuration ready!"
    echo ""
    echo "🔑 Note: The test configuration uses a placeholder API key."
    echo "   To test with real AI, update the API key in /root/.organ-ai-zer/config.json"
fi

echo ""
echo "🎯 Available test scenarios:"
echo "   📁 /test-data/scenarios/messy-downloads     - Mixed downloads folder"
echo "   📁 /test-data/scenarios/media-library       - Movies, TV shows, music"
echo "   📁 /test-data/scenarios/photo-collection    - Family photos and events"
echo "   📁 /test-data/scenarios/work-projects       - Code and work files"
echo "   📁 /test-data/scenarios/mixed-desktop       - Desktop chaos"
echo ""
echo "🚀 Quick start commands:"
echo "   organ-ai-zer --help                                    # Show all commands"
echo "   organ-ai-zer preview /test-data/scenarios/messy-downloads"
echo "   organ-ai-zer interactive /test-data/scenarios/media-library --dry-run"
echo "   organ-ai-zer cache stats                               # Check cache status"
echo ""

# Execute the passed command or start bash
if [ "$#" -eq 0 ] || [ "$1" = "bash" ]; then
    echo "🐚 Starting interactive shell..."
    exec bash
else
    echo "▶️  Executing: $*"
    exec "$@"
fi