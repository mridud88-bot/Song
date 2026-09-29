FROM node:20-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip ffmpeg build-essential git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY voice ./voice

RUN npm run build
RUN pip3 install --break-system-packages --no-cache-dir -r voice/requirements.txt
RUN pip3 install --break-system-packages --no-cache-dir -U yt-dlp

CMD ["npm","start"]
