import "dotenv/config";
import { scheduleNightlySync } from "../src/server/queue/queue";

scheduleNightlySync()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("Nightly sync scheduled at 02:00 UTC");
    process.exit(0);
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
