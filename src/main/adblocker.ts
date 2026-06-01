import { session, ipcMain, BrowserWindow } from "electron";
import { ElectronBlocker, Request } from "@cliqz/adblocker-electron";

let blocker: ElectronBlocker | null = null;

const stats = {
  adsBlocked: 0,
  trackersBlocked: 0,
};

function broadcastStats() {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send("adblock:stats-update", { ...stats });
  });
}

export async function initializeAdblocker(): Promise<void> {
  if (blocker) return;

  try {
    // fromPrebuiltFull incluye: ads + tracking + annoyances + cookie banners
    blocker = await ElectronBlocker.fromPrebuiltFull(fetch);

    // Envolvemos onBeforeRequest para contar bloqueos antes de que el blocker
    // registre sus listeners en la sesión.
    const originalOnBeforeRequest = blocker.onBeforeRequest.bind(blocker);
    blocker.onBeforeRequest = (details, callback) => {
      if (!blocker) {
        callback({});
        return;
      }

      const request = Request.fromRawDetails({
        requestId: String(details.id),
        url: details.url,
        type: (details.resourceType || "other") as any,
        sourceUrl: details.referrer,
        tabId: details.webContentsId,
      });

      if (!request.isMainFrame()) {
        const { match } = blocker.match(request);
        if (match) {
          stats.adsBlocked++;
          broadcastStats();
        }
      }

      originalOnBeforeRequest(details, callback);
    };

    blocker.enableBlockingInSession(session.defaultSession);
    console.log("[VoidShield] Adblocker initialized with full filter lists (ads + tracking + annoyances)");
  } catch (err) {
    console.error("[VoidShield] Failed to initialize adblocker:", err);
  }
}

ipcMain.handle("adblock:get-stats", () => ({ ...stats }));
ipcMain.handle("adblock:reset-stats", () => {
  stats.adsBlocked = 0;
  stats.trackersBlocked = 0;
  return { ...stats };
});
