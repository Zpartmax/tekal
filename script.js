const year = document.querySelector("#year");
const apiBaseMeta = document.querySelector('meta[name="tekal-license-api"]');
const apiBase = (apiBaseMeta?.content || "https://licencias.tekalpos.com").replace(/\/+$/, "");
const downloadLink = document.querySelector("[data-download-link]");
const androidLink = document.querySelector("[data-android-link]");
const releaseDownloadLink = document.querySelector("[data-release-download-link]");
const releaseStatus = document.querySelector("#release-status");
const latestUrl = `${apiBase}/api/updates/latest`;

if (year) {
  year.textContent = new Date().getFullYear();
}

if (androidLink) {
  androidLink.href = `${apiBase}/downloads/TEKALRestaurante_Android.apk`;
}

function resolveApiUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${apiBase}/${String(path).replace(/^\/+/, "")}`;
}

function setFallbackReleaseState() {
  if (releaseStatus) {
    releaseStatus.textContent = "La version publicada se consulta desde el servidor de licencias.";
  }

  if (downloadLink) {
    downloadLink.href = `${apiBase}/downloads/TEKALRestaurant_Setup_2.5.exe`;
  }
  
  if (releaseDownloadLink) {
    releaseDownloadLink.href = `${apiBase}/downloads/TEKALRestaurant_Setup_2.5.exe`;
  }
}

async function loadLatestRelease() {
  if (!releaseStatus && !downloadLink) {
    return;
  }

  try {
    const response = await fetch(latestUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const release = await response.json();
    if (!release?.version) {
      throw new Error("Respuesta invalida");
    }

    const downloadUrl = resolveApiUrl(release.downloadUrl || release.DownloadUrl || "");
    const publishedAt = release.publishedAt ? new Date(release.publishedAt) : null;
    const publishedText = publishedAt && !Number.isNaN(publishedAt.getTime())
      ? publishedAt.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
      : "reciente";

    if (releaseStatus) {
      releaseStatus.textContent = `Version ${release.version} disponible. Publicada el ${publishedText}.`;
    }

    if (downloadLink && downloadUrl) {
      downloadLink.href = downloadUrl;
    }

    if (releaseDownloadLink && downloadUrl) {
      releaseDownloadLink.href = downloadUrl;
    }
  } catch {
    setFallbackReleaseState();
  }
}

loadLatestRelease();
