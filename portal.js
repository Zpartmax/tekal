const apiBaseMeta = document.querySelector('meta[name="tekal-license-api"]');
const apiBase = (apiBaseMeta?.content || "https://licencias.tekalpos.com").replace(/\/+$/, "");
const loginGate = document.querySelector("#portalLoginGate");
const portalShell = document.querySelector("#portalShell");
const loginForm = document.querySelector("#portalLoginForm");
const loginStatus = document.querySelector("#portalLoginStatus");
const portalMatches = document.querySelector("#portalMatches");
const standaloneState = document.querySelector("#portalStandaloneState");
const standaloneMessage = document.querySelector("#portalStandaloneMessage");
const state = {
  token: new URLSearchParams(window.location.search).get("token") || ""
};

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
  return date.toLocaleString("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
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

function isAccessPage() {
  return Boolean(loginGate);
}

function isPortalPage() {
  return Boolean(portalShell);
}

function getPortalUrl(token) {
  return `portal.html?token=${encodeURIComponent(token)}`;
}

function updateUrlToken(token) {
  if (!token) return;
  state.token = token;
  const url = new URL(window.location.href);
  url.searchParams.set("token", token);
  window.history.replaceState({}, "", url);
}

function showStandaloneState(message) {
  if (portalShell) portalShell.hidden = true;
  if (standaloneState) standaloneState.hidden = false;
  if (standaloneMessage && message) {
    standaloneMessage.textContent = message;
  }
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
    let message = `HTTP ${response.status}`;

    try {
      const payload = await response.json();
      message = payload?.message || message;
    } catch {
      const text = await response.text();
      message = text || message;
    }

    throw new Error(message);
  }

  return response.json();
}

function renderMatches(matches) {
  if (!portalMatches) return;

  if (!matches.length) {
    portalMatches.hidden = true;
    portalMatches.innerHTML = "";
    return;
  }

  portalMatches.hidden = false;
  portalMatches.innerHTML = matches.map(item => `
    <article class="portal-list-item">
      <strong>${escapeHtml(item.customerName || "Cliente TEKAL")}</strong>
      <span>${escapeHtml(item.licenseKey)} · ${escapeHtml(item.status)}</span>
      <div class="metric-meta">
        Updates hasta ${formatDate(item.updatesUntil)} ·
        ${item.daysToUpdatesExpire ?? "N/D"} dias restantes de actualizaciones ·
        Version ${escapeHtml(item.lastVersion || "N/D")}
      </div>
      <div class="stack-actions">
        <a class="button secondary" href="${getPortalUrl(item.portalToken)}">Abrir portal</a>
      </div>
    </article>
  `).join("");
}

function setLink(selector, href) {
  const node = document.querySelector(selector);
  if (!node) return;
  node.href = href || "#";
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (!node) return;
  node.textContent = value;
}

function renderPortal(data) {
  updateUrlToken(data.portalToken);

  const isTrial = String(data.status || "").toLowerCase() === "trial";
  const releaseLink = data.latestRelease?.downloadUrl ? `${apiBase}${data.latestRelease.downloadUrl}` : "#";
  const androidLink = data.androidDownloadUrl ? `${apiBase}${data.androidDownloadUrl}` : "#";

  setText("#portalCustomerName", data.customerName || "Cliente TEKAL");
  setText(
    "#portalIntro",
    `Licencia permanente ${data.licenseKey}. Los dias restantes corresponden unicamente al periodo de actualizaciones.`
  );

  setLink("#portalDownloadButton", releaseLink);
  setLink("#portalAndroidButton", androidLink);
  setLink("#portalSupportButton", data.supportWhatsAppUrl || "#");
  setLink("#portalReleaseLink", releaseLink);
  setLink("#portalInstallStepsDownload", releaseLink);
  setLink("#portalAndroidLink", androidLink);
  setLink("#portalInstallStepsAndroid", androidLink);
  setLink("#portalWhatsAppLink", data.supportWhatsAppUrl || "#");
  setLink("#portalSupportWhatsAppCta", data.supportWhatsAppUrl || "#");

  setText("#portalSupportEmail", data.supportEmail || "N/D");
  setText("#portalSupportPhone", data.supportPhone || "N/D");
  setText(
    "#portalSupportMeta",
    `Correo: ${data.supportEmail || "N/D"} · Telefono/WhatsApp: ${data.supportPhone || "N/D"}`
  );

  setText(
    "#portalReleaseText",
    data.latestRelease
      ? `Version ${data.latestRelease.version} publicada el ${formatDate(data.latestRelease.publishedAt)}.`
      : "No hay una release publicada en este momento."
  );

  const summary = [
    ["Correo", data.customerEmail || "Sin correo"],
    ["Licencia", data.licenseKey],
    ["Updates hasta", formatDate(data.updatesUntil)],
    ["Dias restantes de updates", data.daysToUpdatesExpire ?? "N/D"],
    ["Equipos activos", `${data.deviceCount}/${data.maxTerminals}`],
    ["Ultima version", data.lastVersion || "N/D"]
  ];

  const summaryNode = document.querySelector("#portalSummary");
  if (summaryNode) {
    summaryNode.innerHTML = summary.map(([label, value]) => `
      <article>
        <strong>${escapeHtml(value)}</strong>
        <span>${escapeHtml(label)}</span>
      </article>
    `).join("");
  }

  const licenseGrid = [
    ["Cliente", data.customerName],
    ["Correo", data.customerEmail || "Sin correo"],
    ["Licencia", isTrial ? "Prueba" : "Permanente"],
    ["Fuente", data.source],
    [isTrial ? "Inicio de prueba" : "Fecha de adquisicion", formatDate(data.createdAt)],
    ["Vigencia de updates", formatDate(data.updatesUntil)]
  ];

  const licenseGridNode = document.querySelector("#portalLicenseGrid");
  if (licenseGridNode) {
    licenseGridNode.innerHTML = licenseGrid.map(([label, value]) => `
      <article class="route-card">
        <strong>${escapeHtml(label)}</strong>
        <p>${escapeHtml(value)}</p>
      </article>
    `).join("");
  }

  const devicesNode = document.querySelector("#portalDevices");
  if (devicesNode) {
    devicesNode.innerHTML = (data.devices || []).length
      ? data.devices.map(device => `
        <article class="portal-list-item">
          <strong>${escapeHtml(device.deviceName || "Equipo")}</strong>
          <span>${escapeHtml(device.machineId)}</span>
          <div class="metric-meta">Version ${escapeHtml(device.lastVersion || "N/D")} · IP ${escapeHtml(device.lastIp || "N/D")} · ${formatDateTime(device.lastSeenAt)}</div>
        </article>
      `).join("")
      : `<div class="empty-state">Sin dispositivos registrados.</div>`;
  }

  const paymentsNode = document.querySelector("#portalPayments");
  if (paymentsNode) {
    paymentsNode.innerHTML = (data.payments || []).length
      ? data.payments.map(payment => `
        <article class="portal-list-item">
          <strong>${formatMoney(payment.amount, payment.currency)}</strong>
          <span>${escapeHtml(payment.provider)} · ${escapeHtml(payment.status)}</span>
          <div class="metric-meta">${formatDateTime(payment.paidAt || payment.createdAt)} · ${payment.updateDaysGranted} dias de updates</div>
        </article>
      `).join("")
      : `<div class="empty-state">Sin pagos registrados.</div>`;
  }
}

async function loadPortalByToken(token) {
  const data = await apiFetch(`/api/portal/session/${encodeURIComponent(token)}`);
  renderPortal(data);
  if (portalShell) portalShell.hidden = false;
  if (standaloneState) standaloneState.hidden = true;
}

async function handleLogin(event) {
  event.preventDefault();

  const emailNode = document.querySelector("#portalCustomerEmail");
  const customerEmail = emailNode?.value.trim() || "";

  if (!customerEmail) {
    setLoginStatus("Ingresa tu correo.", true);
    return;
  }

  setLoginStatus("Buscando portales...");
  renderMatches([]);

  const data = await apiFetch("/api/portal/login", {
    method: "POST",
    body: JSON.stringify({ customerEmail })
  });

  const matches = data.matches || [];
  if (!matches.length) {
    throw new Error("No se encontraron portales con ese correo.");
  }

  if (matches.length === 1 && matches[0]?.portalToken) {
    window.location.href = getPortalUrl(matches[0].portalToken);
    return;
  }

  renderMatches(matches);
  setLoginStatus("Encontramos varias licencias con ese correo. Elige cual quieres abrir.");
}

loginForm?.addEventListener("submit", async event => {
  try {
    await handleLogin(event);
  } catch (error) {
    renderMatches([]);
    setLoginStatus(error.message || "No se pudo abrir el portal.", true);
  }
});

if (isPortalPage()) {
  if (!state.token) {
    window.location.replace("portal-acceso.html");
  } else {
    loadPortalByToken(state.token).catch(error => {
      showStandaloneState(error.message || "No se pudo abrir el portal con ese enlace.");
    });
  }
}

if (isAccessPage()) {
  renderMatches([]);
}
