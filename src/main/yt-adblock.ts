import { session } from "electron";
import path from "node:path";
import { getYtAdblockEnabled, setYtAdblockEnabled } from "./filter-lists";

const PRELOAD_ID = "voidshield-yt-adblock";

function getPreloadPath(): string {
  return path.join(__dirname, "yt-adblock.js");
}

function register(): void {
  try {
    session.fromPartition("persist:main").registerPreloadScript({
      type: "frame",
      id: PRELOAD_ID,
      filePath: getPreloadPath(),
    });
    console.log("[VoidShield] YouTube ad blocking preload registered");
  } catch (err) {
    console.error("[VoidShield] Failed to register YouTube ad blocking preload:", err);
  }
}

function unregister(): void {
  try {
    session.fromPartition("persist:main").unregisterPreloadScript(PRELOAD_ID);
    console.log("[VoidShield] YouTube ad blocking preload unregistered");
  } catch (err) {
    console.error("[VoidShield] Failed to unregister YouTube ad blocking preload:", err);
  }
}

/** Idempotent: registers or unregisters the preload to match the persisted setting. */
export function applyYtAdblock(): void {
  if (getYtAdblockEnabled()) {
    register();
  } else {
    unregister();
  }
}

export function setYtAdblock(enabled: boolean): boolean {
  setYtAdblockEnabled(enabled);
  applyYtAdblock();
  return enabled;
}

export function isYtAdblockEnabled(): boolean {
  return getYtAdblockEnabled();
}
