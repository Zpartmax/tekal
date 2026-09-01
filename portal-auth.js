(function () {
  const button = document.querySelector("#googleSignInButton");
  const status = document.querySelector("#googleSignInStatus");
  if (!button) return;

  const setStatus = (message, isError = false) => {
    if (!status) return;
    status.hidden = !message;
    status.textContent = message;
    status.style.color = isError ? "#b42318" : "";
  };

  const loadGoogleScript = () => new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("No se pudo cargar Google Login."));
    document.head.appendChild(script);
  });

  const signIn = async (response) => {
    setStatus("Verificando tu cuenta...");
    const result = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: response.credential, deviceName: navigator.userAgent.slice(0, 120) })
    });
    const payload = await result.json().catch(() => ({}));
    if (!result.ok || !payload.success || !payload.token) {
      throw new Error(payload.message || "No se pudo iniciar sesión con Google.");
    }
    sessionStorage.setItem("tekal.authToken", payload.token);
    window.location.href = "portal.html";
  };

  (async () => {
    try {
      const configResponse = await fetch("/api/auth/google/config");
      const config = await configResponse.json();
      if (!config.enabled || !config.clientId) {
        button.hidden = true;
        return;
      }
      await loadGoogleScript();
      window.google.accounts.id.initialize({ client_id: config.clientId, callback: (response) => signIn(response).catch(error => setStatus(error.message, true)) });
      window.google.accounts.id.renderButton(button, { theme: "outline", size: "large", width: 320, text: "signin_with", shape: "rectangular" });
    } catch (error) {
      button.hidden = true;
      setStatus(error.message, true);
    }
  })();
})();
