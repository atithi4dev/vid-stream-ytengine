FROM node:18-alpine

WORKDIR /app

# Install ffmpeg + ffprobe
RUN apk add --no-cache ffmpeg

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "start"]