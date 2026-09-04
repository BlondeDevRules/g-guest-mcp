# Build and run the G-Guest stdio MCP server.
#
# It has to start and answer introspection with no egress at all: a directory
# that builds the image runs it in a sandbox without a route to our service.
# That is why the tool list falls back to the tools.json copied in below, and
# why nothing here reaches the network at run time.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* tsconfig.json ./
# --ignore-scripts: `prepare` would run tsc before the sources are copied.
RUN npm ci --ignore-scripts
COPY src ./src
RUN npx tsc

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist ./dist
# Sits one level above dist/, which is where the server looks for it offline.
COPY tools.json ./tools.json

# stdio: the client writes JSON-RPC on stdin and reads it on stdout.
ENTRYPOINT ["node", "dist/index.js"]
