FROM node:20-alpine

WORKDIR /app

# Copy full repo (shared/ types needed by backend)
COPY . .

# Install and build backend
WORKDIR /app/backend
RUN npm install
RUN npm run build

WORKDIR /app
EXPOSE 4000

CMD ["node", "backend/dist/backend/src/index.js"]
