import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "@trigger.dev/sdk";

const defaultArchivePath = path.resolve(
  process.cwd(),
  "node_modules/@browserbasehq/stagehand/dist/assets/stagehand-extension.zip"
);
if (existsSync(defaultArchivePath)) {
  process.env.STAGEHAND_EXTENSION_ARCHIVE_PATH = defaultArchivePath;
}

export default defineConfig({
  project: "proj_tjpkiwuryaugknegcmfk",
  runtime: "node",
  logLevel: "log",
  // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
  // You can override this on an individual task.
  // See https://trigger.dev/docs/runs/max-duration
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["features/tasks"],
  build: {
    external: ["@browserbasehq/stagehand"],
  },
});
