#!/bin/bash

# Test runner script for organ-ai-zer Docker environment
# Makes it easy to run common test scenarios

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to run tests
run_test() {
    local test_name="$1"
    local command="$2"
    
    print_status "Running test: $test_name"
    echo "Command: $command"
    echo "─────────────────────────────────────────────"
    
    if docker-compose run --rm organ-ai-zer $command; then
        print_success "Test '$test_name' completed successfully"
    else
        print_error "Test '$test_name' failed"
        return 1
    fi
    echo ""
}

# Function to build container
build_container() {
    print_status "Building organ-ai-zer Docker container..."
    if docker-compose build; then
        print_success "Container built successfully"
    else
        print_error "Failed to build container"
        exit 1
    fi
}

# Function to show help
show_help() {
    echo "Organ-AI-zer Docker Test Runner"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build              Build the Docker container"
    echo "  interactive        Start interactive container"
    echo "  test-all          Run all test scenarios"
    echo "  test-downloads    Test messy downloads scenario"
    echo "  test-media        Test media library scenario"
    echo "  test-photos       Test photo collection scenario"
    echo "  test-work         Test work projects scenario"
    echo "  test-desktop      Test mixed desktop scenario"
    echo "  test-cache        Test caching functionality"
    echo "  test-interactive  Test interactive AI organization"
    echo "  clean             Clean up Docker resources"
    echo "  help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 build && $0 test-all"
    echo "  $0 interactive"
    echo "  $0 test-media"
}

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Main script logic
case "${1:-help}" in
    "build")
        check_docker
        build_container
        ;;
        
    "interactive")
        check_docker
        print_status "Starting interactive container..."
        print_warning "Use 'exit' to leave the container"
        docker-compose up -d --build
        docker exec -it organ-ai-zer-test bash
        ;;
        
    "test-all")
        check_docker
        build_container
        
        print_status "Running comprehensive test suite..."
        
        # Basic preview tests
        run_test "Downloads Preview" "organ-ai-zer preview /test-data/scenarios/messy-downloads"
        run_test "Media Preview" "organ-ai-zer preview /test-data/scenarios/media-library --recursive"
        run_test "Photos Preview" "organ-ai-zer preview /test-data/scenarios/photo-collection"
        
        # Dry run tests
        run_test "Work Dry Run" "organ-ai-zer organize /test-data/scenarios/work-projects --dry-run"
        run_test "Desktop Dry Run" "organ-ai-zer organize /test-data/scenarios/mixed-desktop --dry-run"
        
        # Cache tests
        run_test "Cache Stats" "organ-ai-zer cache stats"
        run_test "Cache Clear" "organ-ai-zer cache clear"
        
        print_success "All tests completed!"
        ;;
        
    "test-downloads")
        check_docker
        run_test "Messy Downloads" "organ-ai-zer preview /test-data/scenarios/messy-downloads"
        ;;
        
    "test-media")
        check_docker
        run_test "Media Library" "organ-ai-zer preview /test-data/scenarios/media-library --recursive"
        ;;
        
    "test-photos")
        check_docker
        run_test "Photo Collection" "organ-ai-zer preview /test-data/scenarios/photo-collection"
        ;;
        
    "test-work")
        check_docker
        run_test "Work Projects" "organ-ai-zer organize /test-data/scenarios/work-projects --dry-run"
        ;;
        
    "test-desktop")
        check_docker
        run_test "Mixed Desktop" "organ-ai-zer organize /test-data/scenarios/mixed-desktop --dry-run"
        ;;
        
    "test-cache")
        check_docker
        print_status "Testing cache functionality..."
        
        run_test "Initial Preview (no cache)" "organ-ai-zer preview /test-data/scenarios/messy-downloads"
        run_test "Cache Stats" "organ-ai-zer cache stats"
        run_test "Second Preview (should use cache)" "organ-ai-zer organize /test-data/scenarios/messy-downloads --dry-run"
        run_test "Cache Clear" "organ-ai-zer cache clear"
        
        print_success "Cache testing completed!"
        ;;
        
    "test-interactive")
        check_docker
        print_status "Testing interactive AI organization..."
        print_warning "This test requires manual interaction"
        
        docker-compose run --rm organ-ai-zer organ-ai-zer interactive /test-data/scenarios/media-library --dry-run
        ;;
        
    "clean")
        check_docker
        print_status "Cleaning up Docker resources..."
        
        docker-compose down -v
        docker-compose rm -f
        
        # Remove images
        if docker images organ-ai-zer_organ-ai-zer -q | grep -q .; then
            docker rmi organ-ai-zer_organ-ai-zer
        fi
        
        print_success "Cleanup completed!"
        ;;
        
    "help"|*)
        show_help
        ;;
esac