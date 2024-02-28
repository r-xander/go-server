// @ts-check

const addSectionBtn = /** @type {HTMLInputElement} */ (document.getElementById("add-section-button"));
const sectionSortables = [];

addSectionBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const sectionTemplate = /** @type {HTMLTemplateElement} */ (document.getElementById("section-template"));
    const section = /** @type {DocumentFragment} */ (sectionTemplate.content.cloneNode(true));
    const sectionContainer = /** @type {HTMLDivElement} */ (e.target);
    const newSection = sectionContainer.insertAdjacentElement("beforebegin", section.firstElementChild);

    const fieldContainers = newSection.querySelectorAll("[data-section]");
    for (let i = 0; i < fieldContainers.length; ++i) {
        const container = fieldContainers[i];

        /** @type {import("../types").Sortable} */
        // @ts-ignore
        let sortable = new Sortable(container, {
            group: {
                name: "sections",
                pull: true,
                put: true,
            },
            animation: 150,
        });

        sectionSortables.push(sortable);
    }
});

const nodeList = /** @type {NodeListOf<HTMLInputElement>} */ (document.querySelectorAll("[type=checkbox]"));
const listLen = nodeList.length;

for (let i = 0; i < listLen; i += 2) {
    const node = nodeList[i];
    const hiddenNode = nodeList[i + 1];

    const handlerFactory = function (/** @type {HTMLInputElement} */ node) {
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

const csvDownloadBtn = /** @type {HTMLButtonElement} */ (document.querySelector("#csv-download"));
csvDownloadBtn?.addEventListener("click", downloadCsv);
async function downloadCsv() {
    const form = /** @type {HTMLFormElement} */ (document.getElementById("query-form"));
    const formData = new FormData(form);

    formData.set("query", editor.getValue());
    const response = await fetch("/csv", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Process-Type": "csv",
        },
        // @ts-ignore
        body: new URLSearchParams(formData),
    });

    if (!response.ok) {
        alert("Failed to download csv\n\nError: " + (await response.text()));
        return;
    }

    const disposition = response.headers.get("Content-Disposition");
    const filename =
        disposition !== undefined ? /** @type {string} */ (disposition).split(";")[1].split("=")[1] : "download";

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.display = "none";

    document.body.appendChild(link);

    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

/*  Drag & Drop Handlers  */

function dragOver(e) {
    e.preventDefault();
}

function drop(e) {
    e.preventDefault();

    const data = e.dataTransfer?.getData("text/plain");

    if (data !== null || data != undefined) {
        const target = /** @type {HTMLDivElement} */ (e.target).closest("[data-section]");
        const template = /** @type {HTMLTemplateElement} */ (document.getElementById(data));
        const docFrag = document.importNode(template.content, true);
        target?.append(docFrag);

        const child = /** @type {HTMLDivElement} */ (target?.lastElementChild);
        child.style.opacity = "0";
        child.style.translate = "-12px 0";
        window.getComputedStyle(child).opacity;
        child.removeAttribute("style");
    }
}

const newFields = /** @type {NodeListOf<HTMLDivElement>} */ (document.querySelectorAll("[dd-template]"));
let sections;

for (const field of newFields) {
    field.addEventListener("dragstart", (ev) => {
        sections = /** @type {NodeListOf<HTMLDivElement>} */ (document.querySelectorAll("[data-section]"));
        for (const section of sections) {
            section.addEventListener("dragover", dragOver);
            section.addEventListener("drop", drop);
        }

        /** @type {string} */
        // @ts-ignore
        const templateId = ev.target.getAttribute("dd-template");
        ev.dataTransfer?.setData("text/plain", /** @type {string} */ (templateId));
        // console.log(ev);
    });
    field.addEventListener("dragend", (ev) => {
        for (const section of sections) {
            section.removeEventListener("dragover", dragOver);
            section.removeEventListener("drop", drop);
        }
    });
}

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
let editor;
try {
    // @ts-ignore
    editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.setShowPrintMargin(false);
    editor.setHighlightIndentGuides(true);
    editor.setFontSize(10);
    editor.setKeyboardHandler("ace/keyboard/vim");
    editor.setBehavioursEnabled(false);
    editor.session.setMode("ace/mode/sql");
    editor.session.setUseWrapMode(true);
    editor.renderer.setScrollMargin(5, 0);
} catch {}

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
