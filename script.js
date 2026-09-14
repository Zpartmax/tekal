const year = document.querySelector("#year");
const apiBaseMeta = document.querySelector('meta[name="tekal-license-api"]');
const apiBase = (apiBaseMeta?.content || "https://licencias.tekalpos.com").replace(/\/+$/, "");
const downloadLink = document.querySelector("[data-download-link]");
const androidLink = document.querySelector("[data-android-link]");
const releaseDownloadLink = document.querySelector("[data-release-download-link]");
const releaseStatus = document.querySelector("#release-status");
const latestUrl = `${apiBase}/api/updates/latest`;
// Mantener una descarga funcional aunque la consulta de la release falle por
// red, caché o CORS. Este valor debe coincidir con la release pública vigente.
const fallbackInstallerUrl = `${apiBase}/downloads/TEKALRestaurant_Setup_2.5.25.exe`;

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
    downloadLink.href = fallbackInstallerUrl;
  }
  
  if (releaseDownloadLink) {
    releaseDownloadLink.href = fallbackInstallerUrl;
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

const productTabs = [...document.querySelectorAll('[role="tab"]')];
function selectProductTab(tab) {
  productTabs.forEach(item => {
    const selected = item === tab;
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
    const panel = document.getElementById(item.getAttribute("aria-controls"));
    if (panel) panel.hidden = !selected;
  });
}
productTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectProductTab(tab));
  tab.addEventListener("keydown", event => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? productTabs.length - 1
      : (index + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) + productTabs.length) % productTabs.length;
    selectProductTab(productTabs[next]);
    productTabs[next].focus();
  });
});
