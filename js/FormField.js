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
    cls.map((cl) => el.classList.toggle(cl));
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
    label = parseHtml(
        `<div class="flex gap-1 p-1.5 m-px">
            <label class="font-medium select-none break-all">Label</label>
            <span class="leading-4 font-semibold text-rose-500">*</span>
        </div>`
    );

    /** @type {HTMLDivElement} */
    description = parseHtml(`<div class="col-span-full break-all"></div>`);

    /** @type {ContainerHighlight} */
    highlight = parseHtml(
        `<container-highlight class="block invisible absolute inset-0 cursor-pointer transition border border-sky-500"></container-highlight>`
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
        this.className = "m-6 block relative rounded";
        this.id = this.data.id;

        //@ts-ignore
        this.label.children[0].htmlFor = this.data.id;
        this.highlight.setAttribute("field-name", this.data.type);

        createEffect(() => (this.label.style.display = this.data.label === "" ? "none" : ""));
        createEffect(() => (this.label.children[0].textContent = this.data.label));
        //@ts-ignore
        createEffect(() => (this.label.children[1].style.display = this.data.required ? "" : "none"));

        createEffect(() => (this.description.style.display = this.data.description === "" ? "none" : ""));
        createEffect(() => (this.description.textContent = this.data.description));

        createEffect(() => {
            if (this.data.hidden) this.highlight.setAttribute("field-state", "[Hidden]");
            else if (this.data.readonly) this.highlight.setAttribute("field-state", "[Readonly]");
            else this.highlight.removeAttribute("state");
        });

        createEffect(() => this.classList.toggle("opacity-50", this.data.hidden));
        createEffect(() => this.classList.toggle("grid-cols-[3fr_4fr]", this.data.layout === "inline" && this.data.label !== ""));

        const inputBlock = parseHtml(`<div class="grid grid-cols-[3fr_4fr] gap-1 w-full items-start" inert></div>`);
        inputBlock.append(this.label, this.input, this.description);

        this.append(inputBlock, this.highlight, this.topDropZone, this.bottomDropZone);
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

    /** @type {HTMLButtonElement[]} */
    dateElements = [];

    /** @type {HTMLButtonElement[]} */
    yearElements = [];

    showCalendar = false;
    showMonthYearPanel = false;
    showHours = false;
    showMinutes = false;
    dates = null;
    years = null;

    internalDate = new Date();
    year = null;
    month = null;
    day = null;
    hour = null;
    minute = null;

    value = "";
    hourTemp = null;
    minuteTemp = null;

    /** @type {HTMLDivElement} */
    header = parseHtml(
        `<div class="flex w-full items-center justify-between p-3 border-b border-neutral-200 text-neutral-500 dark:border-[#5e5e5e] dark:text-white/75">
            <button class="flex items-center gap-1 font-bold hover:text-neutral-800 dark:hover:text-white">
                <span></span>
                <svg class="w-4 h-4 fill-current"><use href="#downcaret-icon" /></svg>
            </button>
            <div class="flex gap-1">
                <button class="rounded-full p-1 hover:text-neutral-800 dark:hover:text-white">
                    <svg class="w-4 h-4 fill-current"><use href="#leftcaret-icon" /></svg>
                </button>
                <button class="rounded-full p-1 hover:text-neutral-800 dark:hover:text-white">
                    <svg class="w-4 h-4 fill-current"><use href="#rightcaret-icon" /></svg>
                </button>
            </div>
        </div>`
    );

    /** @type {HTMLDivElement} */
    datePanel = parseHtml(
        `<div class="p-3">
            <div class="grid grid-cols-7 gap-0.5 w-60 mb-1 items-center justify-items-center font-mono"></div>
            <div class="flex relative items-center justify-center mt-3">
                <span class="font-semibold mr-2">Time:</span>
                <div class="flex">
                    <input type="number" class="w-10 hide-arrows text-center" readonly />
                    <div class="grid gap-y-1 ml-1">
                        <button><svg class="w-4 h-4 fill-current rotate-180"><use href="#downcaret-icon" /></svg></button>
                        <button><svg class="w-4 h-4 fill-current"><use href="#downcaret-icon" /></svg></button>
                    </div>
                    <div class="absolute bottom-[calc(100%+0.25rem)] left-0 grid w-max grid-cols-4 justify-items-center gap-2 p-4 rounded shadow-lg bg-white dark:bg-neutral-600"></div>
                </div>
                <span class="mx-2">:</span>
                <div class="flex">
                    <input type="number" class="w-10 hide-arrows text-center" readonly />
                    <div class="grid gap-y-1 ml-1">
                        <button><svg class="w-4 h-4 fill-current rotate-180"><use href="#downcaret-icon" /></svg></button>
                        <button><svg class="w-4 h-4 fill-current"><use href="#downcaret-icon" /></svg></button>
                    </div>
                    <div class="absolute bottom-[calc(100%+0.25rem)] right-0 grid w-max grid-cols-4 justify-items-center gap-2 p-4 rounded shadow-lg bg-white dark:bg-neutral-600"></div>
                </div>
            </div>
        </div>`
    );

    /** @type {HTMLDivElement} */
    footer = parseHtml(
        `<div class="flex justify-around w-full border-t border-neutral-200 dark:border-[#5e5e5e]">
            <button class="w-full p-3 hover:bg-neutral-200 hover:text-neutral-800 dark:hover:bg-[#5e5e5e] hover:dark:text-white">Clear</button>
                @click="clearValue()"
            <button class="w-full p-3 hover:bg-neutral-200 hover:text-neutral-800 dark:hover:bg-[#5e5e5e] hover:dark:text-white">Today</button>
                @click="setToday()"
            <button class="w-full p-3 hover:bg-neutral-200 hover:text-neutral-800 dark:hover:bg-[#5e5e5e] hover:dark:text-white">Close</button>
                @click="showCalendar = false"
        </div>`
    );

    /** @type {HTMLDivElement} */
    monthYearPanel = parseHtml(
        `<div class="absolute z-[100] flex inset-0 flex-col rounded bg-white dark:bg-neutral-800">
            x-show="showMonthYearPanel"
            <div class="grid w-full grid-cols-4 justify-items-center gap-2 p-4 border-b dark:border-neutral-700"></div>
            <div class="flex justify-center gap-1 mt-4">
                <button class="rounded-full p-1 hover:text-neutral-800 dark:hover:text-white">
                    <svg class="w-4 h-4 fill-current"><use href="#caretleft-icon</svg>
                </button>
                <button class="rounded-full p-1 hover:text-neutral-800 dark:hover:text-white">
                    <svg class="w-4 h-4 fill-current"><use href="#caretright-icon</svg>
                </button>
            </div>
            <div class="grid w-full grid-cols-4 justify-items-center gap-2 p-4"></div>
            <div class="mt-auto flex h-12 w-full divide-x border-t dark:divide-neutral-700 dark:border-neutral-700">
                <button class="flex-1 font-bold">OK</button>
                    @click="showMonthYearPanel = false; handleDateChange(new Date(year, month, day, hour, minute));"
                <button class="flex-1 font-bold">Cancel</button>
                    @click="showMonthYearPanel = false"
            </div>
        </div>`
    );

    /** @type {HTMLDivElement} */
    calendar = parseHtml(
        `<div class="absolute right-0 z-50 w-max flex flex-col text-sm items-center rounded shadow-lg border bg-white dark:bg-[#434343]"></div>`
    );

    constructor() {
        super();

        for (const day of this.days) {
            const dayElement = parseHtml(`<span class="w-full text-center font-bold">${day}</span>`);
            this.datePanel.children[0].append(dayElement);
        }

        for (var i = 0; i < 42; ++i) {
            const dateElement = parseHtml(`<button class="w-full aspect-square rounded-md"></button>`);
            this.dateElements.push(dateElement);
            this.datePanel.children[0].append(dateElement);
        }

        for (const month of this.monthStrings) {
            const monthElement = parseHtml(`<button class="aspect-[2/1] w-full py-1.5 rounded text-center">${month.slice(0, 3)}</button>`);
            this.monthYearPanel.children[0].append(monthElement);
        }

        for (var i = 0; i < 8; ++i) {
            const yearElement = parseHtml(`<button class="aspect-[2/1] w-full py-1.5 rounded text-center"></button>`);
            this.yearElements.push(yearElement);
            this.monthYearPanel.children[1].children[1].append(yearElement);
        }

        for (var i = 0; i < 24; ++i) {
            const hourElement = parseHtml(
                `<button class="w-8 aspect-square rounded-md hover:bg-neutral-200 dark:hover:bg-[#5e5e5e] dark:hover:text-white">
                    ${i + 1}
                </button>`
            );
            this.datePanel.children[1].children[1].children[2].append(hourElement);
        }

        for (var i = 0; i < 60; i + 5) {
            const minuteElement = parseHtml(
                `<button class="w-8 aspect-square rounded-md hover:bg-neutral-200 dark:hover:bg-[#5e5e5e] dark:hover:text-white">
                    ${i.toString().padStart(2, "0")}
                </button>`
            );
            this.datePanel.children[1].children[3].children[2].append(minuteElement);
        }

        createEffect(() => {
            const month = this.internalDate.getMonth();
            this.header.children[0].children[0].textContent = `${this.monthStrings[month]} ${this.internalDate.getFullYear()}`;
        });

        createEffect(() => {
            this.datePanel.children[1].children[1].children[0].textContent = this.hour.toString().padStart(2, "0");
        });

        createEffect(() => {
            this.datePanel.children[1].children[3].children[0].textContent = this.minute.toString().padStart(2, "0");
        });

        const type = this.getAttribute("type");
        if (type === "date") {
            this.datePanel.children[1].remove();
        } else if (type === "time") {
            this.datePanel.children[0].remove();
        }

        this.append(this.header, this.datePanel, this.footer, this.monthYearPanel);
    }

    connectedCallback() {
        addEvents(this.header.children[0], "click", () => (this.monthYearPanel.style.display = ""));
        addEvents(this.header.children[1].children[0], "click", this.getPrevMonth);
        addEvents(this.header.children[1].children[1], "click", this.getNextMonth);

        addEvents(this.datePanel.children[0], "click", this.changeMonthOnWheel);

        addEvents(this.datePanel.children[1].children[1].children[0], "keydown", this.handleHourChange);
        addEvents(
            this.datePanel.children[1].children[1].children[0],
            "focus",
            //@ts-ignore
            () => (this.datePanel.children[1].children[1].children[2].style.display = "")
        );
        addEvents(this.datePanel.children[1].children[1].children[1].children[0], "click", () => this.hour++);
        addEvents(this.datePanel.children[1].children[1].children[1].children[1], "click", () => this.hour--);

        addEvents(this.datePanel.children[1].children[3].children[0], "keydown", this.handleHourChange);
        addEvents(
            this.datePanel.children[1].children[3].children[0],
            "focus",
            //@ts-ignore
            () => (this.datePanel.children[1].children[3].children[2].style.display = "")
        );
        addEvents(this.datePanel.children[1].children[3].children[1].children[0], "click", () => this.minute++);
        addEvents(this.datePanel.children[1].children[3].children[1].children[1], "click", () => this.minute--);

        this.dateElements.forEach((el) => {
            addEvents(el, "click", (/** @type {MouseEvent} */ e) => this.onDateChange(new Date(el.dataset.date)));
        });

        Array.from(this.monthYearPanel.children[0].children).forEach((el, index) => {
            addEvents(el, ["click", "dblclick"], (/** @type {MouseEvent} */ e) => {
                this.onDateChange(new Date(this.year, this.months[index], this.day));
                this.monthYearPanel.style.display = e.type == "dblclick" ? "none" : "";
            });
        });

        this.yearElements.forEach((el) => {
            addEvents(el, ["click", "dblclick"], (/** @type {MouseEvent} */ e) => {
                this.onDateChange(new Date(+el.dataset.year, this.month, this.day));
                this.monthYearPanel.style.display = e.type == "dblclick" ? "none" : "";
            });
        });

        Array.from(this.datePanel.children[1].children[1].children[2].children).forEach((el) => {
            addEvents(el, "click", (/** @type {MouseEvent} */ e) => {
                this.datePanel.children[1].children[1].children[0].textContent = el.textContent;
            });
        });

        Array.from(this.datePanel.children[1].children[3].children[2].children).forEach((el) => {
            addEvents(el, "click", (/** @type {MouseEvent} */ e) => {
                this.datePanel.children[1].children[1].children[0].textContent = el.textContent;
            });
        });
    }

    clearValue() {
        this.handleDateChange(new Date());
        this.showCalendar = false;
        this.value = "";
    }

    setToday() {
        const today = new Date();
        this.onDateChange(today);
    }

    populateCalendarDays(/** @type {Date} */ date) {
        let firstDay = -new Date(this.year, this.month, 1).getDay();

        for (const dateElement of this.dateElements) {
            let newDate = new Date(this.year, this.month, firstDay + 1);
            const outsideMonth = this.month !== newDate.getMonth();
            const today = !outsideMonth && this.day === newDate.getDate();
            const thisMonth = !outsideMonth && !today;

            forceToggleClasses(dateElement, outsideMonth, "text-[#333]/50", "dark:text-white/40");
            forceToggleClasses(dateElement, today, "font-semibold", "bg-sky-500/20", "text-sky-500");
            forceToggleClasses(dateElement, thisMonth, "hover:bg-neutral-200", "dark:hover:bg-[#5e5e5e]", "dark:hover:text-white");
            dateElement.textContent = newDate.getDate().toString();
            dateElement.dataset.date = newDate.toLocaleDateString();
        }

        let startYear = this.year - 3;
        for (const yearElement of this.yearElements) {
            const thisYear = startYear === this.year;

            forceToggleClasses(yearElement, thisYear, "font-semibold", "bg-sky-500/20", "text-sky-500");
            forceToggleClasses(yearElement, thisYear, "hover:bg-neutral-200", "dark:hover:bg-[#5e5e5e]", "dark:hover:text-white");
            yearElement.textContent = (startYear++).toString();
        }
    }

    handleDateChange(/** @type {Date} */ date) {
        this.internalDate = date;
        this.month = date.getMonth();
        this.year = date.getFullYear();
        this.day = date.getDate();
        this.hour = date.getHours();
        this.minute = date.getMinutes();

        this.populateCalendarDays(date);
    }

    getNextMonth() {
        this.handleDateChange(new Date(this.year, this.month + 1, this.day, this.hour, this.minute));
    }

    getPrevMonth() {
        this.handleDateChange(new Date(this.year, this.month - 1, this.day, this.hour, this.minute));
    }

    changeMonthOnWheel(/** @type {WheelEvent} */ e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (e.deltaY === 0) {
            return;
        }

        const date = new Date(this.year, this.month + (e.deltaY < 0 ? -1 : 1), this.day, this.hour, this.minute);
        this.handleDateChange(date);
    }

    onDateChange(/** @type {Date} */ date) {
        date ??= new Date();
        this.handleDateChange(date);

        this.value = this.internalDate
            .toLocaleString("default", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            })
            .replace(",", "");
    }

    handleHourChange(/** @type {KeyboardEvent} */ e) {
        const key = e.key;

        if (key === "ArrowUp") {
            e.preventDefault();
            if (this.hour + 1 > 23) {
                this.hour = 0;
            } else {
                this.hour++;
            }
        } else if (key === "ArrowDown") {
            e.preventDefault();
            if (this.hour - 1 < 0) {
                this.hour = 23;
            } else {
                this.hour--;
            }
        }

        if (!/[0-9]/.test(key)) {
            return;
        }

        e.preventDefault();
        if (/[3-9]/.test(key) || this.hourTemp !== null) {
            if (!(this.hourTemp === "2" && /[4-9]/.test(key))) {
                this.hour = +[this.hourTemp, key].join("");
            }
            this.hourTemp = null;
            /** @type {HTMLInputElement} */ (e.target).blur();
        } else {
            this.hourTemp = key;
            this.hour = +key;
        }
    }

    handleMinuteChange(/** @type {KeyboardEvent} */ e) {
        const key = e.key;

        if (key === "ArrowUp") {
            e.preventDefault();
            if (this.minute + 1 > 59) {
                this.minute = 0;
            } else {
                this.minute++;
            }
        } else if (key === "ArrowDown") {
            e.preventDefault();
            if (this.minute - 1 < 0) {
                this.minute = 59;
            } else {
                this.minute--;
            }
        }

        if (!/[0-9]/.test(key)) {
            return;
        }

        e.preventDefault();
        if (/[6-9]/.test(key) || this.minuteTemp !== null) {
            this.minute = +[this.minuteTemp, key].join("");
            this.minuteTemp = null;
            this.showCalendar = false;
        } else {
            this.minuteTemp = key;
            this.minute = +key;
        }
    }

    setDate() {}
}

class DateTimeFormField extends FormFieldBase {
    /** @type {import("../types").DateTimeFormFieldAttributes} */
    data = createReactiveObject({
        id: "",
        type: "calculation",
        name: "calculation",
        label: "Calculation",
        includeLabel: true,
        description: "",
        placeholder: "",
        layout: "inline",
        required: false,
        readonly: false,
        disabled: true,
        hidden: false,
    });

    /** @type {HTMLDivElement} */
    input = parseHtml(
        `<div class="relative">
            <input id="${this.data.id}" name="${this.data.name}" type="text" disabled />
            <button class="absolute inset-y-0 right-0 flex items-center px-2.5 text-neutral-400" tabindex="-1">
                @click.stop="$refs.dateinput.focus()"
                <svg class="w-5 min-w-5 fill-current"><use="#calendar-icon /></svg>
            </button>
            <calendar-modal></calendar-modal>
        </div>`
    );

    internalInput = /** @type {HTMLInputElement} */ (this.input.children[0]);
    button = /** @type {HTMLButtonElement} */ (this.input.children[1]);
    calendar = /** @type {HTMLInputElement} */ (this.input.children[2]);

    constructor() {
        super();

        createEffect(() => (this.internalInput.value = this.data.defaultValue));
        createEffect(() => (this.internalInput.placeholder = this.data.placeholder));
        createEffect(() => (this.internalInput.readOnly = this.data.readonly));
        createEffect(() => (this.internalInput.disabled = this.data.disabled));
    }

    setup() {
        addEvents(this.input.children[1], "click", (/** @type {MouseEvent} */ e) => {
            e.stopPropagation();
            this.calendar;
        });
    }
}

customElements.define("container-highlight", ContainerHighlight);
customElements.define("container-drop-zone", ContainerDropZone);
customElements.define("map-modal", MapModal);
customElements.define("text-field", TextFormField);
customElements.define("number-field", NumberFormField);
customElements.define("select-field", SelectFormField);
customElements.define("location-field", LocationFormField);
customElements.define("calculation-field", CalculationFormField);
