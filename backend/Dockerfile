FROM node:20-slim

WORKDIR /usr

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "run", "dev"]
