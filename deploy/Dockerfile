# OCEC Pulse / Pulse survey — self-hosted image.
# Build:  docker compose build      (run from the package folder)
# Two stages: compile the app, then a small runtime image that runs as a non-root user.

FROM node:22-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build:selfhost

FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
WORKDIR /app
# Only the migration runner needs a separate dependency; the server bundle is self-contained.
RUN printf '{"name":"pulse-runtime","private":true,"type":"module","dependencies":{"pg":"8.23.0"}}' > package.json \
 && npm install --omit=dev --no-audit --no-fund \
 && npm cache clean --force
COPY --from=build /src/.output ./.output
COPY --from=build /src/migrations ./migrations
COPY --from=build /src/scripts/migrate.mjs /src/scripts/migration-plan.mjs ./scripts/
COPY deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && chmod 755 /usr/local/bin/docker-entrypoint.sh && chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
