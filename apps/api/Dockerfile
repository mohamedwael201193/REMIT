FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY CONTRACT ./CONTRACT
COPY packages ./packages
COPY apps/api ./apps/api
COPY tsconfig.base.json tsconfig.json vitest.config.ts ./
RUN npm ci --omit=dev
ENV NODE_ENV=production
EXPOSE 8787
CMD ["npm", "run", "api"]
