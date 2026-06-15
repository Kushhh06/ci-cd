FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src/ ./src/
COPY test/ ./test/

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "src/server.js"]
