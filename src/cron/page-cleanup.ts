import cron from "node-cron";
import { cleanupExpiredPages } from "#services/page";

export const startPageCleanupCron = (): void => {
  // Run cleanup every 3 minutes
  const expression = "*/3 * * * *";

  cron.schedule(expression, async () => {
    try {
      console.log("[cron] Running page cleanup...");
      await cleanupExpiredPages();
      console.log("[cron] Page cleanup completed");
    } catch (err: any) {
      console.error("[cron] Failed to cleanup expired pages:", err?.message || err);
    }
  });

  console.log(`[cron] Scheduled page cleanup: ${expression} (every 3 minutes)`);
};
