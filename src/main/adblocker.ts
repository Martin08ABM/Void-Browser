import { session, ipcMain, BrowserWindow, app } from "electron";
import { ElectronBlocker, fromElectronDetails } from "@cliqz/adblocker-electron";
import { parse } from "tldts-experimental";
import fs from "node:fs";
import path from "node:path";
import { getDNTEnabled, getCookieConfig, getUserAgentHeaders } from "./privacy";
import {
  loadListsConfig,
  getListsConfig,
  addCustomListUrl,
  removeCustomListUrl,
  setLastUpdated,
} from "./filter-lists";
import { applyYtAdblock, setYtAdblock, isYtAdblockEnabled } from "./yt-adblock";

let blocker: ElectronBlocker | null = null;
let isUpdating = false;

const stats = {
  adsBlocked: 0,
  trackersBlocked: 0,
};

const CACHE_PATH = path.join(app.getPath("userData"), "adblocker-engine-v2.bin");

function broadcastStats() {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
      win.webContents.send("adblock:stats-update", { ...stats });
    }
  });
}

function broadcastStatus() {
  const status = getAdblockStatus();
  BrowserWindow.getAllWindows().forEach((win) => {
    if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
      win.webContents.send("adblock:status-update", status);
    }
  });
}

function isThirdParty(url: string, referrer: string): boolean {
  try {
    const requestDomain = new URL(url).hostname;
    const referrerDomain = new URL(referrer).hostname;
    return requestDomain !== referrerDomain;
  } catch {
    return false;
  }
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.text();
}

/**
 * Manual network blocking: cancel requests instead of redirecting.
 * YouTube detects redirects to data: URLs and aborts loading.
 */
function registerNetworkBlocking(ses: Electron.Session, engine: ElectronBlocker) {
  ses.webRequest.onBeforeRequest({ urls: ["<all_urls>"] }, (details, callback) => {
    const request = fromElectronDetails(details);

    if (request.isMainFrame()) {
      callback({});
      return;
    }

    const { match, filter } = engine.match(request);
    if (match) {
      const filterText = filter?.toString().toLowerCase() || "";
      if (
        filterText.includes("track") ||
        filterText.includes("analytic") ||
        filterText.includes("metric")
      ) {
        stats.trackersBlocked++;
      } else {
        stats.adsBlocked++;
      }
      broadcastStats();
      callback({ cancel: true });
      return;
    }

    callback({});
  });
}

/**
 * Manual CSP injection: only inject CSP for main/sub frames.
 */
function registerCSP(ses: Electron.Session, engine: ElectronBlocker) {
  ses.webRequest.onHeadersReceived({ urls: ["<all_urls>"] }, (details, callback) => {
    if (details.resourceType === "mainFrame" || details.resourceType === "subFrame") {
      const request = fromElectronDetails(details);
      const rawCSP = engine.getCSPDirectives(request);
      if (rawCSP !== undefined) {
        const responseHeaders: Record<string, string | string[]> = { ...details.responseHeaders };
        const policies = rawCSP.split(";").map((csp) => csp.trim());
        for (const [name, values] of Object.entries(responseHeaders)) {
          if (name.toLowerCase() === "content-security-policy") {
            policies.push(...(Array.isArray(values) ? values : [values]));
            delete responseHeaders[name];
          }
        }
        responseHeaders["content-security-policy"] = [policies.join(";")];
        callback({ responseHeaders });
        return;
      }
    }
    callback({});
  });
}

function registerPrivacyListeners(ses: Electron.Session) {
  ses.webRequest.onBeforeSendHeaders({ urls: ["<all_urls>"] }, (details, callback) => {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(details.requestHeaders)) {
      if (typeof value === "string") {
        headers[key] = value;
      } else if (Array.isArray(value)) {
        headers[key] = value.join(", ");
      }
    }

    const dnt = getDNTEnabled();
    const cookieCfg = getCookieConfig();

    if (dnt) {
      headers["DNT"] = "1";
      headers["Sec-GPC"] = "1";
    }

    // User-Agent spoofing: rewrite UA and client hints to match the configured identity
    const uaH = getUserAgentHeaders();
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === "user-agent" || key.toLowerCase().startsWith("sec-ch-ua")) {
        delete headers[key];
      }
    }
    headers["User-Agent"] = uaH.ua;
    if (uaH.secChUa) {
      headers["sec-ch-ua"] = uaH.secChUa;
      headers["sec-ch-ua-mobile"] = uaH.mobile ? "?1" : "?0";
      headers["sec-ch-ua-platform"] = `"${uaH.platform}"`;
    }

    if (
      cookieCfg.blockThirdParty &&
      details.resourceType !== "mainFrame" &&
      details.referrer
    ) {
      if (isThirdParty(details.url, details.referrer)) {
        delete headers["Cookie"];
      }
    }

    callback({ requestHeaders: headers });
  });
}

function enableOnSessions(engine: ElectronBlocker): void {
  try {
    const webviewSession = session.fromPartition("persist:main");

    // 1. Enable cosmetic filters + IPC (preload script) via adblocker.
    //    loadNetworkFilters is left TRUE so engine.match() works for stats.
    //    The native onBeforeRequest handler is immediately overridden below
    //    by registerNetworkBlocking to avoid YouTube ERR_ABORTED redirects.
    engine.enableBlockingInSession(webviewSession);

    // Override IPC handlers to apply cosmetic filters WITHOUT injecting
    // JavaScript scriptlets. Scriptlets cause YouTube to abort loading
    // (ERR_ABORTED) because they modify core page behavior too aggressively.


    ipcMain.removeAllListeners("get-cosmetic-filters-first");
    ipcMain.on("get-cosmetic-filters-first", (event, url: string) => {
      const parsed = parse(url);
      const hostname = parsed.hostname || "";
      const domain = parsed.domain || "";
      const { active, styles, extended } = engine.getCosmeticsFilters({
        domain,
        hostname,
        url,
        getBaseRules: true,
        getInjectionRules: false,
        getExtendedRules: true,
        getRulesFromHostname: true,
        getRulesFromDOM: false,
        callerContext: {
          frameId: (event as any).frameId,
          processId: (event as any).processId,
        },
      });
      if (active === false) {
        event.returnValue = null;
        return;
      }
      engine.injectStyles(event.sender, styles);
      event.sender.send("get-cosmetic-filters-response", {
        active,
        extended,
        styles: "",
      });
      event.returnValue = null;
    });

    ipcMain.removeAllListeners("get-cosmetic-filters");
    ipcMain.on("get-cosmetic-filters", (event, url: string, msg: any) => {
      const parsed = parse(url);
      const hostname = parsed.hostname || "";
      const domain = parsed.domain || "";
      const { active, styles, extended } = engine.getCosmeticsFilters({
        domain,
        hostname,
        url,
        classes: msg?.classes,
        hrefs: msg?.hrefs,
        ids: msg?.ids,
        getBaseRules: false,
        getInjectionRules: false,
        getExtendedRules: false,
        getRulesFromHostname: false,
        getRulesFromDOM: true,
        callerContext: {
          frameId: (event as any).frameId,
          processId: (event as any).processId,
          lifecycle: msg?.lifecycle,
        },
      });
      if (active === false) {
        return;
      }
      engine.injectStyles(event.sender, styles);
      event.sender.send("get-cosmetic-filters-response", {
        active,
        extended,
        styles: "",
      });
    });

    ipcMain.removeAllListeners("is-mutation-observer-enabled");
    ipcMain.on("is-mutation-observer-enabled", (event) => {
      event.returnValue = true;
    });

    // 2. Manual network blocking (cancel-only, no redirects)
    registerNetworkBlocking(webviewSession, engine);

    // 3. Manual CSP injection
    registerCSP(webviewSession, engine);

    // 4. DNT + cookie blocking
    registerPrivacyListeners(webviewSession);

    console.log("[VoidShield] Blocking enabled for webview session (network + cosmetic CSS, no scriptlets)");
  } catch (err) {
    console.error("[VoidShield] Failed to enable blocking on webview session:", err);
  }
}

async function buildBlocker(options?: { force?: boolean }): Promise<ElectronBlocker> {
  const { force = false } = options ?? {};

  if (!force) {
    try {
      if (fs.existsSync(CACHE_PATH)) {
        const buffer = fs.readFileSync(CACHE_PATH);
        const engine = ElectronBlocker.deserialize(
          new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
        );
        console.log("[VoidShield] Loaded engine from cache");
        return engine;
      }
    } catch (err) {
      console.warn("[VoidShield] Cache corrupt or unreadable, rebuilding:", err);
    }
  }

  console.log("[VoidShield] Building blocker from prebuilt full lists...");

  const engine = await ElectronBlocker.fromPrebuiltFull(fetch);
  console.log("[VoidShield] Prebuilt engine loaded");

  // Apply custom lists
  const customUrls = getListsConfig().customUrls;
  for (const url of customUrls) {
    try {
      const text = await fetchText(url);
      engine.updateFromDiff({ added: [text] });
      console.log("[VoidShield] Applied custom list:", url);
    } catch (err) {
      console.warn(`[VoidShield] Failed to apply custom list ${url}:`, err);
    }
  }

  try {
    const serialized = engine.serialize();
    fs.writeFileSync(
      CACHE_PATH,
      Buffer.from(serialized.buffer, serialized.byteOffset, serialized.byteLength)
    );
    console.log("[VoidShield] Engine serialized to cache, size:", serialized.length);
  } catch (err) {
    console.warn("[VoidShield] Failed to write cache:", err);
  }

  console.log("[VoidShield] Blocker built successfully");
  return engine;
}

export async function initializeAdblocker(): Promise<void> {
  if (blocker) return;
  loadListsConfig();

  try {
    applyYtAdblock();
  } catch (err) {
    console.error("[VoidShield] Failed to apply YouTube ad blocking:", err);
  }

  try {
    const engine = await buildBlocker();
    blocker = engine;
    enableOnSessions(blocker);
    console.log("[VoidShield] Initialized and enabled");
  } catch (err) {
    console.error("[VoidShield] Failed to initialize adblocker:", err);
  }
}

export async function refreshBlocker(options?: { force?: boolean }): Promise<boolean> {
  if (isUpdating) return false;
  isUpdating = true;
  broadcastStatus();

  try {
    if (blocker) {
      try {
        const webviewSession = session.fromPartition("persist:main");
        blocker.disableBlockingInSession(webviewSession);
      } catch (err) {
        console.warn("[VoidShield] Failed to disable old blocker:", err);
      }
    }

    if (options?.force) {
      try {
        fs.unlinkSync(CACHE_PATH);
      } catch {
        // ignore
      }
    }

    const engine = await buildBlocker({ force: options?.force });
    blocker = engine;
    enableOnSessions(blocker);
    setLastUpdated(Date.now());
    console.log("[VoidShield] Refreshed successfully");
    return true;
  } catch (err) {
    console.error("[VoidShield] Refresh failed:", err);
    return false;
  } finally {
    isUpdating = false;
    broadcastStatus();
  }
}

function getAdblockStatus() {
  const cfg = getListsConfig();
  return {
    adsBlocked: stats.adsBlocked,
    trackersBlocked: stats.trackersBlocked,
    lastUpdated: cfg.lastUpdated,
    listCount: 14 + cfg.customUrls.length,
    customLists: cfg.customUrls,
    isUpdating,
    ytAdblockEnabled: isYtAdblockEnabled(),
  };
}

// ─── IPC ───
ipcMain.handle("adblock:get-stats", () => ({ ...stats }));
ipcMain.handle("adblock:reset-stats", () => {
  stats.adsBlocked = 0;
  stats.trackersBlocked = 0;
  return { ...stats };
});

ipcMain.handle("adblock:get-status", () => getAdblockStatus());

ipcMain.handle("adblock:set-yt-adblock", (_, enabled: boolean) => {
  const result = setYtAdblock(Boolean(enabled));
  broadcastStatus();
  return result;
});

ipcMain.handle("adblock:update-now", async () => {
  return refreshBlocker({ force: true });
});

ipcMain.handle("adblock:get-custom-lists", () => {
  return getListsConfig().customUrls;
});

ipcMain.handle("adblock:add-custom-list", async (_, url: string) => {
  const added = addCustomListUrl(url);
  if (added) {
    await refreshBlocker({ force: true });
  }
  return added;
});

ipcMain.handle("adblock:remove-custom-list", async (_, url: string) => {
  const removed = removeCustomListUrl(url);
  if (removed) {
    await refreshBlocker({ force: true });
  }
  return removed;
});
