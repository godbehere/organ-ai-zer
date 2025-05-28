# Use Node.js LTS version
FROM node:18-alpine

# Install required system dependencies
RUN apk add --no-cache \
    bash \
    curl \
    git \
    python3 \
    make \
    g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Create test environment structure
RUN mkdir -p /test-data

# Copy test data generation script
COPY docker/generate-test-data.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/generate-test-data.sh

# Copy sample configuration
COPY docker/test-config.json /app/test-config.json

# Install the CLI globally in container
RUN npm install -g .

# Set up environment
ENV NODE_ENV=development
ENV PATH="/app/node_modules/.bin:$PATH"

# Create entrypoint script
COPY docker/entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

# Expose any ports if needed (not required for CLI app)
# EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["bash"]