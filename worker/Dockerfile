FROM node:24-alpine

WORKDIR /app

# Copy worker files
COPY ./worker .

# Copy shared directory to worker/src/shared
COPY ./nextjs-app/shared ./src/shared

# Install dependencies
RUN npm install

# Build worker code
RUN npm run build

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker

USER worker

CMD ["npm", "start"]
