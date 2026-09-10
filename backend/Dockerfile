# Dockerfile for Backend Railway deployment
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci || npm install

# Copy source code and build standalone server.mjs
COPY . .
RUN npm run build

# Production runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

COPY package.json ./
COPY --from=builder /app/server.mjs ./server.mjs
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/data ./data
COPY --from=builder /app/uploads ./uploads

EXPOSE 8080

CMD ["node", "server.mjs"]
