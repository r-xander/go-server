//@ts-check

const ghost = document.createElement("div");
ghost.style.position = "absolute";
ghost.style.top = "-1000px";
ghost.style.backgroundColor = "#121212";
ghost.style.color = "white";
ghost.style.padding = "0.75rem 4rem";
document.body.append(ghost);

const navigationKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "k", "j", "h", "l", "w", "s", "a", "d"];
const upKeys = ["ArrowUp", "k", "w"];
const downKeys = ["ArrowDown", "j", "s"];
const lefttKeys = ["ArrowLeft", "h", "a"];
const rightKeys = ["ArrowRight", "l", "d"];

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

/**
 * @template T
 * @param {T} obj
 * @returns {T}
 */
function createReactiveObject(obj) {
    const newObj = /** @type {T} */ ({});

    for (let [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
            value.forEach((item) => createReactiveObject(item));
        } else if (value instanceof Object) {
            createReactiveObject(value);
        }

        const subscriptions = new Set();
        Object.defineProperty(newObj, key, {
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
            enumerable: true,
        });
    }

    return newObj;
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

/** @param {HTMLElement[]} elements */
function addClickOutsideEvent(elements) {
    window.addEventListener("pointerdown", (/** @type {MouseEvent} */ e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        for (const element of elements) {
            if (!element.contains(target)) {
                element.style.display = "none";
            }
        }
    });
}

/** @param {Element} el */
function cleanupElement(el) {
    cleanupMap.get(el)?.forEach((fn) => fn());

    if (el.childElementCount > 0) {
        [...el.children].forEach((el) => cleanupElement(el));
    }
}

/**
 * @param {string} name
 * @param {Record<string, any>} detail
 * @param {boolean} bubbles
 * @param {boolean} cancelable
 */
function createCustomEvent(name, detail = null, bubbles = true, cancelable = false) {
    return new CustomEvent(name, { detail, bubbles, cancelable });
}

const parseTemplate = document.createElement("template");

/**
 * @param {string} html
 * @returns {HTMLTemplateElement}
 */
function get_fragment(html) {
    parseTemplate.innerHTML = html;
    return parseTemplate;
}

/**
 * @param {string} tag
 * @param {CustomElementConstructor} type
 * @param {string} template
 */
function register(tag, type, template) {
    const t = document.createElement("template");
    t.id = "template-" + tag;
    t.innerHTML = template;
    document.head.append(t);

    customElements.define(tag, type);
}

/**
 * @template T
 * @param {string} html
 * @returns {T}
 */
function parseHtml(html) {
    parseTemplate.innerHTML = html;
    return /** @type {T} */ (parseTemplate.content.firstElementChild);
}

/**
 * @param {Element} el
 * @param  {...string} cls
 */
function toggleClasses(el, ...cls) {
    cls.forEach((cl) => el.classList.toggle(cl));
}

/**
 * @param {Element} el
 * @param {boolean} discriminator
 * @param  {...string} cls
 */
function forceToggleClasses(el, discriminator, ...cls) {
    cls.map((cl) => el.classList.toggle(cl, discriminator));
}

class NewFieldItem extends HTMLElement {
    static observedAttributes = ["type"];

    initialized = false;

    /** @type {HTMLSpanElement} */
    iconPanel = parseHtml(
        `<span class="flex items-center justify-center w-8 h-8 p-1.5 rounded-md bg-[#f1f5f9] text-neutral-500 dark:bg-neutral-600 dark:text-neutral-300"></span>`
    );

    /** @type {HTMLDivElement} */
    labelPanel = parseHtml(
        `<div class="grid">
            <span class="text-base leading-5 text-neutral-700 dark:text-neutral-100"></span>
            <span class="text-xs font-normal text-neutral-500 dark:text-neutral-400"></span>
        </div>`
    );

    initialize() {
        this.append(this.iconPanel, this.labelPanel);
    }

    connectedCallback() {
        if (!this.initialized) {
            this.initialize();
            this.initialized = true;
        }

        this.draggable = true;
        this.className =
            "flex gap-4 p-3 items-center rounded-md origin-center transition-all duration-100 bg-white border border-neutral-200/50 dark:bg-aux-dark dark:border-none hover:[scale:101%] hover:[translate:0_-2px] hover:[box-shadow:0_2px_#00000026] hover:text-indigo-900 hover:dark:text-white";

        addEvents(this, "dragstart", (/** @type {DragEvent} */ e) => {
            window.dispatchEvent(createCustomEvent("creating-field"));
            e.dataTransfer.setData("text/plain", this.getAttribute("type"));
        });
        addEvents(this, "dragend", () => window.dispatchEvent(createCustomEvent("creating-field")));

        const icon = parseHtml(
            `<svg class="w-5 h-5 ${this.getAttribute("icon-class") ?? ""}"><use href="${this.getAttribute("icon-id")}" /></svg>`
        );
        this.iconPanel.append(icon);
        this.labelPanel.children[0].textContent = this.getAttribute("label");
        this.labelPanel.children[1].textContent = this.getAttribute("description");
    }
}

class ContainerHighlight extends HTMLElement {
    static observedAttributes = ["active", "field-name", "field-state"];

    initialized = false;

    /** @type {HTMLDivElement} */
    nameBlock = parseHtml(
        `<div class="absolute -left-px bottom-full font-mono flex py-0.5 px-3 gap-3 text-xs text-white bg-sky-500">
            <span class="font-bold italic cursor-default select-none">${this.getAttribute("field-name")}</span>
            <span class="opacity-80"></span>
        </div>`
    );

    nameSpan = /** @type {HTMLSpanElement} */ (this.nameBlock.children[0]);
    stateSpan = /** @type {HTMLSpanElement} */ (this.nameBlock.children[1]);

    /** @type {HTMLElement} */
    buttonBlock = parseHtml(
        `<div class="absolute -right-px bottom-full flex gap-1 font-mono text-sm">
            <button class="relative transition bg-sky-500 text-white hover:bg-sky-600" tabindex="-1">
                <svg class="p-1 w-5 h-5"><use href="#copy-icon" /></svg>
            </button>
            <button class="relative transition bg-sky-500 text-white hover:bg-sky-600" tabindex="-1">
                <svg class="p-1 w-5 h-5"><use href="#delete-icon" /></svg>
            </button>
        </div>`
    );

    /** @type {HTMLElement} */
    copyModal = parseHtml(
        `<div style="/* display: none; */" class="flex gap-1 absolute inset-0 py-1 pr-1 pl-4 font-bold font-mono bg-[#cfedfb] dark:bg-[#284654]">
            <h1 class="mr-auto leading-7">Are you sure you want to copy this element?</h1>
            <button class="h-7 w-20 px-2 font-medium rounded-sm transition-colors hover:bg-[#b6d8e7] dark:hover:text-white dark:hover:bg-[#1e3541]">Cancel</button>
            <button class="h-7 w-20 px-2 rounded-sm transition-colors text-white bg-sky-500 hover:bg-sky-600/90 dark:bg-opacity-80 dark:hover:bg-opacity-70">Copy</button>
        </div>`
    );

    /** @type {HTMLElement} */
    deleteModal = parseHtml(
        `<div style="display: none;" class="flex gap-1 absolute inset-0 py-1 pr-1 pl-4 font-bold font-mono bg-[#cfedfb] dark:bg-[#284654]">
            <h1 class="mr-auto leading-7">Are you sure you want to delete this element?</h1>
            <button class="h-7 w-20 px-2 font-medium rounded-sm transition-colors hover:bg-[#b6d8e7] dark:hover:text-white dark:hover:bg-[#1e3541]">Cancel</button>
            <button class="h-7 w-20 px-2 rounded-sm transition-colors text-white bg-rose-500 hover:bg-rose-600/90 dark:bg-opacity-80 dark:hover:bg-opacity-70">Delete</button>
        </div>`
    );

    initialize() {
        this.stateSpan.style.display = this.getAttribute("field-state") ? "" : "none";
        this.append(this.nameBlock, this.buttonBlock, this.copyModal, this.deleteModal);
    }

    connectedCallback() {
        if (!this.initialized) {
            this.initialize();
            this.initialized = true;
        }

        const actionButtons = this.buttonBlock.getElementsByTagName("button");
        addEvents(actionButtons[0], "click", () => (this.copyModal.style.display = ""));
        addEvents(actionButtons[1], "click", () => (this.deleteModal.style.display = ""));

        const deleteModalButtons = this.deleteModal.getElementsByTagName("button");
        addEvents(deleteModalButtons[0], "click", () => {
            this.deleteModal.style.display = "none";
            queueMicrotask(() => this.dispatchEvent(createCustomEvent("delete")));
        });
        addEvents(deleteModalButtons[1], "click", () => (this.deleteModal.style.display = "none"));

        const copyModalButtons = this.copyModal.getElementsByTagName("button");
        addEvents(copyModalButtons[0], "click", () => {
            this.copyModal.style.display = "none";
            queueMicrotask(() => this.dispatchEvent(createCustomEvent("copy")));
        });
        addEvents(copyModalButtons[1], "click", () => (this.copyModal.style.display = "none"));
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
        } else if (attribute === "field-name") {
            this.nameSpan.style.display = newValue == null ? "none" : "";
            this.nameSpan.textContent = newValue;
        }
    }

    disconnectedCallback() {
        cleanupElement(this);
    }
}

class ContainerDropZone extends HTMLElement {
    static observedAttributes = ["visible"];

    initialized = false;

    initialize() {
        this.style.display = "none";
        this.style.zIndex = "50";

        this.indicatorSlot = document.createElement("slot");
        const root = this.attachShadow({ mode: "open", slotAssignment: "manual" });
        root.append(this.indicatorSlot);
    }

    connectedCallback() {
        if (!this.initialized) {
            this.initialize();
            this.initialized = true;
        }

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
    data;

    /** @type {boolean} */
    finalized = false;

    /** @type {boolean} */
    isActive = false;

    /** @type {HTMLElement} */
    input;

    /** @type {HTMLDivElement} */
    labelContainer = parseHtml(
        `<div class="flex gap-1 p-1.5 m-px">
            <label class="font-medium select-none break-all">Label</label>
            <span class="leading-4 font-semibold text-rose-500">*</span>
        </div>`
    );

    label = /** @type {HTMLLabelElement} */ (this.labelContainer.children[0]);
    requiredSpan = /** @type {HTMLLabelElement} */ (this.labelContainer.children[1]);
    description = /** @type {HTMLDivElement} */ (parseHtml(`<div class="col-span-full break-all"></div>`));

    /** @type {ContainerHighlight} */
    highlight = parseHtml(
        `<container-highlight class="invisible block absolute inset-0 cursor-pointer transition ring ring-sky-500"></container-highlight>`
    );

    /** @type {ContainerDropZone} */
    topDropZone = parseHtml(
        `<container-drop-zone class="absolute -top-2 left-0 right-0 bottom-1/2 text-xs text-white" data-insert-location="beforebegin">
            <div class="absolute -top-0.5 -right-1 -left-1 flex justify-center h-1 rounded-full bg-sky-500" inert>
                <div class="absolute top-1/2 -translate-y-1/2 px-2 pb-0.5 rounded-full bg-sky-500">Drop Item Here</div>
            </div>
        </container-drop-zone>`
    );

    /** @type {ContainerDropZone} */
    bottomDropZone = parseHtml(
        `<container-drop-zone class="absolute top-1/2 left-0 right-0 -bottom-2 text-xs text-white" data-insert-location="afterend">
            <div class="absolute -bottom-0.5 -right-1 -left-1 flex justify-center h-1 rounded-full bg-sky-500" inert>
                <div class="absolute top-1/2 -translate-y-1/2 px-2 pb-0.5 rounded-full bg-sky-500">Drop Item Here</div>
            </div>
        </container-drop-zone>`
    );

    finalize() {
        this.initialize();

        this.id = this.data.id;
        this.className = "my-2 block relative rounded";
        this.draggable = true;
        this.label.htmlFor = this.data.id;

        const inputBlock = parseHtml(`<div class="grid gap-1 w-full items-start"></div>`);
        inputBlock.append(this.labelContainer, this.input, this.description);
        this.append(inputBlock, this.highlight, this.topDropZone, this.bottomDropZone);

        createEffect(() => (this.labelContainer.style.display = this.data.label === "" ? "none" : ""));
        createEffect(() => (this.labelContainer.children[0].textContent = this.data.label));
        createEffect(() => (this.requiredSpan.style.display = this.data.required ? "" : "none"));

        createEffect(() => (this.description.style.display = this.data.description === "" ? "none" : ""));
        createEffect(() => (this.description.textContent = this.data.description));

        createEffect(() => this.highlight.setAttribute("field-name", this.data.name));
        createEffect(() => {
            if (this.data.hidden) this.highlight.setAttribute("field-state", "[Hidden]");
            else if (this.data.readonly) this.highlight.setAttribute("field-state", "[Readonly]");
            else this.highlight.removeAttribute("state");
        });

        createEffect(() => (inputBlock.style.opacity = this.data.hidden ? "50" : ""));
        createEffect(() => {
            const showLabel = this.data.layout === "inline" && this.data.label !== "" && this.data.includeLabel;
            inputBlock.style.gridTemplateColumns = showLabel ? "3fr 4fr" : "";
        });

        this.dispatchEvent(createCustomEvent("add-field", { data: this.data }));
        this.sendEditEvent();
        transition(this);

        this.finalized = true;
    }

    initialize() {
        const proto = this.constructor.name;
        console.warn(
            `[${proto}]: use initialize() function in subclasses to initialize the element, add effects, and insert dom nodes. You should not use the constructor is derived classes.`
        );
    }

    setup() {
        const proto = this.constructor.name;
        console.warn(`[${proto}]: setup() function is used in subclasses to setup event listeners and other tasks.`);
    }

    connectedCallback() {
        if (!this.finalized) {
            this.finalize();
        }

        this.setup();

        // this events
        addEvents(this, "pointerdown", () => this.sendEditEvent());
        addEvents(this, "pointerover", (/** @type {PointerEvent} */ e) => {
            e.stopPropagation();
            if (!this.isActive) this.highlight.classList.remove("invisible");
        });
        addEvents(this, "pointerout", (/** @type {PointerEvent} */ e) => {
            e.stopPropagation();
            if (!this.isActive) this.highlight.classList.add("invisible");
        });
        addEvents(this, "delete", (/** @type {CustomEvent} */ e) => {
            this.dispatchEvent(createCustomEvent("remove-field", { fieldId: this.data.id }));
            removeElement(this);
        });
        addEvents(this, "dragstart", (e) => {
            ghost.textContent = this.data.name;
            e.dataTransfer.setDragImage(ghost, 0, 0);
            window.dispatchEvent(createCustomEvent("moving-field", { field: this }));
        });
        addEvents(this, "dragend", (e) => window.dispatchEvent(createCustomEvent("moved-field", { field: this })));

        addEvents(this.topDropZone, "dragover", (e) => e.preventDefault());
        addEvents(this.bottomDropZone, "dragover", (e) => e.preventDefault());

        // global events
        addEvents(window, ["creating-field", "moving-field"], (/** @type {CustomEvent} */ e) => {
            if (e.detail.field === this) return;
            this.topDropZone.setAttribute("visible", "");
            this.bottomDropZone.setAttribute("visible", "");
        });
        addEvents(window, ["created-field", "moved-field"], () => {
            this.topDropZone.removeAttribute("visible");
            this.bottomDropZone.removeAttribute("visible");
        });
        addEvents(window, "pointerdown", (/** @type {MouseEvent} */ e) => {
            if (!this.contains(/** @type {Node} */ (e.target))) {
                this.highlight.removeAttribute("active");
                this.isActive = false;
            }
        });
    }

    disconnectedCallback() {
        cleanupElement(this);
    }

    sendEditEvent() {
        this.isActive = true;
        this.highlight.setAttribute("active", "");
        this.highlight.classList.remove("invisible");

        const event = createCustomEvent("edit-field", { element: this });
        this.dispatchEvent(event);
    }
}

class TextFormField extends FormFieldBase {
    /** @type {import("../types").TextFormFieldAttributes} */
    data = createReactiveObject({
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
    });

    input = /** @type {HTMLInputElement} */ (parseHtml(`<input id="${this.data.id}" name="${this.data.name}" type="text" />`));

    initialize() {
        createEffect(() => (this.input.value = this.data.defaultValue));
        createEffect(() => (this.input.placeholder = this.data.placeholder));
        createEffect(() => (this.input.readOnly = this.data.readonly));
        createEffect(() => (this.input.disabled = this.data.disabled));
    }

    setup() {
        addEvents(this.input, "change", () => (this.input.value = this.data.defaultValue ? this.data.defaultValue : ""));
    }
}

/**
 * @class
 * @property {import("../types").NumberInputAttributes} data
 */
class NumberFormField extends FormFieldBase {
    /** @type {import("../types").NumberInputAttributes} */
    data = createReactiveObject({
        id: "",
        type: "number",
        name: "number",
        label: "Number Input",
        placeholder: "",
        min: 0,
        max: 1000,
        step: 1,
        decimals: 0,
        defaultValue: "",
        layout: "inline",
        description: "",
        includeLabel: true,
        required: false,
        readonly: false,
        disabled: false,
        hidden: false,
    });

    /** @type {HTMLInputElement} */
    input = parseHtml(`<input id="${this.data.id}" name="${this.data.name}" type="number" />`);

    initialize() {
        createEffect(() => (this.input.value = this.data.defaultValue));
        createEffect(() => (this.input.placeholder = this.data.placeholder));
        createEffect(() => (this.input.readOnly = this.data.readonly));
        createEffect(() => (this.input.disabled = this.data.disabled));
    }

    setup() {
        addEvents(this.input, "change", () => (this.input.value = this.data.defaultValue ? this.data.defaultValue : ""));
    }
}

class SelectFormField extends FormFieldBase {
    /** @type {import("../types").SelectFormFieldAttributes} */
    data = createReactiveObject({
        id: "",
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
    });

    /** @type {HTMLDivElement} */
    dropdown = parseHtml(
        `<div class="relative flex items-center">
            <select class="w-full" id="${this.data.id}" name="${this.data.name}"></select>
            <span class="absolute left-2 text-neutral-400"></span>
        </div>`
    );
    optionPanel = /** @type {HTMLDivElement} */ parseHtml(`<div class="grid gap-1.5"></div>`);
    select = /** @type {HTMLSelectElement} */ (this.dropdown.firstElementChild);

    initialize() {
        createEffect(() => (this.select.value = this.data.defaultValue));
        createEffect(() => (this.select.disabled = this.data.disabled));
        createEffect(() => (this.data.readonly ? this.select.setAttribute("readonly", "") : this.select.removeAttribute("readonly")));
        createEffect(() => (this.dropdown.lastElementChild.textContent = this.data.prompt));
        createEffect(() => (this.input = this.data.dropdown ? this.dropdown : this.optionPanel));
    }

    setup() {
        this.buildOptions();
    }

    buildOptions() {
        this.select.innerHTML = "";
        this.optionPanel.innerHTML = "";

        const noOptionSpan = document.createElement("span");
        noOptionSpan.className =
            "col-span-full flex items-center px-3 p-1.5 rounded border border-[#ccc] dark:bg-aux-dark dark:border-aux-dark";
        noOptionSpan.textContent = "No options have been added";
        this.optionPanel.append(noOptionSpan);

        this.data.options.forEach((/** @type {{value: string, label: string}} */ option, index) => {
            this.dropdown.append(parseHtml(`<option value="${option.value}">${option.label}</option>`));

            const optionElement = document.createElement("label");
            optionElement.className =
                "grid grid-cols-[max-content_1fr] items-center gap-5 px-3 py-2 rounded border border-[#ccc] dark:bg-aux-dark dark:border-aux-dark";
            const input = /** @type {HTMLInputElement}*/ (parseHtml(`<input id="${this.data.id}" name="${this.data.name}" />`));
            const span = document.createElement("span");

            createEffect(() => (input.type = this.data.multiselect ? "checkbox" : "radio"));
            createEffect(() => (input.value = this.data.options[index].value));
            createEffect(() => (span.textContent = this.data.options[index].label));

            optionElement.append(input, span);
            this.optionPanel.append(optionElement);
        });
    }

    /** @param {import("../types").Option} option */
    addOption(option) {
        this.data.options.push(option);
        this.buildOptions();
    }
}

class CalculationFormField extends FormFieldBase {
    /** @type {import("../types").CalculationFormFieldAttributes} */
    data = createReactiveObject({
        id: "",
        type: "calculation",
        name: "calculation",
        label: "Calculation",
        calculationType: null,
        calculation: "",
        fields: [],
        layout: "inline",
        description: "",
        includeLabel: true,
        required: false,
        readonly: false,
        disabled: true,
        hidden: false,
    });

    input = /** @type {HTMLInputElement} */ (parseHtml(`<input id="${this.data.id}" name="${this.data.name}" type="text" disabled />`));

    initialize() {
        createEffect(() => (this.input.value = this.data.calculation));
    }

    setup() {}

    /** @param {string} field */
    addCalculationField(field) {
        this.data.fields.push(field);
    }

    runCalculation() {}
}

class HeadingFormField extends FormFieldBase {
    /** @type {import("../types").HeadingFormFieldAttributes} */
    data = createReactiveObject({
        id: "",
        type: "heading",
        name: "heading",
        label: "",
        includeLabel: false,
        heading: "Heading",
        align: "center",
        color: "currentColor",
        layout: "inline",
        description: "",
        required: false,
        readonly: false,
        disabled: true,
        hidden: false,
    });

    initialize() {
        this.input = parseHtml('<h2 class="text-xl col-span-full py-3 mb-2"></h2>');
        createEffect(() => (this.input.textContent = this.data.heading));
        createEffect(() => (this.input.style.textAlign = this.data.align));
        createEffect(() => (this.input.style.color = this.data.color));
    }
}

class ParagraphFormField extends FormFieldBase {
    /** @type {import("../types").ParagraphFormFieldAttributes} */
    data = createReactiveObject({
        id: "",
        type: "paragraph",
        name: "paragraph",
        label: "",
        includeLabel: false,
        text: "statement",
        align: "left",
        color: "currentColor",
        layout: "inline",
        description: "",
        required: false,
        readonly: false,
        disabled: true,
        hidden: false,
    });

    initialize() {
        this.input = parseHtml('<p class="col-span-full py-2"></p>');
        createEffect(() => (this.input.textContent = this.data.text));
        createEffect(() => (this.input.style.textAlign = this.data.align));
        createEffect(() => (this.input.style.color = this.data.color));
    }
}

class HTMLFormField extends FormFieldBase {
    /** @type {import("../types").HtmlFormFieldAttributes} */
    data = createReactiveObject({
        id: "",
        type: "html",
        name: "html",
        label: "",
        includeLabel: false,
        html: "",
        layout: "inline",
        description: "",
        required: false,
        readonly: false,
        disabled: true,
        hidden: false,
    });

    initialize() {
        this.input = document.createElement("div");
        createEffect(() => {
            this.input.innerHTML = "";
            this.input.append(...this.sanitizeHtml(this.data.html));
        });
    }

    /**
     * @param {string} htmlStr
     * @returns {Iterable}
     */
    sanitizeHtml(htmlStr) {
        let parser = new DOMParser();
        let doc = parser.parseFromString(htmlStr, "text/html");
        const body = doc.body || document.createElement("body");
        this.clean(body);

        return body.children.length > 0 ? body.children : [];
    }

    /** @param {HTMLElement} element */
    clean(element) {
        for (const node of element.children) {
            if (node.children.length > 0) {
                this.clean(/** @type {HTMLElement} */ (node));
            }

            if (node.localName === "script" || node instanceof HTMLUnknownElement) {
                node.remove();
            }

            for (const attr of node.attributes) {
                const isBadAttr = attr.name.startsWith("on") && ["src", "href", "xlink:href"].includes(attr.name);
                if (isBadAttr) {
                    node.remove();
                }
            }
        }
    }
}

class SliderField extends FormFieldBase {
    /** @type {import("../types").FormFieldBaseAttributes} */
    data = createReactiveObject({
        id: "",
        type: "slider",
        name: "slider",
        label: "Slider",
        includeLabel: true,
        description: "",
        defaultValue: "",
        layout: "inline",
        required: false,
        readonly: false,
        disabled: true,
        hidden: false,
    });

    input = parseHtml(
        `<label class="flex items-center justify-between cursor-pointer select-none">
            <span>Read Only</span>
            <div class="relative">
                <input type="checkbox" id="${this.data.id}" name="${this.data.name}" class="peer sr-only" />
                <div class="block w-16 h-7 m-1 rounded-full transition-colors bg-gray-200 dark:bg-aux-dark ring-offset-2 ring-offset-white dark:ring-offset-card-dark peer-focus:ring-1 peer-checked:bg-sky-500 peer-focus:ring-sky-500 [--tw-shadow:0_0_2px_4px_color-mix(in_oklab,var(--color-sky-500)70%,transparent)]"></div>
                <div class="absolute w-6 h-6 transition bg-white rounded-full left-1.5 top-1.5 peer-checked:translate-x-[150%]"></div>
            </div>
        </label>`
    );

    initialize() {
        createEffect(() => (this.input.children[0].textContent = this.data.label));
        createEffect(() => (this.input.children[1].children[0].name = this.data.name));
    }
}

customElements.define("new-field-item", NewFieldItem);
customElements.define("container-highlight", ContainerHighlight);
customElements.define("container-drop-zone", ContainerDropZone);

customElements.define("text-field", TextFormField);
customElements.define("number-field", NumberFormField);
customElements.define("select-field", SelectFormField);
customElements.define("calculation-field", CalculationFormField);
customElements.define("heading-field", HeadingFormField);
customElements.define("paragraph-field", ParagraphFormField);
customElements.define("html-field", HTMLFormField);
customElements.define("slider-field", SliderField);
