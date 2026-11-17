# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm@10

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# ================================
# Dependencies stage
# ================================
FROM base AS deps
# Install dependencies
RUN pnpm install --prod=false

# ================================
# Builder stage
# ================================
FROM base AS builder
# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy source code
COPY . .

# Set NODE_ENV for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Placeholders so the build can load server modules. They exist only in this
# stage; real values are injected at runtime by docker-compose (.env.docker).
ENV GOOGLE_CLIENT_ID=build-placeholder
ENV GOOGLE_CLIENT_SECRET=build-placeholder
ENV NEXTAUTH_SECRET=build-placeholder
ENV POSTGRES_URL=postgresql://build:build@localhost:5432/build

# Build the application
RUN pnpm build

# ================================
# Production stage
# ================================
FROM node:20-alpine AS runner
WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 8080

# Set port environment variable
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
