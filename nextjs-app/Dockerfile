FROM node:24-alpine

WORKDIR /app

# Copy Next.js app (includes shared directory)
COPY nextjs-app/ ./nextjs-app/

# Copy migrations directory
COPY migrations/ ./migrations/

# Install dependencies
WORKDIR /app/nextjs-app/shared
RUN npm install

WORKDIR /app/nextjs-app
RUN npm install

# Build shared code (if needed)
WORKDIR /app/nextjs-app/shared
RUN npm run build || echo "No build script in shared"

# Build Next.js app
WORKDIR /app/nextjs-app
RUN npm run build

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

WORKDIR /app/nextjs-app
CMD ["node", "scripts/start-with-migrations.js"]
