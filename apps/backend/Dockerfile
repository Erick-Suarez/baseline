# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory to /app
WORKDIR /app

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files to the working directory
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose the port that the Express server will listen on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]

# BUILD INSTRUCTIONS

# Get date for tag
# current_date=$(date +%s)

# Docker build image
# docker build -t baseline-backend:$current_date .

# Docker run container
# docker run --env-file .env.development -p 3000:3000 baseline-backend:$current_date