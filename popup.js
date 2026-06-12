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

        const cookieString = JSON.stringify(cookies, null, 2);

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
            return feedback(pasteBtn, "❌ JSON inválido!", "#dc2626");
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
            const cookieUrl = `${cookie.secure ? "https" : "http"}://${cookie.domain.startsWith(".") ? cookie.domain.slice(1) : cookie.domain}${cookie.path}`;

            const newCookie = {
                url: cookieUrl,
                name: cookie.name,
                value: cookie.value,
                path: cookie.path,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                sameSite: cookie.sameSite,
            };

            if (cookie.expirationDate) {
                newCookie.expirationDate = cookie.expirationDate;
            }

            if (cookie.domain.startsWith(".")) {
                newCookie.domain = cookie.domain;
            }

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