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

/**
 * @template T
 * @param {T} obj
 * @returns {T}
 */
function createReactiveObject(obj) {
    const newObj = /** @type {T} */ ({});

    for (let [key, value] of Object.entries(obj)) {
        if (value instanceof Object) {
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

const parseTemplate = document.createElement("template");

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

class ContainerHighlight extends HTMLElement {
    static observedAttributes = ["active", "field-name", "field-state"];

    /** @type {HTMLDivElement} */
    nameBlock = parseHtml(
        `<div class="absolute -left-px bottom-full font-mono flex py-0.5 px-3 gap-3 text-xs text-white bg-sky-500">
            <span class="font-bold italic cursor-default select-none">${this.getAttribute("field-name")}</span>
            <span class="opacity-80"></span>
        </div>`
    );

    /** @type {HTMLSpanElement} */
    stateSpan = this.nameBlock.getElementsByTagName("span")[1];

    /** @type {HTMLElement} */
    buttonBlock = parseHtml(
        `<div class="absolute -right-px bottom-full flex gap-1">
            <button class="w-5 h-5 p-1 cursor-pointer transition bg-sky-500 text-white hover:bg-sky-600">
                <svg class="aspect-square fill-current [fill-rule:evenodd] [clip-rule:evenodd]"><use href="#copy-icon" /></svg>
            </button>
            <button class="w-5 h-5 p-1 cursor-pointer transition bg-sky-500 text-white hover:bg-sky-600">
                <svg class="aspect-square fill-current"><use href="#delete-icon" /></svg>
            </button>
        </div>`
    );

    /** @type {HTMLElement} */
    copyModal = parseHtml(
        `<div style="display: none;" class="grid gap-4 items-center w-max p-4 absolute top-0 -right-0.5 z-50 text-sm shadow-md rounded-md bg-white border border-neutral-200 dark:bg-aux-dark dark:border-aux-dark">
            <h1>Are you sure you want to copy this field?</h1>
            <div class="flex gap-2 justify-self-end">
                <button class="px-3 py-1.5 rounded transition-all text-white bg-sky-500 hover:bg-sky-600 outline-sky-300/60 dark:bg-opacity-80 dark:hover:bg-opacity-70">Copy</button>
                <button class="px-3 py-1.5 rounded border transition-all border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:text-white/80 dark:border-[#555] dark:hover:text-white/90 dark:hover:bg-[#3e3e3e]">Cancel</button>
            </div>
        </div>`
    );

    /** @type {HTMLElement} */
    deleteModal = parseHtml(
        `<div style="display: none;" class="grid gap-4 items-center w-max p-4 absolute top-0 -right-0.5 z-50 text-sm shadow-md rounded-md bg-white border border-neutral-200 dark:bg-aux-dark dark:border-aux-dark">
            <h1>Are you sure you want to delete this field?</h1>
            <div class="flex gap-2 justify-self-end">
                <button class="px-3 py-1.5 rounded transition-all text-white bg-rose-500 hover:bg-rose-600 outline-rose-300/60 dark:bg-opacity-80 dark:hover:bg-opacity-70">Delete</button>
                <button class="px-3 py-1.5 rounded border transition-all border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:text-white/80 dark:border-[#555] dark:hover:text-white/90 dark:hover:bg-[#3e3e3e]">Cancel</button>
            </div>
        </div>`
    );

    constructor() {
        super();

        this.stateSpan.style.display = this.getAttribute("field-state") ? "" : "none";
        this.append(this.nameBlock, this.buttonBlock, this.copyModal, this.deleteModal);
    }

    connectedCallback() {
        const actionButtons = this.buttonBlock.getElementsByTagName("button");
        addEvents(actionButtons[0], "click", () => (this.copyModal.style.display = ""));
        addEvents(actionButtons[1], "click", () => (this.deleteModal.style.display = ""));

        const deleteModalButtons = this.deleteModal.getElementsByTagName("button");
        addEvents(deleteModalButtons[0], "click", () => {
            this.deleteModal.style.display = "none";
            queueMicrotask(() => this.dispatchEvent(new CustomEvent("delete", { detail: {}, bubbles: true })));
        });
        addEvents(deleteModalButtons[1], "click", () => (this.deleteModal.style.display = "none"));

        const copyModalButtons = this.copyModal.getElementsByTagName("button");
        addEvents(copyModalButtons[0], "click", () => {
            this.copyModal.style.display = "none";
            queueMicrotask(() => this.dispatchEvent(new CustomEvent("copy", { detail: {}, bubbles: true })));
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
    data;

    /** @type {boolean} */
    initialized = false;

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
        `<container-highlight style="display:none; class="invisible block absolute inset-0 cursor-pointer transition border border-sky-500"></container-highlight>`
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

    initialize() {
        this.initialized = true;

        this.id = this.data.id;
        this.className = "m-6 block relative rounded";
        this.label.htmlFor = this.data.id;
        this.highlight.setAttribute("field-name", this.data.type);

        const inputBlock = parseHtml(`<div class="grid grid-cols-[3fr_4fr] gap-1 w-full items-start"></div>`);
        inputBlock.append(this.labelContainer, this.input, this.description);
        this.append(inputBlock, this.highlight, this.topDropZone, this.bottomDropZone);

        createEffect(() => (this.labelContainer.style.display = this.data.label === "" ? "none" : ""));
        createEffect(() => (this.labelContainer.children[0].textContent = this.data.label));
        createEffect(() => (this.requiredSpan.style.display = this.data.required ? "" : "none"));

        createEffect(() => (this.description.style.display = this.data.description === "" ? "none" : ""));
        createEffect(() => (this.description.textContent = this.data.description));

        createEffect(() => {
            if (this.data.hidden) this.highlight.setAttribute("field-state", "[Hidden]");
            else if (this.data.readonly) this.highlight.setAttribute("field-state", "[Readonly]");
            else this.highlight.removeAttribute("state");
        });

        createEffect(() => this.classList.toggle("opacity-50", this.data.hidden));
        createEffect(() => this.classList.toggle("grid-cols-[3fr_4fr]", this.data.layout === "inline" && this.data.label !== ""));

        this.dispatchEvent(new CustomEvent("add", { detail: { data: this.data } }));
        this.sendEditEvent();
        transition(this);
    }

    sendEditEvent() {
        this.isActive = true;
        this.highlight.setAttribute("active", "");
        this.highlight.classList.remove("invisible");

        const event = new CustomEvent("edit-field", { detail: { element: this } });
        this.dispatchEvent(event);
    }

    setup() {
        console.log("setup() is used in subclasses to setup event listeners and other tasks.");
    }

    connectedCallback() {
        if (!this.initialized) {
            this.initialize();
        }

        this.setup();

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
        addEvents(this, "delete", (/** @type {CustomEvent} */ e) => {
            e.detail.field = this.data.id;
            removeElement(this);
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
    }

    disconnectedCallback() {
        cleanupElement(this);
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

    constructor() {
        super();

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

    constructor() {
        super();

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
    input = parseHtml(
        `<div>
            <div class="relative flex items-center">
                <select class="w-full" id="${this.data.id}" name="${this.data.name}"></select>
                <span class="absolute left-2 text-neutral-400"></span>
            </div>
            <div class="grid gap-1.5"></div>
        </div>`
    );

    dropdown = /** @type {HTMLDivElement} */ (this.input.firstElementChild);
    select = /** @type {HTMLSelectElement} */ (this.dropdown.firstElementChild);
    optionPanel = /** @type {HTMLDivElement} */ (this.input.lastElementChild);

    constructor() {
        super();

        createEffect(() => (this.select.value = this.data.defaultValue));
        createEffect(() => (this.select.disabled = this.data.disabled));
        createEffect(() => (this.data.readonly ? this.select.setAttribute("readonly", "") : this.select.removeAttribute("readonly")));

        createEffect(() => (this.dropdown.lastElementChild.textContent = this.data.prompt));
        createEffect(() => {
            this.dropdown.style.display = this.data.dropdown ? "" : "none";
            this.optionPanel.style.display = this.data.dropdown ? "none" : "";
        });
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

    /** @param {import("../types").Option} option */
    addOption(option) {
        this.data.options.push(option);
        this.buildOptions();
    }
}

class MapModal extends HTMLElement {
    /** @type {import("../types").MapAttributes} */
    data = createReactiveObject({
        hasLocation: true,
        streetNumber: "6801",
        street: "Industrial Rd",
        city: "Springfield",
        state: "VA",
        zip: "22151",
        lat: 0,
        long: 0,
    });

    /** @type {LocationFormField} */
    activeElement;

    /** @type {import("../types").Map} */
    map;

    /** @type {import("../types").Marker} */
    marker;

    /** @type {HTMLDialogElement} */
    mapModal = parseHtml(
        `<dialog class="relative backdrop:bg-gray-400/40 open:flex flex-col w-[60dvw] h-[85dvh] p-4 shadow-lg rounded-md bg-white dark:bg-card-dark">
            <div class="relative flex px-4 py-2 -mx-4 -mt-4">
                <h2>Select a Location</h2>
                <button class="absolute right-4 p-1 rounded hover:bg-gray-100 dark:hover:bg-accent-dark dark:hover:text-white">
                    <svg viewBox="0 0 1024 1024" class="w-4 h-4 fill-current [fill-rule:evenodd]"><use href="#close-icon" /></svg>
                </button>
            </div>
            <div id="map-popup" class="flex-1 h-full rounded border-2 border-black/20 dark:border-[#73737366] dark:!bg-[#121212]"></div>
            <div class="absolute bottom-8 left-1/2 -translate-x-1/2 grid grid-cols-2 gap-x-12 gap-y-4 p-4 z-[10000] text-sm rounded-lg border-2 bg-white border-black/20 dark:bg-card-dark dark:border-[#73737366]">
                <div class="row-span-2">
                    <h3></h3>
                    <span class="text-xs text-neutral-400"></span>
                    <hr class="mt-3 mb-2" />
                    <span class="text-xs text-[#2cb9e3]"></span>
                </div>        
                <button class="px-5 py-1.5 rounded border text-white bg-[var(--primary)] border-[var(--primary)]">Use Location</button>
                <button class="px-5 py-1.5 rounded border border-gray-200 dark:border-[#434343]">Clear</button>
            </div>
        </dialog>`
    );

    header = /** @type {HTMLDivElement} */ (this.mapModal.children[0]);
    mapElement = /** @type {HTMLDivElement} */ (this.mapModal.children[1]);
    locationPanel = /** @type {HTMLDivElement} */ (this.mapModal.children[2]);

    constructor() {
        super();
        this.append(this.mapModal);

        this.map = L.map("map-popup")
            .on("locationerror", () => alert("error finding location"))
            .on("locationfound", this.setMarker.bind(this))
            .on("click", this.setMarker.bind(this));

        this.marker = L.marker([this.data.lat, this.data.long], { draggable: true, autoPan: true })
            .on("dragend", this.dragEnd.bind(this))
            .addTo(this.map);

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
            className: "map-tiles",
        }).addTo(this.map);
        L.control.currentLocation().addTo(this.map);
        L.control.search().addTo(this.map);

        const locationDisplay = this.locationPanel.children[0];
        const streetAddress = locationDisplay.children[0];
        const statePart = locationDisplay.children[1];
        const latLong = locationDisplay.children[3];

        createEffect(() => (this.locationPanel.style.display = this.data.hasLocation ? "" : "none"));
        createEffect(() => (streetAddress.textContent = `${this.data.streetNumber} ${this.data.street}`));
        createEffect(() => (statePart.textContent = `${this.data.city}, ${this.data.state} ${this.data.zip}`));
        createEffect(() => (latLong.textContent = `${this.data.lat.toFixed(8)}, ${this.data.long.toFixed(8)}`));
    }

    connectedCallback() {
        addEvents(this.header.children[1], "click", () => this.mapModal.close());
        addEvents(this.locationPanel.children[1], "click", () => {
            this.activeElement.setLocationData(this.data);
            this.activeElement = null;
            this.mapModal.close();
        });
        addEvents(this.locationPanel.children[2], "click", () => {
            Object.keys(this.data).forEach((key) => (this.data[key] = typeof this.data[key] === "string" ? null : 0));
            this.data.hasLocation = false;
            this.marker.remove();
        });
    }

    /** @param {LocationFormField} el */
    open(el) {
        this.activeElement = el;
        this.mapModal.showModal();
        this.map.invalidateSize().locate({ setView: true, maxZoom: 16 });
    }

    dragEnd() {
        var position = this.marker.getLatLng();
        this.data.hasLocation = true;
        this.data.streetNumber = "6801";
        this.data.street = "Industrial Rd";
        this.data.city = "Springfield";
        this.data.state = "VA";
        this.data.zip = "22151";
        this.data.lat = position.lat;
        this.data.long = position.lng;
    }

    /** @param {import("../types").LeafletMouseEvent} e */
    setMarker(e) {
        this.data.hasLocation = true;
        this.data.streetNumber = "6801";
        this.data.street = "Industrial Rd";
        this.data.city = "Springfield";
        this.data.state = "VA";
        this.data.zip = "22151";
        this.data.lat = e.latlng.lat;
        this.data.long = e.latlng.lng;
        this.marker.setLatLng(e.latlng).addTo(this.map);
    }
}

class LocationFormField extends FormFieldBase {
    /** @type {import("../types").LocationFormFieldAttributes} */
    data = createReactiveObject({
        id: "",
        type: "location",
        name: "location",
        label: "Location",
        placeholder: "Address",
        address: "",
        streetNumber: "",
        street: "",
        city: "",
        state: "",
        zip: "",
        lat: 0,
        long: 0,
        defaultCurrent: false,
        layout: "inline",
        description: "",
        includeLabel: true,
        required: false,
        readonly: false,
        disabled: false,
        hidden: false,
    });

    /** @type {HTMLDivElement} */
    input = parseHtml(
        `<div class="relative grid grid-cols-3 gap-1.5">
            <button class="absolute w-5 h-5 top-1.5 right-2.5 mt-px text-neutral-400 hover:text-neutral-400 dark:text-neutral-400/80" tabindex="-1">
                <svg class="aspect-square fill-current [fill-rule:evenodd] [clip-rule:evenodd]"><use href="#location-icon" /></svg>
            </button>
            <input type="text" class="col-span-full" style="padding-right: 3.25rem" />
        </div>`
    );

    /** @type {MapModal} */
    mapModal = document.querySelector("map-modal");

    constructor() {
        super();

        const input = this.input.getElementsByTagName("input")[0];
        input.id = this.data.id + "-address";
        input.name = this.data.id + "-address";
        createEffect(() => (input.placeholder = this.data.placeholder));
        createEffect(() => (input.value = this.data.address));
    }

    setup() {
        addEvents(this.input.children[0], "click", () => this.mapModal.open(this));
    }

    /** @param {import("../types").MapAttributes} data */
    setLocationData(data) {
        this.data.address = `${data.streetNumber} ${data.street}, ${data.city}, ${data.state} ${data.zip}`;
        this.data.streetNumber = data.streetNumber;
        this.data.street = data.street;
        this.data.city = data.city;
        this.data.state = data.state;
        this.data.zip = data.zip;
        this.data.lat = data.lat;
        this.data.long = data.long;
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

    constructor() {
        super();

        createEffect(() => (this.input.value = this.data.calculation));
    }

    setup() {}

    /** @param {string} field */
    addCalculationField(field) {
        this.data.fields.push(field);
    }

    runCalculation() {}
}

class CalendarModal extends HTMLElement {
    today = new Date();
    days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    monthStrings = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
    months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    dateElements = /** @type {HTMLButtonElement[]} */ ([]);
    yearElements = /** @type {HTMLButtonElement[]} */ ([]);

    /** @type {DateTimeFormField} */
    refElement;

    /** @type {import("../types").CalendarAttributes} */
    data = createReactiveObject({
        internalDate: this.today,
        year: this.today.getFullYear(),
        month: this.today.getMonth(),
        day: this.today.getDate(),
        hour: this.today.getHours(),
        minute: this.today.getMinutes(),
        activeYear: this.today.getFullYear(),
        activeMonth: this.today.getMonth(),
        hourTemp: null,
        minuteTemp: null,
    });

    /** @type {HTMLDivElement} */
    header = parseHtml(
        `<div class="flex w-full items-center justify-between p-3 border-b border-neutral-200 text-neutral-500 dark:border-[#5e5e5e] dark:text-white/75">
            <button class="flex items-center gap-1 font-bold hover:text-neutral-800 dark:hover:text-white">
                <span></span>
                <svg class="w-4 h-4 fill-current"><use href="#caretdown-icon" /></svg>
            </button>
            <div class="flex gap-1">
                <button class="rounded-full p-1 hover:text-neutral-800 dark:hover:text-white">
                    <svg class="w-4 h-4 fill-current"><use href="#caretleft-icon" /></svg>
                </button>
                <button class="rounded-full p-1 hover:text-neutral-800 dark:hover:text-white">
                    <svg class="w-4 h-4 fill-current"><use href="#caretright-icon" /></svg>
                </button>
            </div>
        </div>`
    );

    monthYearButton = /** @type {HTMLButtonElement} */ (this.header.children[0]);
    previousMonthButton = /** @type {HTMLButtonElement} */ (this.header.children[1].children[0]);
    nextMonthButton = /** @type {HTMLButtonElement} */ (this.header.children[0].children[1]);

    /** @type {HTMLDivElement} */
    mainPanel = parseHtml(
        `<div class="p-3">
            <div class="grid grid-cols-7 gap-0.5 w-60 mb-1 items-center justify-items-center font-mono"></div>
            <div class="flex relative items-center justify-center mt-3">
                <span class="font-semibold mr-2">Time:</span>
                <input type="text" class="w-10 hide-arrows text-center" />
                <div class="grid gap-y-1 ml-1">
                    <button tabindex="-1"><svg class="w-4 h-4 fill-current rotate-180"><use href="#caretup-icon" /></svg></button>
                    <button tabindex="-1"><svg class="w-4 h-4 fill-current"><use href="#caretdown-icon" /></svg></button>
                </div>
                <div style="display: none;" class="invisible absolute bottom-[calc(100%+0.25rem)] left-0 grid w-max grid-cols-4 justify-items-center gap-2 p-4 rounded shadow-lg bg-white dark:bg-neutral-600"></div>
                <span class="mx-2">:</span>
                <input type="text" class="w-10 hide-arrows text-center" />
                <div class="grid gap-y-1 ml-1">
                    <button tabindex="-1"><svg class="w-4 h-4 fill-current rotate-180"><use href="#caretup-icon" /></svg></button>
                    <button tabindex="-1"><svg class="w-4 h-4 fill-current"><use href="#caretdown-icon" /></svg></button>
                </div>
                <div style="display: none;" class="invisible absolute bottom-[calc(100%+0.25rem)] right-0 grid w-max grid-cols-4 justify-items-center gap-2 p-4 rounded shadow-lg bg-white dark:bg-neutral-600"></div>
            </div>
        </div>`
    );

    dateContainer = /** @type {HTMLDivElement} */ (this.mainPanel.children[0]);
    timeContainer = /** @type {HTMLDivElement} */ (this.mainPanel.children[1]);
    hourInput = /** @type {HTMLInputElement} */ (this.mainPanel.children[1].children[1]);
    hourButtonContainer = /** @type {HTMLDivElement} */ (this.mainPanel.children[1].children[2]);
    hourOptionContainer = /** @type {HTMLDivElement} */ (this.mainPanel.children[1].children[3]);
    minuteInput = /** @type {HTMLInputElement} */ (this.mainPanel.children[1].children[5]);
    minuteButtonContainer = /** @type {HTMLDivElement} */ (this.mainPanel.children[1].children[6]);
    minuteOptionContainer = /** @type {HTMLDivElement} */ (this.mainPanel.children[1].children[7]);

    /** @type {HTMLDivElement} */
    footer = parseHtml(
        `<div class="flex justify-around w-full border-t border-neutral-200 dark:border-[#5e5e5e]">
            <button class="w-full p-3 hover:bg-neutral-200 hover:text-neutral-800 dark:hover:bg-[#5e5e5e] hover:dark:text-white">Clear</button>
            <button class="w-full p-3 hover:bg-neutral-200 hover:text-neutral-800 dark:hover:bg-[#5e5e5e] hover:dark:text-white">Today</button>
            <button class="w-full p-3 hover:bg-neutral-200 hover:text-neutral-800 dark:hover:bg-[#5e5e5e] hover:dark:text-white">Close</button>
        </div>`
    );

    /** @type {HTMLDivElement} */
    monthYearPanel = parseHtml(
        `<div style="display: none;" class="absolute z-[100] flex inset-0 flex-col rounded bg-white dark:bg-neutral-800">
            <div class="grid w-full grid-cols-4 justify-items-center gap-2 p-4 border-b dark:border-neutral-700"></div>
            <div class="flex justify-center gap-1 mt-4">
                <button class="rounded-full p-1 hover:text-neutral-800 dark:hover:text-white">
                    <svg class="w-4 h-4 fill-current"><use href="#caretleft-icon" /></svg>
                </button>
                <button class="rounded-full p-1 hover:text-neutral-800 dark:hover:text-white">
                    <svg class="w-4 h-4 fill-current"><use href="#caretright-icon" /></svg>
                </button>
            </div>
            <div class="grid w-full grid-cols-4 justify-items-center gap-2 p-4"></div>
            <div class="mt-auto flex h-12 w-full divide-x border-t dark:divide-neutral-700 dark:border-neutral-700">
                <button class="flex-1 font-bold">OK</button>
                <button class="flex-1 font-bold">Cancel</button>
            </div>
        </div>`
    );

    monthOptionContainer = /** @type {HTMLDivElement} */ (this.monthYearPanel.children[0]);
    yearButtonContainer = /** @type {HTMLDivElement} */ (this.monthYearPanel.children[1]);
    yearOptionContainer = /** @type {HTMLDivElement} */ (this.monthYearPanel.children[2]);
    monthYearFooter = /** @type {HTMLDivElement} */ (this.monthYearPanel.children[3]);

    constructor() {
        super();

        this.tabIndex = 0;
        this.style.display = "none";
        this.className = "absolute z-50 w-max text-sm rounded select-none outline-none shadow-lg border bg-white dark:bg-[#434343]";
        this.append(this.header, this.mainPanel, this.footer, this.monthYearPanel);

        for (const day of this.days) {
            const dayElement = parseHtml(`<span class="w-full text-center font-bold">${day}</span>`);
            this.dateContainer.append(dayElement);
        }

        for (var i = 0; i < 42; ++i) {
            const dateElement = /** @type {HTMLButtonElement} */ (parseHtml(`<button class="w-full aspect-square rounded-md"></button>`));
            this.dateElements.push(dateElement);
            this.dateContainer.append(dateElement);
            createEffect(() => {
                const date = new Date(+dateElement.dataset.year, +dateElement.dataset.month, +dateElement.dataset.day);
                const isActive = date.getDate() === this.data.day && date.getMonth() === this.data.month;
                forceToggleClasses(dateElement, isActive, "font-semibold", "bg-sky-500/20", "text-sky-500");
                forceToggleClasses(dateElement, !isActive, "hover:bg-neutral-200", "dark:hover:bg-[#5e5e5e]", "dark:hover:text-white");
                forceToggleClasses(dateElement, date.getMonth() !== this.data.month, "text-[#333]/50", "dark:text-white/40");
            });
        }

        for (var i = 0; i < 24; ++i) {
            const hourElement = parseHtml(`<button class="w-8 aspect-square rounded-md">${i.toString().padStart(2, "0")}</button>`);
            this.hourOptionContainer.append(hourElement);
            createEffect(() => {
                const isActive = +hourElement.textContent === this.data.hour;
                forceToggleClasses(hourElement, isActive, "font-semibold", "bg-sky-500/20", "text-sky-500");
                forceToggleClasses(hourElement, !isActive, "hover:bg-neutral-200", "dark:hover:bg-[#5e5e5e]", "dark:hover:text-white");
            });
        }

        for (var i = 0; i < 60; i += 5) {
            const minuteElement = parseHtml(`<button class="w-8 aspect-square rounded-md">${i.toString().padStart(2, "0")}</button>`);
            this.minuteOptionContainer.append(minuteElement);
            createEffect(() => {
                const isActive = +minuteElement.textContent === this.data.minute;
                forceToggleClasses(minuteElement, isActive, "font-semibold", "bg-sky-500/20", "text-sky-500");
                forceToggleClasses(minuteElement, !isActive, "hover:bg-neutral-200", "dark:hover:bg-[#5e5e5e]", "dark:hover:text-white");
            });
        }

        for (const [index, month] of this.monthStrings.entries()) {
            const monthElement = parseHtml(`<button class="aspect-[2/1] w-full py-1.5 rounded text-center">${month.slice(0, 3)}</button>`);
            this.monthOptionContainer.append(monthElement);
            createEffect(() => {
                const isActive = index === this.data.activeMonth;
                forceToggleClasses(monthElement, isActive, "font-semibold", "bg-sky-500/20", "text-sky-500");
                forceToggleClasses(monthElement, !isActive, "hover:bg-neutral-200", "dark:hover:bg-[#5e5e5e]", "dark:hover:text-white");
            });
        }

        for (var i = 0; i < 8; ++i) {
            const yearElement = parseHtml(`<button class="aspect-[2/1] w-full py-1.5 rounded text-center"></button>`);
            this.yearElements.push(yearElement);
            this.yearOptionContainer.append(yearElement);
            createEffect(() => {
                const isActive = +yearElement.textContent === this.data.activeYear;
                forceToggleClasses(yearElement, isActive, "font-semibold", "bg-sky-500/20", "text-sky-500");
                forceToggleClasses(yearElement, !isActive, "hover:bg-neutral-200", "dark:hover:bg-[#5e5e5e]", "dark:hover:text-white");
            });
        }

        createEffect(() => this.updateCalendar(new Date(this.data.year, this.data.month, this.data.day, this.data.hour, this.data.minute)));
        createEffect(() => this.updateCalendar(this.data.internalDate));
        createEffect(() => (this.hourInput.value = this.data.hour.toString().padStart(2, "0")));
        createEffect(() => (this.minuteInput.value = this.data.minute.toString().padStart(2, "0")));
        // createEffect(() => this.updateYears(this.data.activeYear));
    }

    connectedCallback() {
        addEvents(this.monthYearButton, "click", () => (this.monthYearPanel.style.display = ""));
        addEvents(this.previousMonthButton, "click", () => this.getPrevMonth());
        addEvents(this.nextMonthButton, "click", () => this.getNextMonth());

        addEvents(this.dateContainer, "wheel", (/** @type {WheelEvent} */ e) => this.changeMonthOnWheel(e));
        this.dateElements.forEach((el) =>
            addEvents(el, "click", () =>
                this.handleDateSelection(new Date(+el.dataset.year, +el.dataset.month, +el.dataset.day, this.data.hour, this.data.minute))
            )
        );

        addEvents(this.hourInput, "keydown", (/** @type {KeyboardEvent} */ e) => this.handleHourChange(e));
        addEvents(this.hourInput, "focus", () => (this.hourOptionContainer.style.display = ""));
        addEvents(this.hourButtonContainer.children[0], "click", () => (this.data.hour++ === 23 ? (this.data.hour = 0) : null));
        addEvents(this.hourButtonContainer.children[1], "click", () => (this.data.hour-- === 0 ? (this.data.hour = 23) : null));
        Array.from(this.hourOptionContainer.children).forEach((el) => {
            addEvents(el, "click", () => (this.data.hour = +el.textContent));
        });

        addEvents(this.minuteInput, "keydown", (/** @type {KeyboardEvent} */ e) => this.handleMinuteChange(e));
        addEvents(this.minuteInput, "focus", () => (this.minuteOptionContainer.style.display = ""));
        addEvents(this.minuteButtonContainer.children[0], "click", () => (this.data.minute++ === 59 ? (this.data.minute = 0) : null));
        addEvents(this.minuteButtonContainer.children[1], "click", () => (this.data.minute-- === 0 ? (this.data.minute = 59) : null));
        Array.from(this.minuteOptionContainer.children).forEach((el) => {
            addEvents(el, "click", () => (this.data.minute = +el.textContent));
        });

        addEvents(this.footer.children[0], "click", () => this.clearValue());
        addEvents(this.footer.children[1], "click", () => this.handleDateSelection(new Date()));
        addEvents(this.footer.children[2], "click", () => this.close());

        Array.from(this.monthOptionContainer.children).forEach((/** @type {HTMLElement} */ el, index) => {
            addEvents(el, "click", () => (this.data.activeMonth = index));
            addEvents(el, "dblclick", () => this.handleDateChange());
        });

        addEvents(this.yearButtonContainer.children[0], "click", () => this.updateYears(+this.yearElements[2].textContent));
        addEvents(this.yearButtonContainer.children[1], "click", () => this.updateYears(+this.yearElements[4].textContent));
        this.yearElements.forEach((el) => {
            addEvents(el, "click", () => (this.data.activeYear = +el.textContent));
            addEvents(el, "dblclick", () => this.handleDateChange());
        });

        addEvents(this.monthYearFooter.children[0], "click", () => this.handleDateChange());
        addEvents(this.monthYearFooter.children[1], "click", () => (this.monthYearPanel.style.display = "none"));

        addEvents(this, "keydown", (/** @type {KeyboardEvent} */ e) => this.handleCalendarKeydown(e));
        addEvents(window, "pointerdown", (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            if (!this.contains(target)) {
                this.close();
            }

            for (const element of [this.monthYearPanel, this.hourOptionContainer, this.minuteOptionContainer]) {
                if (!element.contains(target)) {
                    element.style.display = "none";
                }
            }
        });
    }

    /**
     * @param {string} attribute
     * @param {string} oldValue
     * @param {string} newValue
     */
    attributeChangedCallback(attribute, oldValue, newValue) {
        if (attribute === "type") {
            this.dateContainer.style.display = newValue == "time" ? "none" : "";
            this.timeContainer.style.display = newValue === "date" ? "none" : "";
        }
    }

    clearValue() {
        this.handleDateChange(new Date());
        this.refElement.setDate(null);
    }

    handleDateSelection(/** @type {Date} */ date) {
        this.refElement.setDate(date);
        this.handleDateChange(date);
        this.close();
    }

    handleDateChange(/** @type {Date} */ date) {
        date ??= new Date(this.data.activeYear, this.data.activeMonth, this.data.day, this.data.hour, this.data.minute);
        this.data.internalDate = date;
        this.data.year = date.getFullYear();
        this.data.month = date.getMonth();
        this.data.day = date.getDate();
        this.data.hour = date.getHours();
        this.data.minute = date.getMinutes();
        this.data.activeYear = date.getFullYear();
        this.data.activeMonth = date.getMonth();
        this.monthYearButton.children[0].textContent = `${this.monthStrings[this.data.month]} ${this.data.year}`;
        this.monthYearPanel.style.display = "none";

        this.updateCalendar(date);
    }

    updateCalendar(/** @type {Date} */ date) {
        const year = date.getFullYear();
        const month = date.getMonth();

        let firstDay = -new Date(year, month, 1).getDay();

        for (const dateElement of this.dateElements) {
            let newDate = new Date(year, month, ++firstDay);
            dateElement.textContent = newDate.getDate().toString();
            dateElement.dataset.year = newDate.getFullYear().toString();
            dateElement.dataset.month = newDate.getMonth().toString();
            dateElement.dataset.day = newDate.getDate().toString();
        }

        this.updateYears(year);
    }

    /** @param {number} [year] */
    updateYears(year) {
        let startYear = year - 3;
        for (const yearElement of this.yearElements) {
            yearElement.textContent = (startYear++).toString();
            const isActive = +yearElement.textContent === this.data.activeYear;
            forceToggleClasses(yearElement, isActive, "font-semibold", "bg-sky-500/20", "text-sky-500");
            forceToggleClasses(yearElement, !isActive, "hover:bg-neutral-200", "dark:hover:bg-[#5e5e5e]", "dark:hover:text-white");
        }
    }

    getNextMonth() {
        this.handleDateChange(new Date(this.data.year, this.data.month + 1, this.data.day, this.data.hour, this.data.minute));
    }

    getPrevMonth() {
        this.handleDateChange(new Date(this.data.year, this.data.month - 1, this.data.day, this.data.hour, this.data.minute));
    }

    changeMonthOnWheel(/** @type {WheelEvent} */ e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (e.deltaY === 0) {
            return;
        }

        const date = new Date(this.data.year, this.data.month + (e.deltaY < 0 ? -1 : 1), this.data.day, this.data.hour, this.data.minute);
        this.handleDateChange(date);
    }

    handleCalendarKeydown(/** @type {KeyboardEvent} */ e) {
        const key = e.key;

        if (key === "Enter") {
            this.handleDateSelection(this.data.internalDate);
        } else if (key === "Escape") {
            this.close();
        }

        if (key.indexOf("Arrow") === -1) {
            return;
        }

        e.preventDefault();
        const date = new Date(this.data.internalDate);
        if (key === "ArrowUp") {
            date.setDate(this.data.day - 7);
        } else if (key === "ArrowDown") {
            date.setDate(this.data.day + 7);
        } else if (key === "ArrowLeft") {
            date.setDate(this.data.day - 1);
        } else if (key === "ArrowRight") {
            date.setDate(this.data.day + 1);
        }
        this.handleDateChange(date);
    }

    handleHourChange(/** @type {KeyboardEvent} */ e) {
        e.stopPropagation();
        e.stopImmediatePropagation();

        const key = e.key;
        if (key.length === 1 && /[ -~]/.test(key)) {
            e.preventDefault();
        } else if (key === "ArrowUp") {
            this.data.hour = this.data.hour + 1 > 23 ? 0 : this.data.hour + 1;
        } else if (key === "ArrowDown") {
            this.data.hour = this.data.hour - 1 < 0 ? 23 : this.data.hour - 1;
        }

        if (!/[0-9]/.test(key)) {
            return;
        }

        if (/[3-9]/.test(key) || this.data.hourTemp !== null) {
            if (!(this.data.hourTemp === "2" && /[4-9]/.test(key))) {
                this.data.hour = +[this.data.hourTemp, key].join("");
            }
            this.data.hourTemp = null;
            this.hourInput.blur();
            this.minuteInput.focus();
        } else {
            this.data.hourTemp = key;
            this.data.hour = +key;
        }
    }

    handleMinuteChange(/** @type {KeyboardEvent} */ e) {
        e.stopPropagation();
        e.stopImmediatePropagation();

        const key = e.key;
        if (key.length === 1 && /[ -~]/.test(key)) {
            e.preventDefault();
        } else if (key === "ArrowUp") {
            this.data.minute = this.data.minute + 1 > 59 ? 0 : this.data.minute + 1;
        } else if (key === "ArrowDown") {
            this.data.minute = this.data.minute - 1 < 0 ? 59 : this.data.minute - 1;
        }

        if (!/[0-9]/.test(key)) {
            return;
        }

        if (/[6-9]/.test(key) || this.data.minuteTemp !== null) {
            this.data.minute = +[this.data.minuteTemp, key].join("");
            this.data.minuteTemp = null;
            this.minuteInput.blur();
        } else {
            this.data.minuteTemp = key;
            this.data.minute = +key;
        }
    }

    /** @param {DateTimeFormField} el */
    setActiveElement(el) {
        this.refElement = el;
        const rect = el.getBoundingClientRect();
        const right = Math.max(
            document.documentElement.clientWidth,
            document.body.scrollWidth,
            document.documentElement.scrollWidth,
            document.body.offsetWidth,
            document.documentElement.offsetWidth
        );

        this.style.top = rect.bottom + 8 + "px";
        this.style.right = right - rect.right + "px";
    }

    /** @param {Date} date */
    open(date) {
        this.style.display = "";
        this.focus();
        this.handleDateChange(date ?? new Date());
        this.refElement.button.inert = true;
        this.refElement.button.style.visibility = "hidden";
    }

    close() {
        if (!this.refElement) {
            return;
        }

        this.style.display = "none";
        this.monthYearPanel.style.display = "none";
        this.hourOptionContainer.style.display = "none";
        this.minuteOptionContainer.style.display = "none";

        this.refElement.returnFocus();
        this.refElement = null;
    }
}

class DateTimeFormField extends FormFieldBase {
    /** @type {import("../types").DateTimeFormFieldAttributes} */
    data = createReactiveObject({
        id: "",
        type: "datetime",
        name: "datetime",
        label: "Date/Time Input",
        includeLabel: true,
        description: "",
        defaultValue: "",
        placeholder: "Date",
        min: null,
        max: null,
        includeDate: true,
        incudeTime: true,
        layout: "inline",
        required: false,
        readonly: false,
        disabled: false,
        hidden: false,
    });

    /** @type {HTMLDivElement} */
    input = parseHtml(
        `<div class="relative">
            <input id="${this.data.id}" name="${this.data.name}" type="text" class="w-full" disabled />
            <button class="absolute inset-y-0 right-0 flex items-center px-2.5 text-neutral-400" tabindex="-1">
                <svg class="w-5 min-w-5 fill-current"><use href="#calendar-icon" /></svg>
            </button>
        </div>`
    );

    internalInput = /** @type {HTMLInputElement} */ (this.input.children[0]);
    button = /** @type {HTMLButtonElement} */ (this.input.children[1]);
    calendar = /** @type {CalendarModal} */ (document.querySelector("calendar-modal"));

    /** @type {Date} */
    date;

    /** @type {Intl.DateTimeFormatOptions} */
    dateStringOptions;

    constructor() {
        super();

        createEffect(() => (this.internalInput.value = this.data.defaultValue));
        createEffect(() => (this.internalInput.placeholder = this.data.placeholder));
        createEffect(() => (this.internalInput.readOnly = this.data.readonly));
        createEffect(() => (this.internalInput.disabled = this.data.disabled));
        createEffect(() => {
            const isDateOrDateTime = this.data.type === "date" || this.data.type == "datetime";
            const isTimeOrDateTime = this.data.type === "time" || this.data.type == "datetime";
            const dateOptions = isDateOrDateTime ? { year: "numeric", month: "2-digit", day: "2-digit" } : {};
            const timeOptions = isTimeOrDateTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {};

            this.dateStringOptions = /** @type {Intl.DateTimeFormatOptions} */ ({ ...dateOptions, ...timeOptions });
            this.calendar.setAttribute("type", this.data.type);
        });
    }

    setup() {
        addEvents(this.internalInput, "change", () => this.parseDate(this.internalInput.value));
        addEvents(this.button, "click", (/** @type {MouseEvent} */ e) => {
            e.stopPropagation();

            this.button.inert = true;
            this.button.style.visibility = "hidden";
            this.calendar.setActiveElement(this);
            this.calendar.open(this.date);
        });
    }

    /** @param {string} dateStr */
    parseDate(dateStr) {
        let date = new Date();
        let matches;

        if ((matches = dateStr.match(/^(1[0-2]|0?[1-9])([\/\-. ])?(3[01]|[12][0-9]|0?[1-9])\2(19[0-9]{2}|2[0-9]{3}|[0-9]{2})/))) {
            let [_1, month, _2, day, year] = matches;
            if (matches[4].length === 2) {
                year = date.getFullYear().toString().slice(0, 2) + matches[4];
            }
            date.setFullYear(year ? +year : date.getFullYear());
            date.setMonth(month ? +month - 1 : date.getMonth());
            date.setDate(day ? +day : date.getDate());
        }

        if ((matches = dateStr.match(/,? +(2[0-3]|1[0-9]|0?[0-9]):?([0-5][0-9])/))) {
            const [_, hours, minutes] = matches;
            date.setHours(hours ? +hours : date.getHours());
            date.setMinutes(minutes ? +minutes : date.getMinutes());
        }

        this.date = date.toString() !== "Invalid Date" ? date : null;
        this.internalInput.value = this.date ? date.toLocaleString("default", this.dateStringOptions).replace(",", "") : "";
    }

    /** @param {Date} date */
    setDate(date) {
        this.date = date;
        this.internalInput.value = this.date ? date.toLocaleString("default", this.dateStringOptions).replace(",", "") : "";
    }

    returnFocus() {
        this.button.inert = false;
        this.button.style.visibility = "";
        this.internalInput.focus();
    }
}

customElements.define("container-highlight", ContainerHighlight);
customElements.define("container-drop-zone", ContainerDropZone);
customElements.define("map-modal", MapModal);
customElements.define("calendar-modal", CalendarModal);

customElements.define("text-field", TextFormField);
customElements.define("number-field", NumberFormField);
customElements.define("select-field", SelectFormField);
customElements.define("location-field", LocationFormField);
customElements.define("calculation-field", CalculationFormField);
customElements.define("datetime-field", DateTimeFormField);
