// @ts-check

const nodeList = /** @type {NodeListOf<HTMLInputElement>} */ (document.querySelectorAll("[type=checkbox]"));
const listLen = nodeList.length;

for (let i = 0; i < listLen; i += 2) {
    const node = nodeList[i];
    const hiddenNode = nodeList[i + 1];

    const handlerFactory = function (/** @type {HTMLInputElement}*/ node) {
        return function (/** @type {Event} */ e) {
            node.checked = !(/** @type {HTMLInputElement}*/ (e.target).checked);
            e.stopImmediatePropagation();
        };
    };
    node.addEventListener("change", handlerFactory(hiddenNode));
}

document.body.addEventListener("keyup", (e) => {
    if (!e.ctrlKey || e.keyCode !== 13) {
        return;
    }

    const queryTA = /** @type {HTMLTextAreaElement} */ (document.getElementById("queryTA"));
    queryTA.value = editor.getValue();
    queryTA.dispatchEvent(new CustomEvent("internal:submit", { bubbles: true }));
});

/*  HTMX listeners  */

// @ts-ignore
document.body.addEventListener("htmx:responseError", function (/** @type {ResponseErrorEvent} */ e) {
    e.detail.target.innerHTML = e.detail.xhr.responseText;
});

// @ts-ignore
document.body.addEventListener("htmx:beforeRequest", function (/** @type {ResponseErrorEvent} */ e) {
    e.detail.xhr["startTime"] = e.timeStamp;
});

// @ts-ignore
document.body.addEventListener("htmx:afterRequest", function (/** @type {ResponseErrorEvent} */ e) {
    if (e.detail.pathInfo.requestPath === "/run") {
        const diff = e.timeStamp - e.detail.xhr["startTime"];
        const time = diff < 1000 ? Math.floor(diff) : (diff / 1000).toFixed(2);
        const timeUnits = diff < 1000 ? " ms" : " s";
        const status = e.detail.xhr.status;

        const timeElement = /** @type {HTMLDivElement}*/ (document.getElementById("response-time"));
        const statusElement = /** @type {HTMLDivElement}*/ (document.getElementById("response-status"));
        statusElement.dataset.status = "OK";

        if (status > 399) {
            statusElement.dataset.status = status > 499 ? "SE" : "RE";
        }

        statusElement.innerText = status + " " + e.detail.xhr.statusText;
        timeElement.innerText = time + timeUnits;
        timeElement.dataset.hasResponse = "true";
    }
});

/*  Ace Editor Config  */

let roEditor;
// @ts-ignore
const editor = ace.edit("editor");
editor.setTheme("ace/theme/monokai");
editor.setShowPrintMargin(false);
editor.setHighlightIndentGuides(true);
editor.setFontSize(10);
editor.session.setMode("ace/mode/sql");
editor.session.setUseWrapMode(true);
editor.renderer.setScrollMargin(5, 0);

/**
 * @typedef {CustomEvent<Details>} ResponseErrorEvent
 */

/**
 * @typedef PathInfo
 * @property {string} requestPath
 */

/**
 * @typedef Details
 * @property {Boolean} boosted
 * @property {string} error
 * @property {Object} etc
 * @property {Boolean} Failed
 * @property {Boolean} successful
 * @property {HTMLElement} target
 * @property {XMLHttpRequest} xhr
 * @property {PathInfo} pathInfo
 */
