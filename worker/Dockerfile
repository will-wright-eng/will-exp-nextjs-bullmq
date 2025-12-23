FROM node:24-alpine

WORKDIR /app

# Copy shared code
COPY shared/ ./shared/

# Copy worker code
COPY worker/ ./worker/

# Install dependencies
WORKDIR /app/shared
RUN npm install

WORKDIR /app/worker
RUN npm install

# Build shared code (if needed)
WORKDIR /app/shared
RUN npm run build || echo "No build script in shared"

# Build worker code (if needed)
WORKDIR /app/worker
RUN npm run build || echo "No build script in worker"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker

USER worker

WORKDIR /app/worker

# Use tsx in development (with volume mounts), compiled JS in production
CMD sh -c 'if [ "$NODE_ENV" = "development" ]; then npm run start:dev; else npm start; fi'
