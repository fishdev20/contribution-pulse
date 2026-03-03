import "dotenv/config";
import { worker } from "../src/server/queue/worker";

// eslint-disable-next-line no-console
console.log("ProofOfWork worker started");

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});
