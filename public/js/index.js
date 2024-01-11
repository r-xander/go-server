const tenantField = document.querySelector(".tenant select");
const usernameField = document.querySelector("input[id=username]");
const passwordField = document.querySelector("input[id=password]");
const sampleCheckbox = document.querySelector("input[id=sample]");

const downloadCsvBtn = document.querySelector("[data-csv-download]");
const saveQueryBtn = document.querySelector("[data-save-query-btn]");
const newQueryBtn = document.querySelector("[data-new-query-btn]");

const queryName = document.querySelector("[data-save-popup-query-name]");
const queryNameDisp = document.querySelector("[data-query-name-display]");

let requestStart = 0;

/**
 *
 * @param {SubmitEvent} event
 */
function handleForm(event) {
    debugger;
    const formData = new FormData(event.target);
    console.log(formData);
}

const form = document.querySelector("[data-query-form]");
form.addEventListener("submit", handleForm);

/**
 * Downloads csv of query results
 *
 */
async function downloadCsv() {
    if (!usernameField.value || !passwordField.value) {
        alert("Credendtials are required");
        return;
    }

    const request = ace.edit("editor").getValue();
    const response = await makeRequest("/csv/download", request);

    if (!response.ok) {
        alert("Failed to download csv\n\nError: " + (await response.text()));
        return;
    }

    const disposition = response.headers.get("Content-Disposition");
    const filename = disposition !== undefined ? disposition.split(";")[1].split("=")[1] : "download";

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
downloadCsvBtn.addEventListener("click", downloadCsv);

/**
 * FUNCTION makeRequest()
 *
 * Makes query request to server
 */

async function makeRequest(url, query) {
    return await fetch(url, {
        method: "POST",
        mode: "cors",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            username: usernameField.value,
            password: passwordField.value,
            tenant: tenantField.value.toUpperCase(),
            sample: sampleCheckbox.checked,
            query,
        }),
    });
}

/**
 * FUNCTION getCount()
 *
 * Gets count of current query
 */

async function getCount(query) {
    console.log(query);
    const countQuery = `select count(1) from (${query})`;
    const response = await makeRequest("/count", countQuery);
    const textResult = await response.text();

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(textResult, "text/xml");
    const row = xmlDoc.getElementsByTagName("R")[0];

    if (row === undefined) return -1;

    return parseInt(row.getElementsByTagName("C")[0].innerHTML);
}

function getQuery() {
    return editor.getValue(); //.replace(/</g, "&lt;");
}

/**
 * FUNCTION runQuery()
 *
 * Gets query results and displays table of results
 */

async function runQuery(editor) {
    const dataElement = document.querySelector(".data");
    const statusElement = document.querySelector(".response-status");
    const timeElement = document.querySelector(".response-time");

    if (!usernameField.value || !passwordField.value || !tenantField.value) {
        dataElement.append(getErrorElement("Credentials are required"));
        return;
    }

    dataElement.innerHTML = "loading...";
    const query = editor.getValue().replace(/</g, "&lt;");
    console.log(query);
    const start = performance.now();
    const result = await makeRequest("/run", query);
    const end = performance.now();

    const status = result.status;
    console.log(status);

    let responseElement;
    if (result.status >= 400) {
        const error = await result.text();
        statusElement.dataset.status = status >= 500 ? "SE" : "RE";
        responseElement = getErrorElement(error);
    } else {
        const response = await result.json();
        console.log(response);
        statusElement.dataset.status = "OK";
        responseElement = getTable(response);
    }
    const diff = end - start;
    const time = diff < 1000 ? Math.floor(diff) : (diff / 1000).toFixed(2);
    const timeUnits = diff < 1000 ? " ms" : " s";

    statusElement.innerText = result.status + " " + result.statusText;
    timeElement.innerText = time + timeUnits;
    timeElement.dataset.hasResponse = true;

    dataElement.innerHTML = null;
    dataElement.append(responseElement);
}

/**
 * FUNCTION getErrorElement()
 *
 * Gets error element of request and displays
 */

function getErrorElement(text) {
    const error = document.createElement("span");
    error.classList.add("warning");
    error.innerText = text;
    return error;
}

/**
 * FUNCTION getTable()
 *
 * Creates table of query results
 */

function getTable(data) {
    const table = document.createElement("table");
    table.classList.add("data-table");

    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");
    table.append(thead);
    table.append(tbody);

    const trHeader = document.createElement("tr");
    for (let column of data[0]) {
        const th = document.createElement("th");
        th.innerHTML = `<span>${column}</span>`;
        trHeader.append(th);
    }
    thead.append(trHeader);

    for (let rowIndex = 1; rowIndex < data.length; ++rowIndex) {
        const tr = document.createElement("tr");
        tbody.append(tr);

        for (let column of data[rowIndex]) {
            const td = document.createElement("td");
            td.innerText = decode(column);
            tr.append(td);
        }
    }

    return table;
}

/**
 * Decodes string returned from query result to to HTML excapes
 *
 * @param {String} str
 */

function decode(str) {
    let txt = document.createElement("textarea");
    txt.innerHTML = str;
    return txt.value;
}

/*  HTMX listeners  */

/**
 * @typedef {CustomEvent<Details>} ResponseErrorEvent
 *
 * @typedef Details
 * @property {Boolean} boosted
 * @property {string} error
 * @property {Object} etc
 * @property {Boolean} Failed
 * @property {Boolean} successful
 * @property {HTMLElement} target
 * @property {XMLHttpRequest} xhr
 */

/**
 * Handle request error with statuscode > 399.
 * Htmx does not swap on errors.
 *
 * @param {ResponseErrorEvent} e
 */
function handleError(e) {
    console.log(e.detail.error);

    e.detail.target.innerHTML = e.detail.xhr.responseText;
}
document.body.addEventListener("htmx:responseError", handleError);

document.body.addEventListener("htmx:beforeRequest", function (/** @type {ResponseErrorEvent}*/ e) {
    console.log(e);
    requestStart = e.timeStamp;
});

document.body.addEventListener("htmx:afterRequest", function (/** @type {ResponseErrorEvent}*/ e) {
    console.log(e);
    if (e.detail.pathInfo.requestPath === "/run") {
        const diff = e.timeStamp - requestStart;
        const time = diff < 1000 ? Math.floor(diff) : (diff / 1000).toFixed(2);
        const timeUnits = diff < 1000 ? " ms" : " s";
        const status = e.detail.xhr.status;

        const timeElement = document.querySelector(".response-time");
        const statusElement = document.querySelector(".response-status");
        statusElement.dataset.status = "OK";

        if (status > 399) {
            statusElement.dataset.status = status > 499 ? "SE" : "RE";
        }

        statusElement.innerText = status + " " + e.detail.xhr.statusText;
        timeElement.innerText = time + timeUnits;
        timeElement.dataset.hasResponse = true;
    }
});

document.addEventListener("htmx:afterOnLoad", function (/** @type {ResponseErrorEvent}*/ e) {
    console.log(e);
});

//
//
// MAIN FUNCTION AREA
//
//
// let editor;
// document.addEventListener("DOMContentLoaded", function (event) {
//     console.log("DOM fully loaded and parsed");
let roEditor;
const editor = ace.edit("editor");
editor.setTheme("ace/theme/monokai");
editor.setShowPrintMargin(false);
editor.setHighlightIndentGuides(true);
editor.setFontSize(10);
editor.session.setMode("ace/mode/sql");
editor.session.setUseWrapMode(true);
editor.renderer.setScrollMargin(5, 0);
// });
