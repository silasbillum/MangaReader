# Start from a small Node image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy all files
COPY . .

# Expose port
EXPOSE 10000

# Run the app
CMD ["node", "app.js"]
