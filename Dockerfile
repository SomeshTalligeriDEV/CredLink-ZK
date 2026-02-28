# ============================================
# CredLink ZK — Production Dockerfile
# Multi-stage build: Frontend + Backend
# ============================================

# --- Stage 1: Build Frontend ---
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

COPY frontend/ ./

# Build args for public env vars (injected at build time)
ARG NEXT_PUBLIC_CHAIN_ID=97
ARG NEXT_PUBLIC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
ARG NEXT_PUBLIC_CREDITSCORE_ADDRESS=0x5ED05A35D14cae38Bf7A73AeCF295320DA17dF33
ARG NEXT_PUBLIC_LENDING_POOL_ADDRESS=0x53c95d8dAFBD171b28B9D874C02534e7b60390E5
ARG NEXT_PUBLIC_COLLATERAL_MANAGER_ADDRESS=0xBbEd9274652F6e82f33D2777970b0719FE2f1F99
ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID
ENV NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL
ENV NEXT_PUBLIC_CREDITSCORE_ADDRESS=$NEXT_PUBLIC_CREDITSCORE_ADDRESS
ENV NEXT_PUBLIC_LENDING_POOL_ADDRESS=$NEXT_PUBLIC_LENDING_POOL_ADDRESS
ENV NEXT_PUBLIC_COLLATERAL_MANAGER_ADDRESS=$NEXT_PUBLIC_COLLATERAL_MANAGER_ADDRESS
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# --- Stage 2: Production Runtime ---
FROM node:18-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Copy backend
COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && (npm ci --omit=dev 2>/dev/null || npm install --omit=dev)
COPY backend/ ./backend/

# Copy frontend production build
COPY --from=frontend-build /app/frontend/.next ./frontend/.next
COPY --from=frontend-build /app/frontend/public ./frontend/public
COPY --from=frontend-build /app/frontend/package.json ./frontend/
COPY --from=frontend-build /app/frontend/node_modules ./frontend/node_modules

# Copy startup script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Expose ports: 3000 (frontend) + 3001 (backend)
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
