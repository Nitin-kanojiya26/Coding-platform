FROM node:20-alpine

# Set working directory
WORKDIR /app

# Initialize npm package and install express
RUN npm init -y && \
    npm install express@^4.21.0 && \
    npm cache clean --force

# Make node_modules discoverable from any directory (e.g. /app/user)
ENV NODE_PATH=/app/node_modules

# Ensure non-root node user (uid 1000:1000) can read dependencies
RUN chmod -R 755 /app

# Default non-root user
USER 1000:1000

# Default command runs the mounted user entry point
CMD ["node", "/app/user/index.js"]
