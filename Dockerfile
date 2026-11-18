FROM node:22-alpine

WORKDIR /usr/src/app

COPY package.json index.js index.html ./

ENV NODE_ENV=production

EXPOSE 10000

USER node

CMD ["node", "index.js"]
