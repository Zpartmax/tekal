const apiBaseMeta = document.querySelector('meta[name="tekal-license-api"]');
const apiBase = (apiBaseMeta?.content || "https://licencias.tekalpos.com").replace(/\/+$/, "");
const loginGate = document.querySelector("#loginGate");
const adminShell = document.querySelector("#adminShell");
const loginForm = document.querySelector("#loginForm");
const loginAdminKeyInput = document.querySelector("#loginAdminKey");
const loginStatus = document.querySelector("#loginStatus");
const authStatus = document.querySelector("#authStatus");
const refreshAllButton = document.querySelector("#refreshAllButton");
const logoutButton = document.querySelector("#logoutButton");
const summaryCards = document.querySelector("#summaryCards");
const alertsList = document.querySelector("#alertsList");
const alertsCount = document.querySelector("#alertsCount");
const versionsList = document.querySelector("#versionsList");
const renewalsTable = document.querySelector("#renewalsTable");
const licensesTable = document.querySelector("#licensesTable");
const devicesTable = document.querySelector("#devicesTable");
const releasesTable = document.querySelector("#releasesTable");
const paymentsTable = document.querySelector("#paymentsTable");
const licenseSearch = document.querySelector("#licenseSearch");
const licenseStatusFilter = document.querySelector("#licenseStatusFilter");
const reloadLicensesButton = document.querySelector("#reloadLicensesButton");
const toggleCreateLicenseButton = document.querySelector("#toggleCreateLicenseButton");
const cancelCreateLicenseButton = document.querySelector("#cancelCreateLicenseButton");
const createLicensePanel = document.querySelector("#createLicensePanel");
const createLicenseForm = document.querySelector("#createLicenseForm");
const createLicenseStatus = document.querySelector("#createLicenseStatus");
const createTrialCheckbox = document.querySelector("#createTrial");
const createTrialDaysLabel = document.querySelector("#createTrialDaysLabel");
const deviceSearch = document.querySelector("#deviceSearch");
const reloadDevicesButton = document.querySelector("#reloadDevicesButton");
const reloadReleasesButton = document.querySelector("#reloadReleasesButton");
const reloadPaymentsButton = document.querySelector("#reloadPaymentsButton");
const licenseDetailForm = document.querySelector("#licenseDetailForm");
const licenseDetailBadge = document.querySelector("#licenseDetailBadge");
const detailDevices = document.querySelector("#detailDevices");
const detailPayments = document.querySelector("#detailPayments");
const navLinks = Array.from(document.querySelectorAll(".sidebar-nav a"));

const sessionKeyName = "tekal_admin_key";

const state = {
  adminKey: sessionStorage.getItem(sessionKeyName) || "",
  selectedLicenseId: null,
  licenses: [],
  devices: [],
  releases: [],
  payments: []
};

function setAuthenticated(isAuthenticated) {
  document.body.classList.toggle("auth-locked", !isAuthenticated);
  adminShell?.setAttribute("aria-hidden", String(!isAuthenticated));
  loginGate?.setAttribute("aria-hidden", String(isAuthenticated));
  if (adminShell) adminShell.hidden = !isAuthenticated;
  if (loginGate) loginGate.hidden = isAuthenticated;
}

function syncActiveNav() {
  const hash = window.location.hash || "#dashboard";
  navLinks.forEach(link => {
    link.classList.toggle("active", link.getAttribute("href") === hash);
  });
}

function setLoginStatus(message, isError = false) {
  if (!loginStatus) return;
  loginStatus.hidden = !message;
  loginStatus.textContent = message;
  loginStatus.style.color = isError ? "#fecaca" : "";
}

function updateAuthStatus(message) {
  if (!authStatus) return;
  authStatus.textContent = state.adminKey
    ? (message || "Sesion autenticada.")
    : "Sesion no iniciada.";
}

function setCreateLicenseStatus(message, isError = false) {
  if (!createLicenseStatus) return;
  createLicenseStatus.hidden = !message;
  createLicenseStatus.textContent = message;
  createLicenseStatus.style.color = isError ? "var(--danger)" : "";
}

function normalizeDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
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

function statusClass(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("active")) return "active";
  if (normalized.includes("trial")) return "trial";
  if (normalized.includes("blocked")) return "blocked";
  if (normalized.includes("expired")) return "expired";
  if (normalized.includes("paid")) return "active";
  if (normalized.includes("pending")) return "pending";
  if (normalized.includes("failed")) return "failed";
  return "pending";
}

function sourceClass(source) {
  return String(source || "online").toLowerCase() === "legacy" ? "legacy" : "online";
}

async function apiFetch(path, options = {}) {
  if (!state.adminKey) {
    throw new Error("Primero inicia sesion con la admin key.");
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": state.adminKey,
      ...(options.headers || {})
    }
  });

  if (response.status === 401) {
    throw new Error("Admin key invalida o no autorizada.");
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.json();
}

function renderSummary(summary) {
  if (!summaryCards) return;

  const cards = [
    ["Licencias totales", summary.totalLicenses, `${summary.activeLicenses} activas`],
    ["Instalaciones totales", summary.totalInstallations, `${summary.newInstallations7d} nuevas en 7 dias`],
    ["Instalaciones activas", summary.activeInstallations30d, "actividad en 30 dias"],
    ["Sin activar activas", summary.activeUnlicensedInstallations30d, "actividad sin licencia en 30 dias"],
    ["Por vencer", summary.expiringLicenses7d, "siguientes 7 dias"],
    ["Updates por vencer", summary.updatesExpiring7d, "siguientes 7 dias"],
    ["Dispositivos activos", summary.connectedDevices24h, "ultimas 24 horas"],
    ["Bloqueadas", summary.blockedLicenses, `${summary.expiredLicenses} vencidas`],
    ["Dispositivos inactivos", summary.staleDevices30d, "sin actividad > 30 dias"],
    ["Release publicada", summary.latestReleaseVersion || "N/D", `${summary.publishedReleases} publicadas`],
    ["Ingresos 30 dias", formatMoney(summary.revenueLast30d, "USD"), `${summary.paymentsLast30d} pagos`]
  ];

  summaryCards.innerHTML = cards.map(([label, value, hint]) => `
    <article class="summary-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(hint)}</small>
    </article>
  `).join("");
}

function renderAlerts(alerts) {
  alertsCount.textContent = String(alerts.length);
  if (!alerts.length) {
    alertsList.innerHTML = `<div class="empty-state">Sin alertas criticas.</div>`;
    return;
  }

  alertsList.innerHTML = alerts.map(item => `
    <article class="alert-item ${escapeHtml(item.priority)}">
      <div class="inline-actions">
        <strong>${escapeHtml(item.title)}</strong>
        <button class="button ghost compact" type="button" data-action="dismiss-alert" data-alert-key="${escapeHtml(item.alertKey)}">Borrar alerta</button>
      </div>
      <span>${escapeHtml(item.customerName)} | ${escapeHtml(item.licenseKey)}</span>
      <div class="metric-meta">${escapeHtml(item.description)}${item.daysRemaining !== null && item.daysRemaining !== undefined ? ` | ${item.daysRemaining} dias` : ""}</div>
    </article>
  `).join("");
}

function renderVersions(versions) {
  if (!versions.length) {
    versionsList.innerHTML = `<div class="empty-state">Sin versiones registradas.</div>`;
    return;
  }

  versionsList.innerHTML = versions.map(item => `
    <article class="version-item">
      <strong>${escapeHtml(item.version)}</strong>
      <span>${item.installations} instalaciones</span>
      <div class="metric-meta">Ultima actividad: ${formatDateTime(item.lastSeenAt)}</div>
    </article>
  `).join("");
}

function renderRenewals(rows) {
  if (!rows.length) {
    renewalsTable.innerHTML = `<tr><td colspan="4" class="empty-cell">Sin datos.</td></tr>`;
    return;
  }

  renewalsTable.innerHTML = rows.map(row => `
    <tr>
      <td>${escapeHtml(row.customerName)}</td>
      <td>${escapeHtml(row.licenseKey)}</td>
      <td>${formatDate(row.updatesUntil)}</td>
      <td>${row.daysRemaining ?? "N/D"}</td>
    </tr>
  `).join("");
}

function renderLicenses(rows) {
  state.licenses = rows;
  if (!rows.length) {
    licensesTable.innerHTML = `<tr><td colspan="6" class="empty-cell">Sin datos.</td></tr>`;
    return;
  }

  licensesTable.innerHTML = rows.map(row => `
    <tr data-license-id="${row.id}" class="${state.selectedLicenseId === row.id ? "selected" : ""}">
      <td>
        <strong>${escapeHtml(row.customerName)}</strong>
        <div class="meta-line">${escapeHtml(row.customerEmail || "Sin correo")}</div>
        <div class="meta-line">${escapeHtml(row.licenseKey)}</div>
        <div class="meta-line"><span class="source-chip ${sourceClass(row.source)}">${escapeHtml(row.source || "Online")}</span></div>
      </td>
      <td><span class="status-chip ${statusClass(row.status)}">${escapeHtml(row.status)}</span></td>
      <td>${row.daysToUpdatesExpire ?? "N/D"} dias</td>
      <td>${escapeHtml(row.lastVersion || "N/D")}</td>
      <td>${row.deviceCount}/${row.maxTerminals}</td>
      <td>${formatDateTime(row.lastSeenAt)}</td>
    </tr>
  `).join("");

  licensesTable.querySelectorAll("tr[data-license-id]").forEach(row => {
    row.addEventListener("click", () => {
      const id = Number(row.dataset.licenseId);
      if (!Number.isFinite(id)) return;
      selectLicense(id);
    });
  });
}

function renderDevices(rows) {
  state.devices = rows;
  if (!rows.length) {
    devicesTable.innerHTML = `<tr><td colspan="7" class="empty-cell">Sin datos.</td></tr>`;
    return;
  }

  devicesTable.innerHTML = rows.map(row => `
    <tr>
      <td>
        <strong>${escapeHtml(row.customerName)}</strong>
        <div class="meta-line">${escapeHtml(row.licenseKey)}</div>
      </td>
      <td>${escapeHtml(row.machineId)}</td>
      <td>${escapeHtml(row.lastVersion || "N/D")}</td>
      <td>${escapeHtml(row.lastIp || "N/D")}</td>
      <td>${formatDateTime(row.lastSeenAt)}</td>
      <td>${row.daysSinceLastSeen}</td>
      <td>
        <button
          class="button ghost compact danger"
          type="button"
          data-action="remove-device"
          data-license-id="${row.licenseId}"
          data-device-id="${row.id}"
          data-machine-id="${escapeHtml(row.machineId)}"
        >
          Liberar equipo
        </button>
      </td>
    </tr>
  `).join("");
}

function renderReleases(rows) {
  state.releases = rows;
  if (!rows.length) {
    releasesTable.innerHTML = `<tr><td colspan="5" class="empty-cell">Sin datos.</td></tr>`;
    return;
  }

  releasesTable.innerHTML = rows.map(row => `
    <tr>
      <td><strong>${escapeHtml(row.version)}</strong></td>
      <td>${escapeHtml(row.fileName)}</td>
      <td>${formatDateTime(row.publishedAt)}</td>
      <td><code>${escapeHtml(row.sha256 || "N/D")}</code></td>
      <td>${row.isMandatory ? "Obligatoria" : "Normal"}</td>
    </tr>
  `).join("");
}

function renderPayments(rows) {
  state.payments = rows;
  if (!rows.length) {
    paymentsTable.innerHTML = `<tr><td colspan="6" class="empty-cell">Sin datos.</td></tr>`;
    return;
  }

  paymentsTable.innerHTML = rows.map(row => `
    <tr>
      <td>${escapeHtml(row.licenseKey)}</td>
      <td>${escapeHtml(row.provider)}</td>
      <td>${formatMoney(row.amount, row.currency)}</td>
      <td><span class="status-chip ${statusClass(row.status)}">${escapeHtml(row.status)}</span></td>
      <td>${formatDateTime(row.paidAt || row.createdAt)}</td>
      <td>${row.updateDaysGranted}</td>
    </tr>
  `).join("");
}

function resetLicenseDetail() {
  state.selectedLicenseId = null;
  licenseDetailBadge.textContent = "Selecciona una";
  licenseDetailBadge.className = "pill neutral";
  licenseDetailForm.reset();
  document.querySelector("#detailId").value = "";
  document.querySelector("#detailPortalUrl").value = "";
  detailDevices.innerHTML = `<div class="empty-state">Sin datos.</div>`;
  detailPayments.innerHTML = `<div class="empty-state">Sin datos.</div>`;
}

function setCreateLicensePanelVisible(visible) {
  if (!createLicensePanel) return;
  createLicensePanel.hidden = !visible;
  if (toggleCreateLicenseButton) {
    toggleCreateLicenseButton.textContent = visible ? "Ocultar formulario" : "Nueva licencia";
  }
  if (!visible) {
    setCreateLicenseStatus("");
  }
}

function syncTrialFields() {
  if (!createTrialCheckbox || !createTrialDaysLabel) return;
  createTrialDaysLabel.hidden = !createTrialCheckbox.checked;
}

function resetCreateLicenseForm() {
  if (!createLicenseForm) return;
  createLicenseForm.reset();
  document.querySelector("#createUpdatesDays").value = "30";
  document.querySelector("#createMaxTerminals").value = "1";
  document.querySelector("#createDeployment").value = "0";
  document.querySelector("#createTrialDays").value = "30";
  document.querySelector("#createAllowMultiCaja").checked = true;
  document.querySelector("#createAllowServerMode").checked = true;
  document.querySelector("#createAllowClientMode").checked = true;
  syncTrialFields();
  setCreateLicenseStatus("");
}

function renderDetailDevices(detail) {
  detailDevices.innerHTML = detail.devices?.length
    ? detail.devices.map(device => `
      <article class="mini-item">
        <div class="inline-actions">
          <strong>${escapeHtml(device.machineId)}</strong>
          <button
            class="button ghost compact danger"
            type="button"
            data-action="remove-device"
            data-license-id="${detail.id}"
            data-device-id="${device.id}"
            data-machine-id="${escapeHtml(device.machineId)}"
          >
            Liberar equipo
          </button>
        </div>
        <span>${escapeHtml(device.lastVersion || "Sin version")} | ${escapeHtml(device.lastIp || "Sin IP")}</span>
        <div class="meta-line">Ultima conexion: ${formatDateTime(device.lastSeenAt)}</div>
      </article>
    `).join("")
    : `<div class="empty-state">Sin dispositivos registrados.</div>`;
}

function renderDetailPayments(detail) {
  detailPayments.innerHTML = detail.payments?.length
    ? detail.payments.map(payment => `
      <article class="mini-item">
        <strong>${formatMoney(payment.amount, payment.currency)}</strong>
        <span>${escapeHtml(payment.provider)} | ${escapeHtml(payment.status)}</span>
        <div class="meta-line">${formatDateTime(payment.paidAt || payment.createdAt)} | ${payment.updateDaysGranted} dias</div>
      </article>
    `).join("")
    : `<div class="empty-state">Sin pagos registrados.</div>`;
}

function fillLicenseDetail(detail) {
  document.querySelector("#detailId").value = detail.id;
  document.querySelector("#detailCustomerName").value = detail.customerName || "";
  document.querySelector("#detailCustomerEmail").value = detail.customerEmail || "";
  document.querySelector("#detailStatus").value = detail.status || "Active";
  document.querySelector("#detailPaymentStatus").value = detail.paymentStatus || "Pending";
  document.querySelector("#detailMaxTerminals").value = detail.maxTerminals || 1;
  document.querySelector("#detailExpiresAt").value = normalizeDateInput(detail.expiresAt);
  document.querySelector("#detailUpdatesUntil").value = normalizeDateInput(detail.updatesUntil);
  document.querySelector("#detailPortalUrl").value = detail.portalUrl || "";
  document.querySelector("#detailSuspensionReason").value = detail.suspensionReason || "";
  document.querySelector("#detailNotes").value = detail.notes || "";
  licenseDetailBadge.textContent = `${detail.licenseKey} | ${detail.source || "Online"}`;
  licenseDetailBadge.className = `pill ${statusClass(detail.status)}`;

  renderDetailDevices(detail);
  renderDetailPayments(detail);
}

async function loadDashboard() {
  const dashboard = await apiFetch("/api/admin/dashboard");
  renderSummary(dashboard.summary);
  renderAlerts(dashboard.alerts || []);
  renderVersions(dashboard.versions || []);
  renderRenewals(dashboard.upcomingRenewals || []);
}

async function loadLicenses() {
  const q = encodeURIComponent(licenseSearch.value.trim());
  const status = encodeURIComponent(licenseStatusFilter.value);
  const rows = await apiFetch(`/api/admin/licenses?q=${q}&status=${status}`);
  renderLicenses(rows || []);
}

async function loadDevices() {
  const q = encodeURIComponent(deviceSearch.value.trim());
  const rows = await apiFetch(`/api/admin/devices?q=${q}`);
  renderDevices(rows || []);
}

async function loadReleases() {
  const rows = await apiFetch("/api/admin/releases");
  renderReleases(rows || []);
}

async function loadPayments() {
  const rows = await apiFetch("/api/admin/payments");
  renderPayments(rows || []);
}

async function dismissAlert(alertKey) {
  if (!window.confirm("Esta alerta se ocultara del panel admin. Deseas borrarla?")) {
    return;
  }

  updateAuthStatus("Borrando alerta...");
  await apiFetch(`/api/admin/alerts/${encodeURIComponent(alertKey)}`, { method: "DELETE" });
  await loadDashboard();
  updateAuthStatus("Alerta borrada.");
}

async function removeDeviceFromLicense(licenseId, deviceId, machineId) {
  const label = machineId || "este equipo";
  if (!window.confirm(`Se liberara ${label} de la licencia para permitir el cambio de computadora. Deseas continuar?`)) {
    return;
  }

  updateAuthStatus("Liberando equipo...");
  await apiFetch(`/api/admin/licenses/${licenseId}/devices/${deviceId}`, { method: "DELETE" });
  await Promise.all([loadDashboard(), loadLicenses(), loadDevices()]);
  if (state.selectedLicenseId === licenseId) {
    await selectLicense(licenseId);
  }
  updateAuthStatus(`Equipo liberado: ${label}.`);
}

async function setLicenseAsTrial(licenseId) {
  if (!window.confirm("La licencia seleccionada cambiara a estado Trial. Deseas continuar?")) {
    return;
  }

  const payload = {
    customerName: document.querySelector("#detailCustomerName").value.trim(),
    customerEmail: document.querySelector("#detailCustomerEmail").value.trim(),
    status: "Trial",
    paymentStatus: document.querySelector("#detailPaymentStatus").value,
    maxTerminals: Number(document.querySelector("#detailMaxTerminals").value || 1),
    expiresAt: document.querySelector("#detailExpiresAt").value || null,
    updatesUntil: document.querySelector("#detailUpdatesUntil").value || null,
    suspensionReason: document.querySelector("#detailSuspensionReason").value.trim(),
    notes: document.querySelector("#detailNotes").value.trim()
  };

  updateAuthStatus("Marcando licencia como Trial...");
  await apiFetch(`/api/admin/licenses/${licenseId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  await Promise.all([loadDashboard(), loadLicenses()]);
  await selectLicense(licenseId);
  updateAuthStatus("Licencia marcada como Trial.");
}

async function deleteLicense(licenseId) {
  const licenseKey = licenseDetailBadge?.textContent || "la licencia seleccionada";
  if (!window.confirm(`Se eliminara ${licenseKey} y sus dispositivos asociados. Deseas continuar?`)) {
    return;
  }

  updateAuthStatus("Eliminando licencia...");
  await apiFetch(`/api/admin/licenses/${licenseId}`, {
    method: "DELETE"
  });
  await Promise.all([loadDashboard(), loadLicenses(), loadDevices(), loadPayments()]);
  resetLicenseDetail();
  updateAuthStatus("Licencia eliminada.");
}

async function selectLicense(id) {
  state.selectedLicenseId = id;
  renderLicenses(state.licenses);
  const detail = await apiFetch(`/api/admin/licenses/${id}`);
  fillLicenseDetail(detail);
}

async function saveLicenseDetail(event) {
  event.preventDefault();
  const id = Number(document.querySelector("#detailId").value);
  if (!Number.isFinite(id) || id <= 0) return;

  const payload = {
    customerName: document.querySelector("#detailCustomerName").value.trim(),
    customerEmail: document.querySelector("#detailCustomerEmail").value.trim(),
    status: document.querySelector("#detailStatus").value,
    paymentStatus: document.querySelector("#detailPaymentStatus").value,
    maxTerminals: Number(document.querySelector("#detailMaxTerminals").value || 1),
    expiresAt: document.querySelector("#detailExpiresAt").value || null,
    updatesUntil: document.querySelector("#detailUpdatesUntil").value || null,
    suspensionReason: document.querySelector("#detailSuspensionReason").value.trim(),
    notes: document.querySelector("#detailNotes").value.trim()
  };

  await apiFetch(`/api/admin/licenses/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });

  updateAuthStatus("Cambios guardados.");
  await Promise.all([loadDashboard(), loadLicenses()]);
  await selectLicense(id);
}

async function createLicense(event) {
  event.preventDefault();

  const payload = {
    customerName: document.querySelector("#createCustomerName").value.trim(),
    customerEmail: document.querySelector("#createCustomerEmail").value.trim(),
    trial: document.querySelector("#createTrial").checked,
    trialDays: Number(document.querySelector("#createTrialDays").value || 30),
    updatesDays: Number(document.querySelector("#createUpdatesDays").value || 30),
    allowMultiCaja: document.querySelector("#createAllowMultiCaja").checked,
    allowServerMode: document.querySelector("#createAllowServerMode").checked,
    allowClientMode: document.querySelector("#createAllowClientMode").checked,
    deployment: Number(document.querySelector("#createDeployment").value || 0),
    maxTerminals: Number(document.querySelector("#createMaxTerminals").value || 1),
    licenseGroupId: document.querySelector("#createLicenseGroupId").value.trim() || null,
    licenseKey: document.querySelector("#createLicenseKey").value.trim() || null
  };

  if (!payload.customerName) {
    setCreateLicenseStatus("Escribe el nombre del cliente.", true);
    return;
  }

  if (!payload.customerEmail) {
    setCreateLicenseStatus("Escribe el correo del cliente.", true);
    return;
  }

  if (payload.updatesDays < 1) {
    setCreateLicenseStatus("Los dias de updates deben ser mayores a cero.", true);
    return;
  }

  if (payload.maxTerminals < 1) {
    setCreateLicenseStatus("Debe existir al menos una terminal.", true);
    return;
  }

  if (payload.trial && payload.trialDays < 1) {
    setCreateLicenseStatus("Los dias de prueba deben ser mayores a cero.", true);
    return;
  }

  setCreateLicenseStatus("Creando licencia...");

  const result = await apiFetch("/api/admin/licenses", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  updateAuthStatus(`Licencia creada para ${result.customerName}.`);
  await Promise.all([loadDashboard(), loadLicenses()]);
  if (result?.id) {
    await selectLicense(result.id);
  }
  resetCreateLicenseForm();
  setCreateLicensePanelVisible(true);
  setCreateLicenseStatus(`Licencia creada: ${result.licenseKey}${result.portalUrl ? ` | Portal: ${result.portalUrl}` : ""}`);
}

async function validateAdminKey() {
  await apiFetch("/api/admin/dashboard");
}

async function loadAll() {
  updateAuthStatus("Consultando datos...");
  await Promise.all([loadDashboard(), loadLicenses(), loadDevices(), loadReleases(), loadPayments()]);
  updateAuthStatus("Panel actualizado.");
}

async function handleLogin(event) {
  event.preventDefault();
  const adminKey = loginAdminKeyInput.value.trim();
  if (!adminKey) {
    setLoginStatus("Ingresa la admin key.", true);
    return;
  }

  state.adminKey = adminKey;
  sessionStorage.setItem(sessionKeyName, adminKey);
  setLoginStatus("Validando acceso...");
  updateAuthStatus("Validando sesion...");

  try {
    await validateAdminKey();
    setAuthenticated(true);
    setLoginStatus("Acceso concedido.");
    await loadAll();
  } catch (error) {
    sessionStorage.removeItem(sessionKeyName);
    state.adminKey = "";
    setAuthenticated(false);
    resetLicenseDetail();
    updateAuthStatus("Sesion no iniciada.");
    setLoginStatus(error.message || "No se pudo validar la admin key.", true);
  }
}

function handleLogout() {
  state.adminKey = "";
  sessionStorage.removeItem(sessionKeyName);
  loginAdminKeyInput.value = "";
  resetLicenseDetail();
  resetCreateLicenseForm();
  setCreateLicensePanelVisible(false);
  updateAuthStatus("Sesion cerrada.");
  setLoginStatus("Sesion cerrada. Ingresa la admin key para continuar.");
  setAuthenticated(false);
}

document.addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;

  try {
    if (action === "dismiss-alert") {
      const alertKey = button.dataset.alertKey || "";
      if (!alertKey) return;
      await dismissAlert(alertKey);
    }

    if (action === "remove-device") {
      const licenseId = Number(button.dataset.licenseId);
      const deviceId = Number(button.dataset.deviceId);
      const machineId = button.dataset.machineId || "";
      if (!Number.isFinite(licenseId) || !Number.isFinite(deviceId)) return;
      await removeDeviceFromLicense(licenseId, deviceId, machineId);
    }

    if (action === "set-license-trial") {
      const licenseId = Number(document.querySelector("#detailId").value);
      if (!Number.isFinite(licenseId) || licenseId <= 0) return;
      await setLicenseAsTrial(licenseId);
    }

    if (action === "delete-license") {
      const licenseId = Number(document.querySelector("#detailId").value);
      if (!Number.isFinite(licenseId) || licenseId <= 0) return;
      await deleteLicense(licenseId);
    }
  } catch (error) {
    updateAuthStatus(error.message || "No se pudo ejecutar la accion.");
  }
});

loginForm?.addEventListener("submit", handleLogin);
navLinks.forEach(link => {
  link.addEventListener("click", () => {
    window.setTimeout(syncActiveNav, 0);
  });
});
refreshAllButton?.addEventListener("click", async () => {
  try {
    await loadAll();
  } catch (error) {
    updateAuthStatus(error.message || "No se pudo actualizar el panel.");
  }
});
logoutButton?.addEventListener("click", handleLogout);
toggleCreateLicenseButton?.addEventListener("click", () => {
  const willShow = createLicensePanel?.hidden ?? true;
  if (willShow) resetCreateLicenseForm();
  setCreateLicensePanelVisible(willShow);
});
cancelCreateLicenseButton?.addEventListener("click", () => {
  resetCreateLicenseForm();
  setCreateLicensePanelVisible(false);
});
reloadLicensesButton?.addEventListener("click", async () => {
  try {
    await loadLicenses();
  } catch (error) {
    updateAuthStatus(error.message || "No se pudo cargar licencias.");
  }
});
reloadDevicesButton?.addEventListener("click", async () => {
  try {
    await loadDevices();
  } catch (error) {
    updateAuthStatus(error.message || "No se pudo cargar dispositivos.");
  }
});
reloadReleasesButton?.addEventListener("click", async () => {
  try {
    await loadReleases();
  } catch (error) {
    updateAuthStatus(error.message || "No se pudo cargar releases.");
  }
});
reloadPaymentsButton?.addEventListener("click", async () => {
  try {
    await loadPayments();
  } catch (error) {
    updateAuthStatus(error.message || "No se pudo cargar pagos.");
  }
});
createLicenseForm?.addEventListener("submit", async event => {
  try {
    await createLicense(event);
  } catch (error) {
    setCreateLicenseStatus(error.message || "No se pudo crear la licencia.", true);
  }
});
createTrialCheckbox?.addEventListener("change", syncTrialFields);
licenseDetailForm?.addEventListener("submit", saveLicenseDetail);
licenseSearch?.addEventListener("input", async () => {
  if (!state.adminKey) return;
  try {
    await loadLicenses();
  } catch (error) {
    updateAuthStatus(error.message || "No se pudo cargar licencias.");
  }
});
licenseStatusFilter?.addEventListener("change", async () => {
  if (!state.adminKey) return;
  try {
    await loadLicenses();
  } catch (error) {
    updateAuthStatus(error.message || "No se pudo cargar licencias.");
  }
});
deviceSearch?.addEventListener("input", async () => {
  if (!state.adminKey) return;
  try {
    await loadDevices();
  } catch (error) {
    updateAuthStatus(error.message || "No se pudo cargar dispositivos.");
  }
});
window.addEventListener("hashchange", syncActiveNav);

setAuthenticated(false);
resetLicenseDetail();
resetCreateLicenseForm();
setCreateLicensePanelVisible(false);
updateAuthStatus();
syncActiveNav();

if (state.adminKey) {
  loginAdminKeyInput.value = state.adminKey;
  setLoginStatus("Restaurando sesion...");
  validateAdminKey()
    .then(async () => {
      setAuthenticated(true);
      await loadAll();
    })
    .catch(() => {
      handleLogout();
      setLoginStatus("La sesion anterior ya no es valida. Inicia sesion otra vez.", true);
    });
} else {
  setLoginStatus("");
}
