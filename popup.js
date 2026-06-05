const copyBtn = document.querySelector(".copy-btn");
const pasteBtn = document.querySelector(".paste-btn");
const cookieTxt = document.querySelector(".cookie");
const footer = document.querySelector("footer");

// Copiar cookies da aba atual
copyBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.cookie,
    });

    const cookies = result[0].result;
    cookieTxt.value = cookies;
    await navigator.clipboard.writeText(cookies);

    feedback(copyBtn, "✅ Copiado!", "#16a34a");
});

// Colar cookies na aba atual
pasteBtn.addEventListener("click", async () => {
    const value = cookieTxt.value.trim();
    if (!value) return feedback(pasteBtn, "⚠️ Vazio!", "#d97706");

    // avisa se for muito grande
    const size = new Blob([value]).size;
    if (size > 4096) {
        feedback(pasteBtn, `⚠️ ${(size / 1024).toFixed(1)}kb — muito grande!`, "#d97706");
        return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (cookieString) => {
            // limpa cookies atuais primeiro
            document.cookie.split(";").forEach(cookie => {
                const name = cookie.split("=")[0].trim();
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
            });

            // depois cola os novos
            for (const item of cookieString.split(";")) {
                const cookie = item.trim();
                if (cookie) document.cookie = cookie + "; path=/";
            }
        },
        args: [value],
    });

    feedback(pasteBtn, "✅ Colado!", "#16a34a");
});

// Tamanho em tempo real
cookieTxt.addEventListener("input", () => {
    const size = new Blob([cookieTxt.value]).size;
    footer.textContent = `${(size / 1024).toFixed(1)}kb`;
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