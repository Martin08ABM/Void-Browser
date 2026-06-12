// Session preload (registered via session.registerPreloadScript) that runs at
// document-start in every frame of persist:main. On YouTube hosts it injects
// a main-world script that auto-skips video ads and hides ad UI elements via
// DOM manipulation only.
//
// Earlier versions of this script hooked JSON.parse / Response.prototype.json
// to strip ad data (adPlacements, playerAds, etc.) before YouTube's player
// processed it. That broke YouTube's internal player state: missing ad data
// caused its "something went wrong" recovery logic to reload the page roughly
// every 30s (the typical pre-roll ad length). DOM-only manipulation lets
// YouTube's player run normally — the ad briefly loads, then gets skipped or
// fast-forwarded — so the player's data layer is never in an unexpected state.

const host = location.hostname;
const isYouTube =
  host === "youtube.com" ||
  host.endsWith(".youtube.com") ||
  host === "youtube-nocookie.com" ||
  host.endsWith(".youtube-nocookie.com");

if (isYouTube) {
  // Self-contained vanilla function — gets stringified and injected into the
  // main world, so it must not reference anything outside its own scope.
  const payload = function () {
    // Tracks the speedup we applied so we can restore the user's own
    // mute/speed preferences once the ad ends — never just force-unmute.
    const fastForward = { active: false, muted: false, rate: 1 };

    // YouTube ignores plain .click() on the skip button on many builds
    // (it checks event.isTrusted). Dispatching a full pointer/mouse sequence
    // with `composed: true` (to cross the player's shadow DOM) gets through
    // on more versions; .click() is kept as an extra no-cost attempt.
    function dispatchClick(el: HTMLElement) {
      const opts: EventInit = { bubbles: true, cancelable: true, composed: true };
      el.dispatchEvent(new PointerEvent("pointerdown", opts));
      el.dispatchEvent(new MouseEvent("mousedown", opts));
      el.dispatchEvent(new PointerEvent("pointerup", opts));
      el.dispatchEvent(new MouseEvent("mouseup", opts));
      el.dispatchEvent(new MouseEvent("click", opts));
      el.click();
    }

    function tick() {
      const player = document.querySelector(".html5-video-player");
      if (player) {
        const skipBtn = player.querySelector(
          ".ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-container button"
        ) as HTMLElement | null;
        if (skipBtn) dispatchClick(skipBtn);

        const overlayClose = player.querySelector(".ytp-ad-overlay-close-button") as HTMLElement | null;
        if (overlayClose) dispatchClick(overlayClose);

        const video = player.querySelector("video");
        if (video) {
          const isAd = player.classList.contains("ad-showing") || player.classList.contains("ad-interrupting");

          if (isAd) {
            // Non-skippable ad: let it play but at 16x speed (max allowed) and
            // muted, so its `ended` event fires naturally and quickly instead
            // of abruptly seeking — abrupt seeks can confuse the ad SDK and
            // trigger YouTube's error-recovery (full page reload). Re-applied
            // every frame in case the ad SDK resets these properties.
            if (!fastForward.active) {
              fastForward.active = true;
              fastForward.muted = video.muted;
              fastForward.rate = video.playbackRate;
            }
            if (!video.muted) video.muted = true;
            if (video.playbackRate !== 16) video.playbackRate = 16;
          } else if (fastForward.active) {
            fastForward.active = false;
            video.muted = fastForward.muted;
            video.playbackRate = fastForward.rate;
          }
        }
      }
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    // Cosmetic: hide banner/companion ad slots that aren't covered by
    // EasyList, including their grid-cell wrapper so no empty gaps remain.
    const style = document.createElement("style");
    style.textContent =
      "ytd-rich-item-renderer:has(> ytd-ad-slot-renderer), " +
      "ytd-rich-item-renderer:has(> ytd-display-ad-renderer), " +
      "ytd-rich-item-renderer:has(> ytd-in-feed-ad-layout-renderer), " +
      "ytd-rich-section-renderer:has(> ytd-banner-promo-renderer), " +
      "ytd-rich-section-renderer:has(> ytd-statement-banner-renderer), " +
      "ytd-ad-slot-renderer, ytd-display-ad-renderer, ytd-in-feed-ad-layout-renderer, " +
      "ytd-promoted-sparkles-web-renderer, ytd-banner-promo-renderer, ytd-statement-banner-renderer, " +
      ".ytp-ad-overlay-container, .ytp-ad-message-container " +
      "{ display: none !important; }";
    document.documentElement.appendChild(style);

    console.log("[VoidShield] YouTube ad blocking active");
  };

  const code = "(" + payload.toString() + ")();";
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.async = false;
  script.textContent = code;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

export {};
