const apiBaseMeta = document.querySelector('meta[name="tekal-license-api"]');
const apiBase = (apiBaseMeta?.content || "https://licencias.tekalpos.com").replace(/\/+$/, "");
const adminKeyInput = document.querySelector("#adminKey");
const authStatus = document.querySelector("#authStatus");
const refreshAllButton = document.querySelector("#refreshAllButton");
const saveKeyButton = document.querySelector("#saveKeyButton");
const clearKeyButton = document.querySelector("#clearKeyButton");
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
const deviceSearch = document.querySelector("#deviceSearch");
const reloadDevicesButton = document.querySelector("#reloadDevicesButton");
const reloadReleasesButton = document.querySelector("#reloadReleasesButton");
const reloadPaymentsButton = document.querySelector("#reloadPaymentsButton");
const licenseDetailForm = document.querySelector("#licenseDetailForm");
const licenseDetailBadge = document.querySelector("#licenseDetailBadge");
const detailDevices = document.querySelector("#detailDevices");
const detailPayments = document.querySelector("#detailPayments");

const state = {
  adminKey: localStorage.getItem("tekal_admin_key") || "",
  selectedLicenseId: null,
  licenses: [],
  devices: [],
  releases: [],
  payments: []
};

adminKeyInput.value = state.adminKey;
updateAuthStatus();

function updateAuthStatus(message) {
  if (!authStatus) return;
  if (!state.adminKey) {
    authStatus.textContent = "Sin autenticar.";
    return;
  }

  authStatus.textContent = message || "Admin key cargada. Lista para consultar.";
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
  const amount = Number(value || 0);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2
  }).format(amount);
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

async function apiFetch(path, options = {}) {
  if (!state.adminKey) {
    throw new Error("Primero guarda la admin key.");
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
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.customerName)} · ${escapeHtml(item.licenseKey)}</span>
      <div class="metric-meta">${escapeHtml(item.description)}${item.daysRemaining !== null && item.daysRemaining !== undefined ? ` · ${item.daysRemaining} dias` : ""}</div>
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
        <div class="meta-line">${escapeHtml(row.licenseKey)}</div>
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
    devicesTable.innerHTML = `<tr><td colspan="6" class="empty-cell">Sin datos.</td></tr>`;
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
  licenseDetailBadge.textContent = "Selecciona una";
  licenseDetailBadge.className = "pill neutral";
  licenseDetailForm.reset();
  document.querySelector("#detailId").value = "";
  detailDevices.innerHTML = `<div class="empty-state">Sin datos.</div>`;
  detailPayments.innerHTML = `<div class="empty-state">Sin datos.</div>`;
}

function fillLicenseDetail(detail) {
  document.querySelector("#detailId").value = detail.id;
  document.querySelector("#detailCustomerName").value = detail.customerName || "";
  document.querySelector("#detailStatus").value = detail.status || "Active";
  document.querySelector("#detailPaymentStatus").value = detail.paymentStatus || "Pending";
  document.querySelector("#detailMaxTerminals").value = detail.maxTerminals || 1;
  document.querySelector("#detailExpiresAt").value = normalizeDateInput(detail.expiresAt);
  document.querySelector("#detailUpdatesUntil").value = normalizeDateInput(detail.updatesUntil);
  document.querySelector("#detailSuspensionReason").value = detail.suspensionReason || "";
  document.querySelector("#detailNotes").value = detail.notes || "";
  licenseDetailBadge.textContent = detail.licenseKey;
  licenseDetailBadge.className = `pill ${statusClass(detail.status)}`;

  detailDevices.innerHTML = detail.devices?.length
    ? detail.devices.map(device => `
      <article class="mini-item">
        <strong>${escapeHtml(device.machineId)}</strong>
        <span>${escapeHtml(device.lastVersion || "Sin version")} · ${escapeHtml(device.lastIp || "Sin IP")}</span>
        <div class="meta-line">Ultima conexion: ${formatDateTime(device.lastSeenAt)}</div>
      </article>
    `).join("")
    : `<div class="empty-state">Sin dispositivos registrados.</div>`;

  detailPayments.innerHTML = detail.payments?.length
    ? detail.payments.map(payment => `
      <article class="mini-item">
        <strong>${formatMoney(payment.amount, payment.currency)}</strong>
        <span>${escapeHtml(payment.provider)} · ${escapeHtml(payment.status)}</span>
        <div class="meta-line">${formatDateTime(payment.paidAt || payment.createdAt)} · ${payment.updateDaysGranted} dias</div>
      </article>
    `).join("")
    : `<div class="empty-state">Sin pagos registrados.</div>`;
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

async function selectLicense(id) {
  state.selectedLicenseId = id;
  renderLicenses(state.licenses);
  const detail = await apiFetch(`/api/admin/licenses/${id}`);
  fillLicenseDetail(detail);
}

async function saveLicenseDetail(event) {
  event.preventDefault();
  const id = Number(document.querySelector("#detailId").value);
  if (!Number.isFinite(id) || id <= 0) {
    return;
  }

  const payload = {
    customerName: document.querySelector("#detailCustomerName").value.trim(),
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

async function loadAll() {
  if (!state.adminKey) {
    updateAuthStatus("Guarda la admin key para consultar el panel.");
    return;
  }

  updateAuthStatus("Consultando datos...");

  try {
    await Promise.all([loadDashboard(), loadLicenses(), loadDevices(), loadReleases(), loadPayments()]);
    updateAuthStatus("Panel actualizado.");
  } catch (error) {
    updateAuthStatus(error.message || "No se pudo consultar el panel.");
  }
}

saveKeyButton.addEventListener("click", () => {
  state.adminKey = adminKeyInput.value.trim();
  localStorage.setItem("tekal_admin_key", state.adminKey);
  resetLicenseDetail();
  updateAuthStatus();
  loadAll();
});

clearKeyButton.addEventListener("click", () => {
  state.adminKey = "";
  localStorage.removeItem("tekal_admin_key");
  adminKeyInput.value = "";
  resetLicenseDetail();
  updateAuthStatus();
});

refreshAllButton.addEventListener("click", () => loadAll());
reloadLicensesButton.addEventListener("click", () => loadLicenses());
reloadDevicesButton.addEventListener("click", () => loadDevices());
reloadReleasesButton.addEventListener("click", () => loadReleases());
reloadPaymentsButton.addEventListener("click", () => loadPayments());
licenseDetailForm.addEventListener("submit", saveLicenseDetail);
licenseSearch.addEventListener("input", () => loadLicenses());
licenseStatusFilter.addEventListener("change", () => loadLicenses());
deviceSearch.addEventListener("input", () => loadDevices());

if (state.adminKey) {
  loadAll();
}
