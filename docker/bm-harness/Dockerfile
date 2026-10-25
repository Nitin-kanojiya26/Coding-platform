FROM node:20-alpine

WORKDIR /app

# Copy harness runner
COPY harness.js /app/harness.js

USER 1000:1000

CMD ["node", "/app/harness.js"]
