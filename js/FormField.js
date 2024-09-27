//@ts-check

/** @type {WeakMap<EventTarget, Array<() => void>>} */
const cleanupMap = new WeakMap();

/** @param {Element} el */
function registerElementCleanup(el) {
    cleanupMap.set(el, []);
}

/**
 * @param {EventTarget} el
 * @param {string | string[]} event
 * @param {(...e: any | undefined ) => void} fn
 * @param {boolean} useCapture
 */
function addEvents(el, event, fn, useCapture = false) {
    if (typeof event === "string") {
        event = [event];
    }

    if (!cleanupMap.has(el)) {
        cleanupMap.set(el, []);
    }

    const cleanups = cleanupMap.get(el);
    event.forEach((event) => {
        el.addEventListener(event, fn, useCapture);
        cleanups.push(() => el.removeEventListener(event, fn, useCapture));
    });
}

/** @param {Element} el */
function cleanupElement(el) {
    cleanupMap.get(el)?.forEach((fn) => fn());

    if (el.childElementCount > 0) {
        [...el.children].forEach((el) => cleanupElement(el));
    }
}

const parseTemplate = document.createElement("template");

/** @param {string} html */
function parseHtml(html) {
    parseTemplate.innerHTML = html;
    return parseTemplate.content.firstElementChild;
}

class ContainerHighlight extends HTMLElement {
    static observedAttributes = ["active", "type", "state"];

    constructor() {
        super();
        registerElementCleanup(this);
    }

    connectedCallback() {
        const nameBlock = parseHtml(
            `<div class="absolute -left-px bottom-full font-mono flex py-0.5 px-3 gap-3 text-xs text-white bg-sky-500">
                <span class="font-bold italic cursor-default select-none">${this.getAttribute("type")}</span>
                <span class="opacity-80">${this.getAttribute("state")}<span>
            </div>`
        );

        const spans = nameBlock.getElementsByTagName("span");
        addEvents(spans[0], "type-change", (/** @type {CustomEvent} */ e) => (spans[0].textContent = e.detail.attribute));
        addEvents(spans[1], "state-change", (/** @type {CustomEvent} */ e) => (spans[1].textContent = e.detail.state));

        const buttonsBlock = parseHtml(
            `<div class="absolute -right-px bottom-full flex gap-1">
                <button class="w-5 h-5 p-1 cursor-pointer transition bg-sky-500 text-white hover:bg-sky-600">
                    <svg class="aspect-square fill-current [fill-rule:evenodd] [clip-rule:evenodd]"><use href="#copy-icon" /></svg>
                </button>
                <button class="w-5 h-5 p-1 cursor-pointer transition bg-sky-500 text-white hover:bg-sky-600">
                    <svg class="aspect-square fill-current"><use href="#delete-icon" /></svg>
                </button>
            </div>`
        );

        const actionButtons = buttonsBlock.getElementsByTagName("button");
        addEvents(actionButtons[0], "click", () => this.dispatchEvent(new CustomEvent("copy-field")));
        addEvents(actionButtons[1], "click", () => this.showDeleteModal());

        const deleteModal = parseHtml(
            `<div style="display: none;" class="grid gap-4 items-center w-max p-4 absolute top-0 -right-0.5 z-50 text-sm shadow-md rounded-md bg-white border border-neutral-200 dark:bg-aux-dark dark:border-aux-dark">
                <h1>Are you sure you want to delete this field?</h1>
                <div class="flex gap-2 justify-self-end">
                    <button class="px-3 py-1.5 rounded transition-all text-white bg-rose-500 hover:bg-rose-600 outline-rose-300/60 dark:bg-opacity-80 dark:hover:bg-opacity-70">Delete</button>
                    <button class="px-3 py-1.5 rounded border transition-all border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:text-white/80 dark:border-[#555] dark:hover:text-white/90 dark:hover:bg-[#3e3e3e]">Cancel</button>
                </div>
            </div>`
        );

        const deleteModalButtons = deleteModal.getElementsByTagName("button");
        addEvents(deleteModalButtons[0], "click", () => {
            this.dispatchEvent(new CustomEvent("delete-field"));
            this.hideDeleteModal();
        });
        addEvents(deleteModalButtons[1], "click", () => this.hideDeleteModal());

        this.append(nameBlock, buttonsBlock, deleteModal);
    }

    /**
     * @param {string} attribute
     * @param {string} oldValue
     * @param {string} newValue
     */
    attributeChangedCallback(attribute, oldValue, newValue) {
        if (attribute === "active") {
            console.log(attribute, oldValue, newValue);
            this.classList.toggle("bg-sky-500/20", newValue !== null);
            this.classList.toggle("invisible", newValue === null);
        } else if (attribute === "type") {
            this.dispatchEvent(new CustomEvent("type-change", { detail: { attribute: newValue } }));
        } else if (attribute === "state") {
            this.dispatchEvent(new CustomEvent("state-change", { detail: { attribute: newValue } }));
        }
    }

    showDeleteModal() {
        console.log("delete");
        /** @type {HTMLElement} */ (this.lastElementChild).style.display = "";
    }

    hideDeleteModal() {
        /** @type {HTMLElement} */ (this.lastElementChild).style.display = "none";
    }
}

class ContainerDropZone extends HTMLElement {
    static observedAttributes = ["visible"];

    constructor() {
        super();
        this.style.display = "none";

        this.indicatorSlot = document.createElement("slot");
        const root = this.attachShadow({ mode: "open", slotAssignment: "manual" });
        root.append(this.indicatorSlot);

        registerElementCleanup(this);
    }

    connectedCallback() {
        addEvents(this, "dragover", () => this.indicatorSlot.assign(this.firstElementChild));
        addEvents(this, "dragleave", () => this.indicatorSlot.assign());
        addEvents(this, "drop", () => this.indicatorSlot.assign());
    }

    /**
     * @param {string} attribute
     * @param {string} oldValue
     * @param {string} newValue
     */
    attributeChangedCallback(attribute, oldValue, newValue) {
        if (attribute === "visible") {
            this.style.display = newValue !== null ? "block" : "none";
        }
    }

    disconnectedCallback() {
        cleanupElement(this);
    }
}

class FormFieldBase extends HTMLElement {
    /** @type {boolean} */
    isActive = false;

    /** @type {Record<string, any>} */
    data = null;

    /** @type {Map<string, Effect[]>} */
    subscribers;

    /** @param {Record<string, any>} data */
    constructor(data) {
        super();

        this.data = data;
        registerElementCleanup(this);

        //const shadowRoot = this.attachShadow({ mode: "open" });
        //shadowRoot.innerHTML = '<slot></slot><slot name="field-highlight"></slot><slot name="top-drop-zone"></slot><slot name="bottom-drop-zone"></slot>';
        this.className = "m-6 block relative rounded";
    }

    connectedCallback() {
        const inputBlock = parseHtml(
            `<div class="grid grid-cols-[3fr_4fr] gap-1 w-full items-start" inert>
                <div class="flex gap-1 p-1.5 m-px">
                    <label class="font-medium select-none break-all">Label</label>
                    <span class="leading-4 font-semibold text-rose-500">*</span>
                </div>
                <input class="border border-neutral-500" type="text" value="test" />
                <div class="col-span-full break-all">
                    <span></span>
                </div>
            </div>`
        );

        const containerHighlight = parseHtml(
            `<container-highlight type="${this.data.type}" state slot="field-highlight" class="invisible absolute inset-0 cursor-pointer transition border border-sky-500">`
        );

        const topDropZone = parseHtml(
            `<container-drop-zone slot="top-drop-zone" class="absolute -top-2 left-0 right-0 bottom-1/2 text-xs text-white" data-insert-location="beforebegin">
                <div class="absolute -top-0.5 -right-1 -left-1 flex justify-center h-1 rounded-full bg-sky-500" inert>
                    <div class="absolute top-1/2 -translate-y-1/2 px-2 pb-0.5 rounded-full bg-sky-500">Drop Item Here</div>
                </div>
            </container-drop-zone>`
        );

        const bottomDropZone = parseHtml(
            `<container-drop-zone slot="bottom-drop-zone" class="absolute top-1/2 left-0 right-0 -bottom-2 text-xs text-white" data-insert-location="afterend">
                <div class="absolute -bottom-0.5 -right-1 -left-1 flex justify-center h-1 rounded-full bg-sky-500" inert>
                    <div class="absolute top-1/2 -translate-y-1/2 px-2 pb-0.5 rounded-full bg-sky-500">Drop Item Here</div>
                </div>
            </container-drop-zone>`
        );

        addEvents(this, "pointerdown", this.sendEditEvent);
        addEvents(this, "pointerover", this.sendSetHoverEvent);
        addEvents(this, "pointerout", this.sendUnsetHoverEvent);
        addEvents(window, "click", (e) => {
            if (e.target !== this && !this.contains(e.target)) {
                this.querySelector("container-highlight").removeAttribute("active");
                this.isActive = false;
            }
        });
        addEvents(this, ["creating", "moving"], this.showDropZones, true);
        addEvents(this, ["created", "moved"], this.hideDropZones, true);

        this.append(inputBlock, containerHighlight, topDropZone, bottomDropZone);
        this.dispatchEvent(new CustomEvent("addfield", { detail: { data: this.data } }));
        this.sendEditEvent();
    }

    disconnectedCallback() {
        cleanupElement(this);
        this.dispatchEvent(new CustomEvent("remove-field", { detail: { field: this.id } }));
    }

    showDropZones() {
        this.querySelector("[slot='top-drop-zone']").setAttribute("visible", "");
        this.querySelector("[slot='bottom-drop-zone']").setAttribute("visible", "");
    }

    hideDropZones() {
        this.querySelector("[slot='top-drop-zone']").removeAttribute("visible");
        this.querySelector("[slot='bottom-drop-zone']").removeAttribute("visible");
    }

    sendEditEvent() {
        this.isActive = true;
        this.querySelector("container-highlight").setAttribute("active", "");
        this.querySelector("container-highlight").classList.remove("invisible");
        const event = new CustomEvent("edit-field", { detail: { element: this } });
        this.dispatchEvent(event);
    }

    sendSetHoverEvent(e) {
        e.stopPropagation();

        if (!this.isActive) {
            this.querySelector("container-highlight").classList.remove("invisible");
        }

        const event = new CustomEvent("set-hover", { detail: { data: this.data } });
        this.dispatchEvent(event);
    }

    sendUnsetHoverEvent(e) {
        e.stopPropagation();

        if (!this.isActive) {
            this.querySelector("container-highlight").classList.add("invisible");
        }

        const event = new CustomEvent("unset-hover", { detail: { data: this.data } });
        this.dispatchEvent(event);
    }
}

customElements.define("container-highlight", ContainerHighlight);
customElements.define("container-drop-zone", ContainerDropZone);
customElements.define(
    "text-field",
    class TextFormField extends FormFieldBase {
        constructor() {
            super({
                type: "text",
                name: "text",
                label: "Text Input",
                placeholder: "",
                min: 0,
                max: 2000,
                defaultValue: "",
                layout: "inline",
                description: "",
                includeLabel: true,
                required: false,
                readonly: false,
                disabled: false,
                hidden: false,
            });
        }
    }
);
