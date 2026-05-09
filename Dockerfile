# ── LiiLend Multi-Stage Docker Build ───────────────────────────────────────────

# ──────────────────────────────────────────────────────────────────────────────
# Stage 1: Anchor Program Build
# ──────────────────────────────────────────────────────────────────────────────
FROM backpackapp/build:v0.32.1 AS anchor-builder

WORKDIR /build
COPY programs/ programs/
COPY Cargo.toml Cargo.lock ./
COPY rust-toolchain.toml ./

RUN anchor build --program-name liilend && \
    ls -la target/deploy/liilend.so && \
    ls -la target/idl/liilend.json

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2: Backend Dependencies
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS backend-deps

WORKDIR /app
COPY backend/package.json backend/tsconfig.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ──────────────────────────────────────────────────────────────────────────────
# Stage 3: Backend Build
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS backend-build

WORKDIR /app
COPY backend/package.json backend/tsconfig.json ./
COPY backend/src/ src/
RUN npm ci && npm run build

# ──────────────────────────────────────────────────────────────────────────────
# Stage 4: Frontend Dependencies
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-deps

WORKDIR /app
COPY app/package.json app/tsconfig.json app/next.config.js ./
RUN npm ci --omit=dev && npm cache clean --force

# ──────────────────────────────────────────────────────────────────────────────
# Stage 5: Frontend Build
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app
COPY app/package.json app/tsconfig.json app/next.config.js app/postcss.config.js app/tailwind.config.ts ./
COPY app/src/ src/
COPY app/public/ public/
RUN npm ci && npm run build

# ──────────────────────────────────────────────────────────────────────────────
# Stage 6: Backend Runtime
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS backend

WORKDIR /app

RUN addgroup -S liilend && adduser -S liilend -G liilend

COPY --from=backend-deps /app/node_modules node_modules/
COPY --from=backend-build /app/dist dist/
COPY --from=anchor-builder /build/target/deploy/liilend.so /app/programs/
COPY --from=anchor-builder /build/target/idl/liilend.json /app/idl/
COPY backend/package.json ./

USER liilend

EXPOSE 3001

CMD ["node", "dist/index.js"]

# ──────────────────────────────────────────────────────────────────────────────
# Stage 7: Frontend Runtime
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend

WORKDIR /app

RUN addgroup -S liilend && adduser -S liilend -G liilend

COPY --from=frontend-deps /app/node_modules node_modules/
COPY --from=frontend-build /app/.next .next/
COPY --from=frontend-build /app/public public/
COPY --from=frontend-build /app/package.json ./
COPY --from=frontend-build /app/next.config.js ./

USER liilend

EXPOSE 3000

CMD ["npm", "start"]

# ──────────────────────────────────────────────────────────────────────────────
# Stage 8: Default — Backend
# ──────────────────────────────────────────────────────────────────────────────
FROM backend
