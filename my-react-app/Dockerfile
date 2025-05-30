# Stage 1: Build the React app
FROM node:20-alpine AS builder
LABEL stage="builder"

WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package.json package-lock.json* ./

# Install dependencies
# Using npm ci for cleaner installs if package-lock.json is present and reliable
# RUN npm ci --omit=dev
# Using npm install for broader compatibility if package-lock might not be perfect
RUN npm install --omit=dev
# If your build process itself needs devDependencies (e.g. vite, typescript), then don't use --omit=dev
# RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application
# The package.json script already uses "npx vite build" which is good
RUN npm run build

# Stage 2: Serve the built app with Nginx
FROM nginx:1.25-alpine

# Copy built assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Optional: Add a custom Nginx configuration for SPA routing
# Create an nginx.conf file in the same directory as Dockerfile for this to work
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for the web server
EXPOSE 80

# Start Nginx when the container launches
CMD ["nginx", "-g", "daemon off;"]
