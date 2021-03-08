FROM node:15.11.0
ENV NODE_ENV=test
WORKDIR /server
# Copy
COPY . .
RUN npm install
RUN npx prisma generate
CMD ["./node_modules/ts-node/dist/bin.js", "src/index.ts"]
