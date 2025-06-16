FROM node:18-slim

# Install only necessary dependencies for Chromium
RUN apt-get update && apt-get install -y \
    ca-certificates fonts-liberation libasound2 libatk-1.0-0 libcups2 \
    libdrm2 libxss1 libxrandr2 libgtk-3-0 libnss3 libx11-xcb1 libxcomposite1 \
    libxdamage1 libxext6 libgbm1 libxshmfence1 libxfixes3 libxrender1 libxcb1 \
    libglib2.0-0 libstdc++6 libexpat1 wget --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

# Install Chromium for Puppeteer
RUN npx puppeteer browsers install chrome

COPY . .

EXPOSE 3000

CMD ["node", "app.js"]
