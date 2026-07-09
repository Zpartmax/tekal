const year = document.querySelector("#year");
const apiBaseMeta = document.querySelector('meta[name="tekal-license-api"]');
const apiBase = (apiBaseMeta?.content || "https://licencias.tekalpos.com").replace(/\/+$/, "");
const downloadLink = document.querySelector("[data-download-link]");
const androidLink = document.querySelector("[data-android-link]");
const releaseLink = document.querySelector("[data-release-link]");
const checksumNode = document.querySelector("#release-checksum");
const copyChecksumButton = document.querySelector("[data-copy-checksum]");
const releaseStatus = document.querySelector("#release-status");
const latestUrl = releaseStatus?.dataset.latestUrl || `${apiBase}/api/updates/latest`;

if (year) {
  year.textContent = new Date().getFullYear();
}

if (releaseLink) {
  releaseLink.href = latestUrl;
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

if (releaseStatus) {
  if (latestUrl) {
    fetch(latestUrl, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
      })
      .then((release) => {
        if (!release || !release.version) {
          throw new Error("Respuesta invalida");
        }

        const sha256 = release.sha256 || release.Sha256 || "";
        const downloadUrl = resolveApiUrl(release.downloadUrl || release.DownloadUrl || "");
        const publishedAt = release.publishedAt ? new Date(release.publishedAt) : null;
        const publishedText = publishedAt && !Number.isNaN(publishedAt.getTime())
          ? `Publicado el ${publishedAt.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}`
          : "Publicado recientemente";

        releaseStatus.textContent = `Version ${release.version} disponible. ${publishedText}.`;
        if (downloadLink && downloadUrl) {
          downloadLink.href = downloadUrl;
        }
        if (checksumNode) {
          checksumNode.textContent = sha256 || "Checksum no disponible.";
        }

        if (copyChecksumButton) {
          copyChecksumButton.disabled = !sha256;
          copyChecksumButton.addEventListener("click", async () => {
            if (!sha256) return;

            try {
              await navigator.clipboard.writeText(sha256);
              copyChecksumButton.textContent = "Copiado";
              setTimeout(() => {
                copyChecksumButton.textContent = "Copiar checksum";
              }, 1200);
            } catch {
              copyChecksumButton.textContent = "No se pudo copiar";
              setTimeout(() => {
                copyChecksumButton.textContent = "Copiar checksum";
              }, 1200);
            }
          }, { once: true });
        }
      })
      .catch(() => {
        releaseStatus.textContent = "La version publicada se consulta desde el servidor de licencias.";
        if (downloadLink) {
          downloadLink.href = `${apiBase}/downloads/TEKALRestaurant_Setup_2.2.exe`;
        }
        if (checksumNode) {
          checksumNode.textContent = "Checksum no disponible.";
        }
        if (copyChecksumButton) {
          copyChecksumButton.disabled = true;
        }
      });
  }
}
