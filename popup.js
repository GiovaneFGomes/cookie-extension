const past = document.querySelector(".past");
const save = document.querySelector(".save");
const cookieTxt = document.querySelector(".cookie");

past.addEventListener("click", async () => {

    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.cookie
    });

    cookieTxt.value = result[0].result;

    navigator.clipboard.writeText(result[0].result);
});

save.addEventListener("click", async () => {


    const value = cookieTxt.value;

    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (cookieString) => {

            const cookies = cookieString.split(";");

            for (const item of cookies) {

                const cookie = item.trim();

                if (!cookie) continue;

                document.cookie = cookie + "; path=/";
            }

        },
        args: [value]
    });
});
