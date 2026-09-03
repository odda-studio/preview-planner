FROM node:24.13.1-alpine AS build
WORKDIR /app/src
COPY package*.json ./
RUN npm ci
COPY . ./
RUN npm run build:library
RUN npm run build

FROM node:24.13.1-alpine
WORKDIR /usr/app
COPY --from=build /app/src/dist/base-cms ./
CMD node server/server.mjs
EXPOSE 4000