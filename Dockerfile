FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY CONTRACT/package.json ./CONTRACT/
COPY packages/core/package.json ./packages/core/
COPY packages/agent/package.json ./packages/agent/
COPY packages/sdk/package.json ./packages/sdk/
COPY apps/api/package.json ./apps/api/
COPY tsconfig.base.json tsconfig.json vitest.config.ts ./
COPY CONTRACT ./CONTRACT
COPY packages ./packages
COPY apps/api ./apps/api
COPY scripts ./scripts
RUN npm install && npm run keys:fetch && npm run front:circuit
ENV NODE_ENV=production
EXPOSE 8787
CMD ["npm", "run", "api"]
