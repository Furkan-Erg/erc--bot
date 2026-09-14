FROM node:20-alpine

RUN apk add --no-cache python3 make g++ cairo-dev pango-dev jpeg-dev giflib-dev pixman-dev

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN mkdir -p /app/data

CMD ["node", "src/index.js"]
