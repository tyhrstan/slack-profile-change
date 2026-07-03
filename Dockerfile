FROM denoland/deno:alpine

WORKDIR /app

# Cache remote dependencies during build for faster startup.
COPY main.ts types.ts deno.json ./
RUN deno cache main.ts

# Copy runtime assets.
COPY images ./images

# Run the cron-driven profile updater.
CMD ["run", "--unstable-cron", "--unstable-kv", "-A", "main.ts"]
