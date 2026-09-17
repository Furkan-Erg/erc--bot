FROM node:20-alpine

RUN apk add --no-cache python3 make g++ cairo-dev pango-dev jpeg-dev giflib-dev pixman-dev \
    fontconfig ttf-dejavu font-noto py3-pip

# Müzik akışı için yt-dlp (her build'de en güncel sürüm çekilir)
RUN pip install --no-cache-dir --break-system-packages -U yt-dlp yt-dlp-ejs

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN mkdir -p /app/data

CMD ["node", "src/index.js"]
