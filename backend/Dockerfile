# Build stage
FROM node:20-alpine as build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Lambda runtime image
FROM public.ecr.aws/lambda/nodejs:20
WORKDIR /var/task
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
# Lambda entry
CMD ["dist/handler.handler"]
