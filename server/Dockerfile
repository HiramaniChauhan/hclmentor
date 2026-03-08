# Use Node.js 20 LTS
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=5001

# Expose the application port
EXPOSE 5001

# Command to run the application
CMD ["node", "server.js"]
