# Stage 1: Build the React app
FROM node:18 AS builder
WORKDIR /app
# Copy package files and install dependencies
COPY package*.json ./
RUN npm install
# Copy the rest of the source and build the app
COPY . .
RUN npm run build

# Stage 2: Setup the runtime container that serves the build folder
FROM node:18 AS runner
WORKDIR /app
# Copy the build output from the builder stage
COPY --from=builder /app/build ./build
# Copy your server file (that serves the build folder) and production dependencies
COPY serverFrontend.js ./
COPY package*.json ./
RUN npm install --production

# Expose the port that serverFrontend.js uses (adjust if necessary)
EXPOSE 2000

# Start your server
CMD ["node", "serverFrontend.js"]