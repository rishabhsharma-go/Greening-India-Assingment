# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY migrations ./migrations
COPY node-pg-migrate.config.cjs ./

RUN npm run build

# Runtime stage
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/node-pg-migrate.config.cjs ./

EXPOSE 8080

CMD ["sh", "-c", "node-pg-migrate up -j 1 && node dist/seed/seed.js && node dist/index.js"]
