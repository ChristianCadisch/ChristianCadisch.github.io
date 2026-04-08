const params = new URLSearchParams(window.location.search);
const metadataApiBaseUrl = "https://proud-cloud-879dcinema-sb-metadata-api.serafin-065.workers.dev";
const defaultVideoUrl = "https://videodelivery.net/98dd81bafb69d8abf94c5f652e78f5c9/manifest/video.m3u8";
const defaultMetadata = {
  title: "A cinematic city moment",
  kicker: "Cinema SB pick",
  meta: "Cinema SB Preview",
  description: "Open the app to see the full route, save the place, and start the walk.",
};

const state = {
  appUrl: params.get("app") || "https://exampleapp.com",
  videoUrl: "",
  uid: "",
  title: params.get("title") || defaultMetadata.title,
  kicker: params.get("kicker") || defaultMetadata.kicker,
  meta: params.get("meta") || defaultMetadata.meta,
  description: params.get("description") || defaultMetadata.description,
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

void initialize();

async function initialize() {
  const requestedVideo = resolveRequestedVideo();
  state.uid = requestedVideo.uid;
  state.videoUrl = requestedVideo.videoUrl;

  const metadata = await resolveMetadata(state.uid);
  state.title = metadata.title;
  state.meta = metadata.meta;
  state.description = metadata.description;

  document.getElementById("preview-title").textContent = state.title;
  document.getElementById("preview-kicker").textContent = state.kicker;
  document.getElementById("preview-meta").textContent = state.meta;
  document.getElementById("preview-description").textContent = state.description;

  setupVideo();
}

function normalizeString(value) {
  return (value || "").trim();
}

function extractCloudflareUid(url) {
  const raw = normalizeString(url);
  if (!raw) {
    return "";
  }

  try {
    const parsed = new URL(raw);
    if (!parsed.hostname.includes("videodelivery.net")) {
      return "";
    }
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[0] || "";
  } catch {
    return /^[a-z0-9]{32}$/i.test(raw) ? raw : "";
  }
}

function buildCloudflareVideoUrl(uid) {
  return `https://videodelivery.net/${uid}/manifest/video.m3u8`;
}

function resolveRequestedVideo() {
  const sharedUid = normalizeString(params.get("v"));
  if (sharedUid) {
    return {
      uid: sharedUid,
      videoUrl: buildCloudflareVideoUrl(sharedUid),
    };
  }

  const queryVideo = normalizeString(params.get("video"));
  if (queryVideo) {
    return {
      uid: extractCloudflareUid(queryVideo),
      videoUrl: queryVideo,
    };
  }

  return {
    uid: extractCloudflareUid(defaultVideoUrl),
    videoUrl: defaultVideoUrl,
  };
}

async function resolveMetadata(uid) {
  const fetched = await fetchLocationMetadata(uid);
  if (fetched) {
    return fetched;
  }

  return {
    title: normalizeString(params.get("title")) || defaultMetadata.title,
    meta: normalizeString(params.get("meta")) || defaultMetadata.meta,
    description: normalizeString(params.get("description")) || defaultMetadata.description,
  };
}

async function fetchLocationMetadata(uid) {
  if (!uid) {
    return null;
  }

  for (const path of ["/api/spots", "/locations"]) {
    try {
      const response = await fetch(`${metadataApiBaseUrl}${path}`, { mode: "cors" });
      if (!response.ok) {
        continue;
      }

      const payload = await response.json();
      const locations = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
      const match = locations.find((location) => locationMatchesUid(location, uid));
      if (match) {
        return {
          title: normalizeString(match.title) || defaultMetadata.title,
          meta: buildMetaLine(match),
          description: buildDescription(match),
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

function locationMatchesUid(location, uid) {
  const candidates = [
    location?.stream_uid,
    location?.streamUid,
    location?.stream_hls_url,
    location?.streamHlsUrl,
    location?.video_url,
    location?.videoUrl,
  ];

  return candidates.some((value) => extractCloudflareUid(value) === uid);
}

function buildMetaLine(location) {
  const category =
    location?.location_categories?.[0]?.categories?.label ||
    location?.locationCategories?.[0]?.categories?.label ||
    "";

  return normalizeString(category) || "New York City";
}

function buildDescription(location) {
  return (
    normalizeString(location?.long_desc) ||
    normalizeString(location?.longDesc) ||
    normalizeString(location?.short_desc) ||
    normalizeString(location?.shortDesc) ||
    defaultMetadata.description
  );
}

function setupVideo() {
  if (!state.videoUrl) {
    showFallback();
    return;
  }

  if (state.uid) {
    setupCloudflarePreview(state.uid);
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
  if (state.uid) {
    iframeEl.src = buildCloudflarePlayerUrl(state.uid, {
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

function buildCloudflarePlayerUrl(uid, nextParams) {
  const url = new URL(`https://iframe.videodelivery.net/${uid}`);
  Object.entries(nextParams).forEach(([key, value]) => {
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
