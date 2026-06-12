const copyBtn = document.querySelector(".copy-btn");
const pasteBtn = document.querySelector(".paste-btn");
const cookieTxt = document.querySelector(".cookie");
const footer = document.querySelector("footer");

// Copiar cookies da aba atual
copyBtn.addEventListener("click", async () => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const cookies = await chrome.cookies.getAll({ url: tab.url });

        if (!cookies.length) return feedback(copyBtn, "⚠️ Sem cookies!", "#d97706");

        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join("; ");

        cookieTxt.value = cookieString;
        await navigator.clipboard.writeText(cookieString);
        feedback(copyBtn, "✅ Copiado!", "#16a34a");

    } catch (e) {
        feedback(copyBtn, "❌ Erro!", "#dc2626");
    }
});

// Colar cookies na aba atual
pasteBtn.addEventListener("click", async () => {
    try {
        const value = cookieTxt.value.trim();
        if (!value) return feedback(pasteBtn, "⚠️ Vazio!", "#d97706");

        let cookies;
        try {
            cookies = JSON.parse(value);
        } catch (e) {
            // tenta interpretar como string de header: name=value; name2=value2
            cookies = value.split(";").map(pair => {
                const idx = pair.indexOf("=");
                if (idx === -1) return null;
                return { name: pair.slice(0, idx).trim(), value: pair.slice(idx + 1).trim() };
            }).filter(Boolean);
            if (!cookies.length) return feedback(pasteBtn, "❌ Formato inválido!", "#dc2626");
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = new URL(tab.url);

        // remove todos os cookies atuais
        const existing = await chrome.cookies.getAll({ url: tab.url });
        await Promise.all(existing.map(cookie => {
            const cookieUrl = `${cookie.secure ? "https" : "http"}://${cookie.domain.startsWith(".") ? cookie.domain.slice(1) : cookie.domain}${cookie.path}`;
            return chrome.cookies.remove({ url: cookieUrl, name: cookie.name });
        }));

        // cola os novos
        const results = await Promise.allSettled(cookies.map(cookie => {
            const domain = cookie.domain;
            const cookieUrl = domain
                ? `${cookie.secure ? "https" : "http"}://${domain.startsWith(".") ? domain.slice(1) : domain}${cookie.path || "/"}`
                : tab.url;

            const newCookie = {
                url: cookieUrl,
                name: cookie.name,
                value: cookie.value,
                path: cookie.path || "/",
            };

            if (cookie.secure != null) newCookie.secure = cookie.secure;
            if (cookie.httpOnly != null) newCookie.httpOnly = cookie.httpOnly;
            if (cookie.sameSite) newCookie.sameSite = cookie.sameSite;
            if (cookie.expirationDate) newCookie.expirationDate = cookie.expirationDate;
            if (domain && domain.startsWith(".")) newCookie.domain = domain;

            return chrome.cookies.set(newCookie);
        }));

        const failed = results.filter(r => r.status === "rejected").length;
        const ok = results.length - failed;

        if (failed === 0) {
            feedback(pasteBtn, `✅ ${ok} colado(s)!`, "#16a34a");
        } else if (ok === 0) {
            feedback(pasteBtn, "❌ Falhou tudo!", "#dc2626");
        } else {
            feedback(pasteBtn, `⚠️ ${ok} ok, ${failed} falhou`, "#d97706");
        }

    } catch (e) {
        feedback(pasteBtn, "❌ Erro!", "#dc2626");
    }
});

// Tamanho em tempo real
cookieTxt.addEventListener("input", () => {
    if (cookieTxt.value === "") {
        footer.textContent = "Cookie Manager v1.0";
    } else {
        const size = new Blob([cookieTxt.value]).size;
        footer.textContent = `${(size / 1024).toFixed(1)}kb`;
    }
});

// Feedback visual temporário no botão
function feedback(btn, msg, color) {
    const original = btn.textContent;
    const originalBg = btn.style.background;
    btn.textContent = msg;
    btn.style.background = color;
    setTimeout(() => {
        btn.textContent = original;
        btn.style.background = originalBg;
    }, 2000);
}