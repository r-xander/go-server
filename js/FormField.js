//@ts-check

/**
 * @typedef Effect
 * @property {() => void} execute
 * @property {Set<Set<Effect>>} dependencies
 */

/** @type {Effect[]} */
let context = [];

/**
 * @template T
 * @param {(...args: any) => T} fn
 * @returns {T}
 */
function untrack(fn) {
    const prevContext = context;
    context = [];
    const res = fn();
    context = prevContext;
    return res;
}

/** @param {Effect} observer */
function cleanup(observer) {
    for (const dep of observer.dependencies) {
        dep.delete(observer);
    }
    observer.dependencies.clear();
}

/**
 * @param {Effect} observer
 * @param {Set<Effect>} subscriptions
 */
function subscribe(observer, subscriptions) {
    subscriptions.add(observer);
    observer.dependencies.add(subscriptions);
}

/** @param {() => void} fn */
function createEffect(fn) {
    /** @type {Effect} */
    const effect = {
        execute() {
            cleanup(effect);
            context.push(effect);
            fn();
            context.pop();
        },
        dependencies: new Set(),
    };

    effect.execute();
}

/**
 * @template T
 * @param {() => T} fn
 * @returns {() => T}
 */
function createMemo(fn) {
    const [signal, setSignal] = createSignal();
    createEffect(() => setSignal(fn()));
    return signal;
}

/** @param {Object} obj */
function createReactiveObject(obj) {
    for (let [key, value] of Object.entries(obj)) {
        if (value instanceof Object) {
            createReactiveObject(value);
        }

        const subscriptions = new Set();

        Object.defineProperty(obj, key, {
            get() {
                const observer = context[context.length - 1];
                if (observer) subscribe(observer, subscriptions);
                return value;
            },
            set(newValue) {
                value = newValue;
                for (const observer of [...subscriptions]) {
                    observer.execute();
                }
            },
        });
    }
}

/** @type {WeakMap<EventTarget, Array<() => void>>} */
const cleanupMap = new WeakMap();

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

/**
 * @param {string} html
 * @returns {HTMLElement}
 */
function parseHtml(html) {
    parseTemplate.innerHTML = html;
    return /** @type {HTMLElement} */ (parseTemplate.content.firstElementChild);
}

class ContainerHighlight extends HTMLElement {
    static observedAttributes = ["active", "field-name", "field-state"];

    /** @type {HTMLElement} */
    nameBlock;

    /** @type {HTMLSpanElement} */
    stateSpan;

    /** @type {HTMLElement} */
    buttonBlock;

    /** @type {HTMLElement} */
    deleteModal;

    constructor() {
        super();

        this.nameBlock = parseHtml(
            `<div class="absolute -left-px bottom-full font-mono flex py-0.5 px-3 gap-3 text-xs text-white bg-sky-500">
                <span class="font-bold italic cursor-default select-none">${this.getAttribute("field-name")}</span>
                <span class="opacity-80"></span>
            </div>`
        );
        this.stateSpan = this.nameBlock.getElementsByTagName("span")[1];

        createEffect(() => (this.stateSpan.style.display = this.getAttribute("state") ? "" : "none"));

        this.buttonsBlock = parseHtml(
            `<div class="absolute -right-px bottom-full flex gap-1">
                <button class="w-5 h-5 p-1 cursor-pointer transition bg-sky-500 text-white hover:bg-sky-600">
                    <svg class="aspect-square fill-current [fill-rule:evenodd] [clip-rule:evenodd]"><use href="#copy-icon" /></svg>
                </button>
                <button class="w-5 h-5 p-1 cursor-pointer transition bg-sky-500 text-white hover:bg-sky-600">
                    <svg class="aspect-square fill-current"><use href="#delete-icon" /></svg>
                </button>
            </div>`
        );

        this.deleteModal = parseHtml(
            `<div style="display: none;" class="grid gap-4 items-center w-max p-4 absolute top-0 -right-0.5 z-50 text-sm shadow-md rounded-md bg-white border border-neutral-200 dark:bg-aux-dark dark:border-aux-dark">
                <h1>Are you sure you want to delete this field?</h1>
                <div class="flex gap-2 justify-self-end">
                    <button class="px-3 py-1.5 rounded transition-all text-white bg-rose-500 hover:bg-rose-600 outline-rose-300/60 dark:bg-opacity-80 dark:hover:bg-opacity-70">Delete</button>
                    <button class="px-3 py-1.5 rounded border transition-all border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:text-white/80 dark:border-[#555] dark:hover:text-white/90 dark:hover:bg-[#3e3e3e]">Cancel</button>
                </div>
            </div>`
        );

        this.append(this.nameBlock, this.buttonsBlock, this.deleteModal);
    }

    connectedCallback() {
        const actionButtons = this.buttonsBlock.getElementsByTagName("button");
        addEvents(actionButtons[0], "click", () => this.dispatchEvent(new CustomEvent("copy-field", { detail: { element: this } })));
        addEvents(actionButtons[1], "click", () => (this.deleteModal.style.display = ""));

        const deleteModalButtons = this.deleteModal.getElementsByTagName("button");
        addEvents(deleteModalButtons[0], "click", () => {
            this.dispatchEvent(new CustomEvent("delete-field"));
            this.deleteModal.style.display = "none";
            this.parentElement.remove();
        });
        addEvents(deleteModalButtons[1], "click", () => (this.deleteModal.style.display = "none"));
    }

    /**
     * @param {string} attribute
     * @param {string} oldValue
     * @param {string} newValue
     */
    attributeChangedCallback(attribute, oldValue, newValue) {
        if (attribute === "active") {
            this.classList.toggle("bg-sky-500/20", newValue !== null);
            this.classList.toggle("invisible", newValue === null);
        } else if (attribute === "field-state") {
            this.stateSpan.style.display = newValue == null ? "none" : "";
            this.stateSpan.textContent = newValue;
        }
    }

    disconnectedCallback() {
        cleanupElement(this);
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
    /** @type {import("../types").FormFieldBaseAttributes} */
    data = null;

    /** @type {boolean} */
    isActive = false;

    /** @type {HTMLElement} */
    label;

    /** @type {HTMLElement} */
    description;

    /** @type {HTMLElement} */
    highlight;

    /** @type {HTMLElement} */
    topDropZone;

    /** @type {HTMLElement} */
    bottomDropZone;

    /**
     * @param {import("../types").FormFieldBaseAttributes} data
     * @param {HTMLElement} input
     */
    constructor(data, input) {
        super();

        createReactiveObject(data);
        this.data = data;
        this.className = "m-6 block relative rounded";
        this.id = this.data.id;

        this.label = parseHtml(
            `<div class="flex gap-1 p-1.5 m-px">
                <label for="${this.data.id}" class="font-medium select-none break-all">Label</label>
                <span class="leading-4 font-semibold text-rose-500">*</span>
            </div>`
        );

        createEffect(() => (this.label.style.display = this.data.label === "" ? "none" : ""));
        createEffect(() => (this.label.firstElementChild.textContent = this.data.label));
        //@ts-ignore
        createEffect(() => (this.label.lastElementChild.style.display = this.data.required ? "" : "none"));

        this.description = parseHtml(
            `<div class="col-span-full break-all">
                <span></span>
            </div>`
        );

        createEffect(() => (this.description.style.display = this.data.description === "" ? "none" : ""));
        createEffect(() => (this.description.firstElementChild.textContent = this.data.description));

        const inputBlock = parseHtml(`<div class="grid grid-cols-[3fr_4fr] gap-1 w-full items-start" inert></div>`);
        inputBlock.append(this.label, input, this.description);

        this.highlight = parseHtml(
            `<container-highlight field-name="${this.data.type}" class="block invisible absolute inset-0 cursor-pointer transition border border-sky-500"></container-highlight>`
        );

        createEffect(() => {
            if (this.data.hidden) this.highlight.setAttribute("field-state", "[Hidden]");
            else if (this.data.readonly) this.highlight.setAttribute("field-state", "[Readonly]");
            else this.highlight.removeAttribute("state");
        });

        this.topDropZone = parseHtml(
            `<container-drop-zone class="absolute -top-2 left-0 right-0 bottom-1/2 text-xs text-white" data-insert-location="beforebegin">
                <div class="absolute -top-0.5 -right-1 -left-1 flex justify-center h-1 rounded-full bg-sky-500" inert>
                    <div class="absolute top-1/2 -translate-y-1/2 px-2 pb-0.5 rounded-full bg-sky-500">Drop Item Here</div>
                </div>
            </container-drop-zone>`
        );

        this.bottomDropZone = parseHtml(
            `<container-drop-zone class="absolute top-1/2 left-0 right-0 -bottom-2 text-xs text-white" data-insert-location="afterend">
                <div class="absolute -bottom-0.5 -right-1 -left-1 flex justify-center h-1 rounded-full bg-sky-500" inert>
                    <div class="absolute top-1/2 -translate-y-1/2 px-2 pb-0.5 rounded-full bg-sky-500">Drop Item Here</div>
                </div>
            </container-drop-zone>`
        );

        createEffect(() => this.classList.toggle("opacity-50", this.data.hidden));
        createEffect(() => this.classList.toggle("grid-cols-[3fr_4fr]", this.data.layout === "inline" && this.data.label !== ""));
        this.append(inputBlock, this.highlight, this.topDropZone, this.bottomDropZone);
    }

    connectedCallback() {
        //local events
        addEvents(this.label, "", () => {});

        // this events
        addEvents(this, "pointerdown", this.sendEditEvent);
        addEvents(this, "pointerover", (/** @type {PointerEvent} */ e) => {
            e.stopPropagation();
            if (!this.isActive) this.highlight.classList.remove("invisible");
        });
        addEvents(this, "pointerout", (/** @type {PointerEvent} */ e) => {
            e.stopPropagation();
            if (!this.isActive) this.highlight.classList.add(!this.isActive && "invisible");
        });

        // global events
        addEvents(window, ["creating", "moving"], () => {
            this.topDropZone.setAttribute("visible", "");
            this.bottomDropZone.setAttribute("visible", "");
        });
        addEvents(window, ["created", "moved"], () => {
            this.topDropZone.removeAttribute("visible");
            this.bottomDropZone.removeAttribute("visible");
        });
        addEvents(window, "click", (/** @type {MouseEvent} */ e) => {
            if (!this.contains(/** @type {Node} */ (e.target))) {
                this.highlight.removeAttribute("active");
                this.isActive = false;
            }
        });

        //complete setup
        this.dispatchEvent(new CustomEvent("addfield", { detail: { data: this.data } }));
        this.sendEditEvent();
    }

    disconnectedCallback() {
        cleanupElement(this);
        this.dispatchEvent(new CustomEvent("remove-field", { detail: { field: this.id } }));
        removeElement(this.parentElement);
    }

    sendEditEvent() {
        this.isActive = true;
        this.highlight.setAttribute("active", "");
        this.highlight.classList.remove("invisible");

        const event = new CustomEvent("edit-field", { detail: { element: this } });
        this.dispatchEvent(event);
    }
}

class TextFormField extends FormFieldBase {
    /** @type {HTMLInputElement} */
    input;

    constructor() {
        /** @type {import("../types").TextFormFieldAttributes} */
        const defaultValues = {
            id: "",
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
        };

        const input = parseHtml(`<input id="${defaultValues.id}" name="${defaultValues.name}" type="text" />`);
        super(defaultValues, input);

        this.input = /** @type {HTMLInputElement} */ (input);
        createEffect(() => (this.input.value = this.data.defaultValue));
        createEffect(() => (this.input.placeholder = this.data.placeholder));
        createEffect(() => (this.input.readOnly = this.data.readonly));
        createEffect(() => (this.input.disabled = this.data.disabled));
    }

    connectedCallback() {
        super.connectedCallback();
        addEvents(this.input, "change", () => (this.input.value = this.data.defaultValue ? this.data.defaultValue : ""));
    }
}

class NumberFormField extends FormFieldBase {
    /** @type {HTMLInputElement} */
    input;

    constructor() {
        const defaultValues = {
            type: "number",
            name: "number",
            label: "Number Input",
            placeholder: "",
            min: 0,
            max: 1000,
            increment: 1,
            decimals: 0,
            defaultValue: "",
            layout: "inline",
            description: "",
            includeLabel: true,
            required: false,
            readonly: false,
            disabled: false,
            hidden: false,
        };

        const input = parseHtml(`<input id="${defaultValues.id}" name="${defaultValues.name}" type="number" />`);
        super(defaultValues, input);

        this.input = /** @type {HTMLInputElement} */ (input);
        createEffect(() => (this.input.value = this.data.defaultValue));
        createEffect(() => (this.input.placeholder = this.data.placeholder));
        createEffect(() => (this.input.readOnly = this.data.readonly));
        createEffect(() => (this.input.disabled = this.data.disabled));
    }

    connectedCallback() {
        super.connectedCallback();
        addEvents(this.input, "change", () => (this.input.value = this.data.defaultValue ? this.data.defaultValue : ""));
    }
}

class SelectFormField extends FormFieldBase {
    /** @type {HTMLSelectElement} */
    dropdown;

    /** @type {HTMLDivElement} */
    optionPanel;

    constructor() {
        const defaultValues = {
            type: "select",
            name: "select",
            label: "Select Input",
            prompt: "",
            options: [],
            multiselect: false,
            columns: 1,
            dropdown: true,
            defaultValue: "",
            layout: "inline",
            description: "",
            includeLabel: true,
            required: false,
            readonly: false,
            disabled: false,
            hidden: false,
        };

        const dropdownContainer = parseHtml(`<div class="relative flex items-center"></div>`);
        const select = parseHtml(`<select class="w-full" id="${defaultValues.id}" name="${defaultValues.name}"></select>`);
        const prompt = parseHtml(`<span class="absolute left-2 text-neutral-400"></span>`);
        dropdownContainer.append(select, prompt);

        const optionPanel = /** @type {HTMLDivElement} */ (parseHtml(`<div class="grid gap-1.5"></div>`));

        const parent = document.createElement("div");
        parent.append(dropdownContainer, optionPanel);

        super(defaultValues, parent);

        this.dropdown = /** @type {HTMLSelectElement} */ (select);
        createEffect(() => (this.dropdown.value = this.data.defaultValue));
        createEffect(() => (this.dropdown.disabled = this.data.disabled));
        createEffect(() => (this.data.readonly ? this.dropdown.setAttribute("readonly", "") : this.dropdown.removeAttribute("readonly")));

        this.optionPanel = optionPanel;
        createEffect(() => {
            this.dropdown.style.display = this.data.dropdown ? "" : "none";
            this.optionPanel.style.display = this.data.dropdown ? "none" : "";
        });
    }

    connectedCallback() {
        super.connectedCallback();
        this.buildOptions();
        addEvents(this.dropdown, "change", () => (this.dropdown.value = this.data.defaultValue ? this.data.defaultValue : ""));
    }

    buildOptions() {
        this.dropdown.innerHTML = "";
        this.optionPanel.innerHTML = "";

        const noOptionSpan = document.createElement("span");
        noOptionSpan.className =
            "col-span-full flex items-center px-3 p-1.5 rounded border border-[#ccc] dark:bg-aux-dark dark:border-aux-dark";
        noOptionSpan.textContent = "No options have been added";
        this.optionPanel.append(noOptionSpan);

        this.data.options.forEach((/** @type {{value: string, label: string}} */ option) => {
            this.dropdown.append(parseHtml(`<option value="${option.value}">${option.label}</option>`));

            const optionElement = parseHtml(
                `<label class="grid grid-cols-[max-content_1fr] items-center gap-5 px-3 py-2 rounded border border-[#ccc] dark:bg-aux-dark dark:border-aux-dark"></label>`
            );
            const input = /** @type {HTMLInputElement}*/ (parseHtml(`<input id="${this.data.id}" name="${this.data.name}" />`));
            const span = parseHtml(`<span></span>`);

            createEffect(() => (input.type = this.data.multiselect ? "checkbox" : "radio"));
            createEffect(() => (input.value = option.value));
            createEffect(() => (span.textContent = option.label));

            this.optionPanel.append(optionElement);
        });
    }
}

customElements.define("container-highlight", ContainerHighlight);
customElements.define("container-drop-zone", ContainerDropZone);
customElements.define("text-field", TextFormField);
customElements.define("number-field", NumberFormField);
customElements.define("select-field", SelectFormField);
