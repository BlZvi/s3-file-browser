FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy built output and package files
COPY --chown=node:node --from=builder /app/build ./build
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/package-lock.json ./package-lock.json

# Install production dependencies only
RUN npm ci --omit=dev
RUN chown -R node:node node_modules

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV ORIGIN=http://localhost:3000
ENV SESSION_SECRET=change-me-in-production
ENV S3_DEFAULT_ENDPOINT=""
ENV S3_DEFAULT_REGION="us-east-1"
ENV S3_ACCESS_KEY=""
ENV S3_SECRET_KEY=""
ENV S3_ENDPOINT=""
ENV S3_REGION="us-east-1"
ENV S3_SESSION_TOKEN=""
ENV OIDC_ISSUER=""
ENV OIDC_CLIENT_ID=""
ENV OIDC_CLIENT_SECRET=""
ENV OIDC_SCOPES="openid profile email"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1

USER node

# Start the server
CMD ["node", "build"]
