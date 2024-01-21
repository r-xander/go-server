// @ts-check

function getQuery() {
    return editor.getValue(); //.replace(/</g, "&lt;");
}

/*  HTMX listeners  */

// @ts-ignore
document.body.addEventListener("htmx:responseError", function (/** @type {ResponseErrorEvent}*/ e) {
    e.detail.target.innerHTML = e.detail.xhr.responseText;
});

// @ts-ignore
document.body.addEventListener("htmx:beforeRequest", function (/** @type {ResponseErrorEvent}*/ e) {
    e.detail.xhr["startTime"] = e.timeStamp;
});

// @ts-ignore
document.body.addEventListener("htmx:afterRequest", function (/** @type {ResponseErrorEvent}*/ e) {
    if (e.detail.pathInfo.requestPath === "/run") {
        const diff = e.timeStamp - e.detail.xhr["startTime"];
        const time = diff < 1000 ? Math.floor(diff) : (diff / 1000).toFixed(2);
        const timeUnits = diff < 1000 ? " ms" : " s";
        const status = e.detail.xhr.status;

        const timeElement = /** @type {HTMLDivElement}*/ (document.querySelector(".response-time"));
        const statusElement = /** @type {HTMLDivElement}*/ (document.querySelector(".response-status"));
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
