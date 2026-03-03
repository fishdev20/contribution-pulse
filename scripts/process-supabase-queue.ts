import "dotenv/config";
import { getQueueBackend } from "../src/server/queue/queue";
import { processSupabaseSyncQueue } from "../src/server/queue/supabase-processor";

async function main() {
  if (getQueueBackend() !== "supabase") {
    // eslint-disable-next-line no-console
    console.log("SYNC_QUEUE_BACKEND is not supabase; nothing to process.");
    return;
  }

  const result = await processSupabaseSyncQueue(10);
  // eslint-disable-next-line no-console
  console.log("Supabase queue processed", result);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
