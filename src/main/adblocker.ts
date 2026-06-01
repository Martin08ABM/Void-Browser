import { session, ipcMain, BrowserWindow } from "electron";
import { FiltersEngine, Request } from "@cliqz/adblocker";

let engine: FiltersEngine | null = null;

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
  if (engine) return;

  try {
    engine = await FiltersEngine.fromPrebuiltAdsAndTracking(fetch);

    const filter = { urls: ["<all_urls>"] };

    session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
      if (!engine) {
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

      if (request.isMainFrame()) {
        callback({});
        return;
      }

      if (request.type === "other") {
        request.guessTypeOfRequest();
      }

      const { redirect, match } = engine.match(request);
      if (redirect) {
        callback({ redirectURL: redirect.dataUrl });
      } else if (match) {
        stats.adsBlocked++;
        broadcastStats();
        callback({ cancel: true });
      } else {
        callback({});
      }
    });

    console.log("[VoidShield] Adblocker initialized with prebuilt lists");
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
