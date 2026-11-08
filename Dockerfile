FROM node:20-alpine

RUN apk add --no-cache python3 make g++ cairo-dev pango-dev jpeg-dev giflib-dev pixman-dev \
    fontconfig ttf-dejavu font-noto py3-pip

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Müzik akışı için yt-dlp. YouTube'a ayak uydurmak için sık güncellenir, ama `pip install -U` katmanı Docker
# önbelleğinden gelince eski sürüm kalıyordu (2026-10-15'te kurulan imajda 2026.08.19 vardı, "Sign in to confirm
# you're not a bot" hataları başladı). Son sürümün küçük sağlama dosyası ADD ile çekilir: yeni sürüm çıkınca dosya
# değişir ve bu katman yeniden kurulur. npm ci'den sonra durur: yt-dlp güncellenince native modüller yeniden derlenmez.
ADD https://github.com/yt-dlp/yt-dlp/releases/latest/download/SHA2-256SUMS /tmp/yt-dlp-latest.sums
RUN pip install --no-cache-dir --break-system-packages -U yt-dlp yt-dlp-ejs && yt-dlp --version

COPY . .
RUN mkdir -p /app/data

CMD ["node", "src/index.js"]
