//console.log("Hello from extension")
const preEls = document.querySelectorAll('pre');

[...preEls].forEach(preEl => {
    const root = document.createElement('div');
    root.style.position = "relative";
    const shadowRoot = root.attachShadow({mode: 'open'});

    const cssURL = chrome.runtime.getURL('content-script.css');

    shadowRoot.innerHTML = '<link rel="stylesheet" href="' + cssURL + '"></link>'

    const button = document.createElement('button');
    button.innerText = 'Copy';
    button.type = 'button';

    shadowRoot.prepend(button);
    preEl.prepend(root);

    const codeEl = preEl.querySelector('code');

    const code = codeEl.innerText;

    button.addEventListener('click', () =>{
        navigator.clipboard.writeText(codeEl.innerText).then(()=> {
            chrome.runtime.sendMessage({action: 'send-code', code});
            notify();
        });
    })
})

chrome.runtime.onMessage.addListener((req, info, cb) => {
    if (req.action === "copy-all") {
        //console.log('Message "copy-all" came');
        
        const allCode = getAllCode();

        navigator.clipboard.writeText(allCode).then(()=>{
            notify();
            cb(allCode);
        });

        return true;
    }
});

function getAllCode()
{
    return [...preEls].map((preEl) => {
        return preEl.querySelector('code').innerText;
    })
    . join("");
}

function notify(){
    const scriptEl = document.createElement("script");
    scriptEl.src = chrome.runtime.getURL('execute.js');

    document.body.appendChild(scriptEl);

    scriptEl.onload =() => {
        scriptEl.remove();
    }
}

const imgs = document.querySelectorAll('img');
let removed = 0;

[...imgs].forEach(element => {
    wid = element.getAttribute("width");
    hei = element.getAttribute("height");
    src = element.getAttribute("src");
    const display = element.style.display;
    const style = getComputedStyle(element);
    const computedDisplay = style.display;
    if ((wid < 10) && (wid < 10) && (display === "none" || computedDisplay === "none")) {
        console.log(`WARNING: Found and removed suspicuous image[${wid}x${hei}] with src="${src}"`);
        element.parentNode.removeChild(element);
        removed += 1;
    }
});

if (removed > 0) {
    chrome.runtime.sendMessage({action: 'inc-removed', removed});
}
