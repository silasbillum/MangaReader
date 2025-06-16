# Use official Node.js image
FROM node:18-slim

# Create app directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy app source code
COPY . .

# Expose port (change if different in your app)
EXPOSE 3000

# Start the app
CMD ["node", "app.js"]
