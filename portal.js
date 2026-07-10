const yearNode = document.querySelector("#year");
const apiBaseMeta = document.querySelector('meta[name="tekal-license-api"]');
const apiBase = (apiBaseMeta?.content || "https://licencias.tekalpos.com").replace(/\/+$/, "");
const loginGate = document.querySelector("#portalLoginGate");
const portalShell = document.querySelector("#portalShell");
const loginForm = document.querySelector("#portalLoginForm");
const loginStatus = document.querySelector("#portalLoginStatus");

const state = {
  token: new URLSearchParams(window.location.search).get("token") || ""
};

if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}

function setLoginStatus(message, isError = false) {
  if (!loginStatus) return;
  loginStatus.hidden = !message;
  loginStatus.textContent = message;
  loginStatus.style.color = isError ? "#b42318" : "";
}

function formatDate(value) {
  if (!value) return "N/D";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/D";
  return date.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" });
}

function formatDateTime(value) {
  if (!value) return "N/D";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/D";
  return date.toLocaleString("es-MX", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatMoney(value, currency = "USD") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setAuthenticated(isAuthenticated) {
  if (loginGate) loginGate.hidden = isAuthenticated;
  if (portalShell) portalShell.hidden = !isAuthenticated;
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.json();
}

function renderPortal(data) {
  document.querySelector("#portalCustomerName").textContent = data.customerName || "Cliente TEKAL";
  document.querySelector("#portalIntro").textContent = `Licencia ${data.licenseKey} · estado ${data.status}.`;

  const latestRelease = data.latestRelease;
  const releaseLink = latestRelease?.downloadUrl ? `${apiBase}${latestRelease.downloadUrl}` : "#";
  const androidLink = data.androidDownloadUrl ? `${apiBase}${data.androidDownloadUrl}` : "#";

  document.querySelector("#portalDownloadButton").href = releaseLink;
  document.querySelector("#portalAndroidButton").href = androidLink;
  document.querySelector("#portalSupportButton").href = data.supportWhatsAppUrl || "#";
  document.querySelector("#portalReleaseLink").href = releaseLink;
  document.querySelector("#portalAndroidLink").href = androidLink;
  document.querySelector("#portalWhatsAppLink").href = data.supportWhatsAppUrl || "#";
  document.querySelector("#portalSupportWhatsAppCta").href = data.supportWhatsAppUrl || "#";
  document.querySelector("#portalSupportEmail").textContent = data.supportEmail || "N/D";
  document.querySelector("#portalSupportPhone").textContent = data.supportPhone || "N/D";
  document.querySelector("#portalSupportMeta").textContent = `Correo: ${data.supportEmail || "N/D"} · Teléfono/WhatsApp: ${data.supportPhone || "N/D"}`;

  document.querySelector("#portalReleaseText").textContent = latestRelease
    ? `Versión ${latestRelease.version} publicada el ${formatDate(latestRelease.publishedAt)}.`
    : "No hay una release publicada en este momento.";

  const summary = [
    ["Correo", data.customerEmail || "Sin correo"],
    ["Licencia", data.licenseKey],
    ["Updates hasta", formatDate(data.updatesUntil)],
    ["Días restantes", data.daysToUpdatesExpire ?? "N/D"],
    ["Equipos activos", `${data.deviceCount}/${data.maxTerminals}`],
    ["Última versión", data.lastVersion || "N/D"]
  ];

  document.querySelector("#portalSummary").innerHTML = summary.map(([label, value]) => `
    <article>
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
    </article>
  `).join("");

  const licenseGrid = [
    ["Cliente", data.customerName],
    ["Correo", data.customerEmail || "Sin correo"],
    ["Estado", data.status],
    ["Fuente", data.source],
    ["Fecha de compra", formatDate(data.createdAt)],
    ["Vigencia de updates", formatDate(data.updatesUntil)]
  ];

  document.querySelector("#portalLicenseGrid").innerHTML = licenseGrid.map(([label, value]) => `
    <article class="route-card">
      <strong>${escapeHtml(label)}</strong>
      <p>${escapeHtml(value)}</p>
    </article>
  `).join("");

  document.querySelector("#portalDevices").innerHTML = (data.devices || []).length
    ? data.devices.map(device => `
      <article class="portal-list-item">
        <strong>${escapeHtml(device.deviceName || "Equipo")}</strong>
        <span>${escapeHtml(device.machineId)}</span>
        <div class="metric-meta">Versión ${escapeHtml(device.lastVersion || "N/D")} · IP ${escapeHtml(device.lastIp || "N/D")} · ${formatDateTime(device.lastSeenAt)}</div>
      </article>
    `).join("")
    : `<div class="empty-state">Sin dispositivos registrados.</div>`;

  document.querySelector("#portalPayments").innerHTML = (data.payments || []).length
    ? data.payments.map(payment => `
      <article class="portal-list-item">
        <strong>${formatMoney(payment.amount, payment.currency)}</strong>
        <span>${escapeHtml(payment.provider)} · ${escapeHtml(payment.status)}</span>
        <div class="metric-meta">${formatDateTime(payment.paidAt || payment.createdAt)} · ${payment.updateDaysGranted} días de updates</div>
      </article>
    `).join("")
    : `<div class="empty-state">Sin pagos registrados.</div>`;
}

async function loadPortalByToken(token) {
  const data = await apiFetch(`/api/portal/session/${encodeURIComponent(token)}`);
  renderPortal(data);
  setAuthenticated(true);
}

async function handleLogin(event) {
  event.preventDefault();
  const licenseKey = document.querySelector("#portalLicenseKey").value.trim();
  const customerEmail = document.querySelector("#portalCustomerEmail").value.trim();

  if (!licenseKey || !customerEmail) {
    setLoginStatus("Ingresa tu licencia y tu correo.", true);
    return;
  }

  setLoginStatus("Validando acceso...");
  const data = await apiFetch("/api/portal/login", {
    method: "POST",
    body: JSON.stringify({ licenseKey, customerEmail })
  });

  state.token = data.portalToken || state.token;
  if (state.token) {
    const url = new URL(window.location.href);
    url.searchParams.set("token", state.token);
    window.history.replaceState({}, "", url);
  }

  renderPortal(data);
  setAuthenticated(true);
}

loginForm?.addEventListener("submit", async event => {
  try {
    await handleLogin(event);
  } catch (error) {
    setLoginStatus(error.message || "No se pudo abrir el portal.", true);
  }
});

setAuthenticated(false);

if (state.token) {
  setLoginStatus("Cargando portal...");
  loadPortalByToken(state.token)
    .then(() => setLoginStatus(""))
    .catch(error => {
      setAuthenticated(false);
      setLoginStatus(error.message || "No se pudo abrir el portal con ese enlace.", true);
    });
}
