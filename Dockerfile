# Use an official Node.js runtime as a parent image
FROM node:14

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
# Assuming your code is in a folder named 'server', change this to 'server'
# If your code is at the root, keep it as '.'
COPY . .

# Expose the port the app runs on
# Set this to 3000 or whatever your application actually listens on
EXPOSE 3000

# Start the application
# Add the folder name if necessary (e.g., npm start in ./server)
CMD ["npm", "start"]
