FROM node:20-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip ffmpeg build-essential git ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# Add this BELOW the apt-get block
RUN curl -fsSL https://deno.land/install.sh | sh
ENV PATH="/root/.deno/bin:${PATH}"

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY voice ./voice

RUN npm run build

# Replace the old yt-dlp line with this
RUN pip3 install --break-system-packages --no-cache-dir -r voice/requirements.txt
RUN pip3 install --break-system-packages --no-cache-dir -U "yt-dlp[default]"

CMD ["npm","start"]
