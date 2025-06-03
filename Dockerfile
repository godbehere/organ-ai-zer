# Use Node.js LTS version with full OS (more reliable than alpine)
FROM node:20

# System already has bash, curl, git - no additional packages needed

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install only production dependencies
RUN npm install

# Copy pre-built application
COPY dist/ ./dist/

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