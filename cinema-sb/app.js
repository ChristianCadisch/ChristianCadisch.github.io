const params = new URLSearchParams(window.location.search);

const state = {
  appUrl: params.get("app") || "https://exampleapp.com",
  videoUrl: params.get("video") || "",
  title: params.get("title") || "A cinematic city moment",
  kicker: params.get("kicker") || "Cinema SB pick",
  meta: params.get("meta") || "Lower Manhattan",
  description:
    params.get("description") ||
    "Open the app to see the full route, save the place, and start the walk.",
  poster: params.get("poster") || "",
};

const videoEl = document.getElementById("preview-video");
const iframeEl = document.getElementById("preview-iframe");
const playerOverlayEl = document.getElementById("player-overlay");
const fallbackEl = document.getElementById("video-fallback");
const modalEl = document.getElementById("download-modal");
const downloadLinkEl = document.getElementById("download-link");
const dismissModalEl = document.getElementById("dismiss-modal");
const playButtonEl = document.getElementById("play-video-button");

document.getElementById("preview-title").textContent = state.title;
document.getElementById("preview-kicker").textContent = state.kicker;
document.getElementById("preview-meta").textContent = state.meta;
document.getElementById("preview-description").textContent = state.description;
downloadLinkEl.href = state.appUrl;

for (const element of document.querySelectorAll(".app-interaction")) {
  element.addEventListener("click", (event) => {
    event.preventDefault();
    openDownloadPrompt();
  });
}

dismissModalEl.addEventListener("click", () => {
  closeDownloadPrompt();
});

playButtonEl.addEventListener("click", () => {
  handleManualPlayback();
});

modalEl.addEventListener("click", (event) => {
  if (event.target === modalEl) {
    closeDownloadPrompt();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDownloadPrompt();
  }
});

setupVideo();

function setupVideo() {
  if (!state.videoUrl) {
    showFallback();
    return;
  }

  const cloudflareUid = extractCloudflareUid(state.videoUrl);
  if (cloudflareUid) {
    setupCloudflarePreview(cloudflareUid);
    return;
  }

  videoEl.muted = true;
  videoEl.defaultMuted = true;
  videoEl.autoplay = true;
  videoEl.playsInline = true;
  videoEl.setAttribute("muted", "");
  videoEl.setAttribute("playsinline", "");
  videoEl.setAttribute("webkit-playsinline", "");

  if (state.poster) {
    videoEl.poster = state.poster;
  }

  const isHls = /\.m3u8($|\?)/i.test(state.videoUrl);

  if (isHls && videoEl.canPlayType("application/vnd.apple.mpegurl")) {
    videoEl.src = state.videoUrl;
    videoEl.addEventListener(
      "loadedmetadata",
      () => {
        attemptPlayback();
      },
      { once: true }
    );
    videoEl.addEventListener(
      "error",
      () => {
        showFallback();
      },
      { once: true }
    );
    return;
  }

  if (isHls && window.Hls && window.Hls.isSupported()) {
    const hls = new window.Hls({
      maxBufferLength: 30,
      enableWorker: true,
    });

    hls.loadSource(state.videoUrl);
    hls.attachMedia(videoEl);
    hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
      attemptPlayback();
    });
    hls.on(window.Hls.Events.ERROR, (_, data) => {
      if (data?.fatal) {
        showFallback();
      }
    });
    return;
  }

  videoEl.src = state.videoUrl;
  videoEl.addEventListener(
    "loadeddata",
    () => {
      attemptPlayback();
    },
    { once: true }
  );
  videoEl.addEventListener(
    "error",
    () => {
      showFallback();
    },
    { once: true }
  );
}

function showFallback() {
  fallbackEl.hidden = false;
  videoEl.hidden = true;
  iframeEl.hidden = true;
  playerOverlayEl.hidden = true;
}

function attemptPlayback() {
  const playAttempt = videoEl.play();
  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch(() => {
      videoEl.controls = true;
    });
  }
}

function extractCloudflareUid(url) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("videodelivery.net")) {
      return "";
    }
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[0] || "";
  } catch {
    return "";
  }
}

function setupCloudflarePreview(uid) {
  iframeEl.src = buildCloudflarePlayerUrl(uid, {
    autoplay: "false",
    muted: "true",
    controls: "false",
    loop: "false",
  });
  iframeEl.hidden = false;
  videoEl.hidden = true;
  fallbackEl.hidden = true;
  playerOverlayEl.hidden = false;
}

function handleManualPlayback() {
  const cloudflareUid = extractCloudflareUid(state.videoUrl);
  if (cloudflareUid) {
    iframeEl.src = buildCloudflarePlayerUrl(cloudflareUid, {
      autoplay: "true",
      muted: "true",
      controls: "true",
      loop: "false",
    });
    iframeEl.hidden = false;
    fallbackEl.hidden = true;
    videoEl.hidden = true;
    playerOverlayEl.hidden = true;
    return;
  }

  if (!state.videoUrl) {
    return;
  }

  fallbackEl.hidden = true;
  videoEl.hidden = false;
  videoEl.controls = true;
  videoEl.currentTime = 0;
  playerOverlayEl.hidden = true;
  attemptPlayback();
}

function buildCloudflarePlayerUrl(uid, params) {
  const url = new URL(`https://iframe.videodelivery.net/${uid}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

function openDownloadPrompt() {
  modalEl.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeDownloadPrompt() {
  modalEl.hidden = true;
  document.body.style.overflow = "";
}
