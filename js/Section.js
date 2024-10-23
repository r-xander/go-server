//@ts-check

class FormSection extends HTMLElement {
    data = createReactiveObject({
        id: "",
        name: "section",
        label: "Section",
        description: "",
        hidden: false,
    });

    /** @type {import("../types").FormFieldAttributes[]} */
    fields = [];
    initialized = false;
    isActive = false;

    initialize() {
        const template = /** @type {HTMLTemplateElement} */ (document.getElementById("template-form-section"));
        const content = /** @type {DocumentFragment} */ (template.content.cloneNode(true));

        this.highlight = /** @type {ContainerHighlight} */ (content.firstElementChild);
        this.header = /** @type {HTMLDivElement} */ (this.highlight.nextElementSibling);
        this.label = /** @type {HTMLHeadingElement} */ (this.header.firstElementChild);
        this.description = /** @type {HTMLDivElement} */ (this.header.lastElementChild);
        this.fieldContainer = /** @type {HTMLDivElement} */ (this.header.nextElementSibling);
        this.emptySectionElement = /** @type {HTMLDivElement} */ (this.fieldContainer.firstElementChild);
        this.topDropZone = /** @type {ContainerDropZone} */ (this.fieldContainer.nextElementSibling);
        this.bottomDropZone = /** @type {ContainerDropZone} */ (this.topDropZone.nextElementSibling);
        this.appendChild(content);

        createEffect(() => (this.label.textContent = this.data.label));
        createEffect(() => (this.description.style.display = this.data.description === "" ? "none" : ""));
        createEffect(() => (this.description.textContent = this.data.description));

        createEffect(() => this.highlight.setAttribute("field-name", this.data.name));
        createEffect(() => {
            if (this.data.hidden) this.highlight.setAttribute("field-state", "[Hidden]");
            else this.highlight.removeAttribute("state");
        });

        createEffect(() => (this.header.style.opacity = this.data.hidden ? "50" : ""));
        createEffect(() => (this.fieldContainer.style.opacity = this.data.hidden ? "50" : ""));

        this.dispatchEvent(createCustomEvent("add-section", { data: this.data }));
        this.sendEditEvent();
        transition(this);
    }

    connectedCallback() {
        if (!this.initialized) {
            this.initialize();
            this.initialized = true;
        }

        this.id = this.data.id;
        this.className = "relative grid gap-3 p-6 mb-8 rounded-md shadow-md bg-white dark:bg-card-dark";
        this.draggable = true;

        // this events
        addEvents(this, "pointerdown", () => this.sendEditEvent());
        addEvents(this, "pointerover", (e) => {
            // e.stopPropagation();
            if (!this.isActive) this.highlight.classList.remove("invisible");
        });
        addEvents(this, "pointerout", (e) => {
            e.stopPropagation();
            if (!this.isActive) this.highlight.classList.add("invisible");
        });
        addEvents(this, "delete", (/** @type {CustomEvent} */ e) => {
            e.detail.section = this.data.id;
            for (const id of this.fields) {
                this.dispatchEvent(createCustomEvent("delete-field", { fieldId: id }));
            }
            removeElement(this);
        });

        addEvents(this.fieldContainer, ["pointerover", "pointerout", "pointerdown"], (e) => {
            e.stopPropagation();
            console.log(e);
        });
        addEvents(this.fieldContainer, "dragover", (e) => e.preventDefault());
        addEvents(this.fieldContainer, "drop", (e) => this.drop(e));

        addEvents(this, "dragstart", () => window.dispatchEvent(createCustomEvent("moving-section", { section: this })));
        addEvents(this, "dragend", () => window.dispatchEvent(createCustomEvent("moved-section", { section: this })));
        addEvents(this, "add-field", (e) => this.addField(e));
        addEvents(this, "remove-field", (e) => this.removeField(e));

        addEvents(this.topDropZone, "dragover", (e) => e.preventDefault());
        addEvents(this.bottomDropZone, "dragover", (e) => e.preventDefault());

        // global events
        addEvents(window, "moving-section", (/** @type {CustomEvent} */ e) => {
            if (e.detail.section === this) return;
            this.topDropZone.setAttribute("visible", "");
            this.bottomDropZone.setAttribute("visible", "");
        });
        addEvents(window, "moved-section", () => {
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
        this.dispatchEvent(createCustomEvent("edit-section", { element: this }));
    }

    /** @param {CustomEvent} e */
    addField(e) {
        this.fields.push(e.detail.field.id);

        if (this.fieldContainer.contains(this.emptySectionElement)) {
            this.emptySectionElement.remove();
        }
    }

    /** @param {CustomEvent} e */
    removeField(e) {
        const id = e.detail.fieldId;
        this.fields = this.fields.filter((field) => field !== id);

        if (this.fields.length === 0) {
            this.fieldContainer.append(this.emptySectionElement);
        }
    }

    /** @param {DragEvent} e */
    drop(e) {
        e.preventDefault();
        e.stopPropagation();

        const target = /** @type {HTMLElement} */ (e.target);
        const templateId = e.dataTransfer.getData("text/plain");
        const newEl = new (customElements.get(templateId))();

        if (target === this.fieldContainer) {
            this.fieldContainer.appendChild(newEl);
        } else {
            const insertLocation = /** @type {InsertPosition} */ (target.dataset.insertLocation);
            target.parentElement.insertAdjacentElement(insertLocation, newEl);
        }
    }
}

register(
    "form-section",
    FormSection,
    `<container-highlight class="invisible block absolute inset-0 cursor-pointer transition border border-sky-500"></container-highlight>
    <div>
        <h2 class="font-semibold text-2xl mb-1"></h2>
        <div class="col-span-full break-all"></div>
    </div>
    <div class="grid grid-cols-1 @[35rem]/form:grid-cols-1 gap-4">
        <div class="grid justify-items-center gap-3 p-6 text-base rounded bg-slate-400/10 dark:bg-white/10" inert>
            <svg class="h-8 w-8" viewBox="0 0 494 492"><use href="#section-drag-icon" /></svg>
            <div>Drag an element here</div>
        </div>
    </div>
    <container-drop-zone class="absolute -top-4 left-0 right-0 bottom-1/2 text-xs text-white" insert-location="beforebegin">
        <div class="absolute -top-0.5 -right-1 -left-1 flex justify-center h-1 rounded-full bg-sky-500" inert>
            <div class="absolute top-1/2 -translate-y-1/2 px-2 pb-0.5 rounded-full bg-sky-500">Drop Item Here</div>
        </div>
    </container-drop-zone>
    <container-drop-zone class="absolute top-1/2 left-0 right-0 -bottom-4 text-xs text-white" data-insert-location="afterend">
        <div class="absolute -bottom-0.5 -right-1 -left-1 flex justify-center h-1 rounded-full bg-sky-500" inert>
            <div class="absolute top-1/2 -translate-y-1/2 px-2 pb-0.5 rounded-full bg-sky-500">Drop Item Here</div>
        </div>
    </container-drop-zone>`
);
