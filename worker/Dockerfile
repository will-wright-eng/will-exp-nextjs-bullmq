FROM node:24-alpine

WORKDIR /app

# Copy worker package.json and tsconfig.json
COPY ./worker/package.json ./worker/tsconfig.json ./

# Copy worker source code from nextjs-app/worker
COPY ./nextjs-app/worker ./worker

# Copy shared directory
COPY ./nextjs-app/shared ./shared

# Install dependencies
RUN npm install

# Build worker code
RUN npm run build

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker

USER worker

CMD ["npm", "start"]
