# Use a smaller base image for building the application
FROM node:14-alpine AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install
 
# Copy the rest of the application code
COPY . .

# Use a smaller runtime image
FROM node:14-alpine

# Set the working directory
WORKDIR /app

# Copy only the necessary files from the build stage
COPY --from=build /app .

# Expose the port the app runs on
EXPOSE 5002

# Command to run the application
CMD ["npm", "start"]