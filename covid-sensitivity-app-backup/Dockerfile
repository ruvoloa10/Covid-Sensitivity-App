# Use official Node.js image as the base
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React app (if using create-react-app)
RUN npm run build

# Expose the port the app runs on
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]
