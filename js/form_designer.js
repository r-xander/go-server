// @ts-check

const addSectionBtn = document.getElementById("add-section-button");
const formContainer = /** @type {HTMLDivElement} */ (document.getElementById("form_container"));

/** @type {import("../types").Sortable.Options} */
const sortableOptions = {
    group: {
        name: "form",
        pull: false,
        put: false,
    },
    animation: 150,
    forceFallback: false,
    supportPointer: true,
    swapThreshold: 0.25,

    scroll: true,
    forceAutoScrollFallback: true,
    scrollSensitivity: 100,
    scrollSpeed: 25,
    bubbleScroll: true,

    setData: function (dataTransfer, dragEl) {
        dataTransfer.setDragImage(new Image(), 0, 0);
    },
};

/** @type {import("../types").Sortable} */
// @ts-ignore
const formSortable = new Sortable(formContainer, sortableOptions);

const fieldContSortables = [];
const sectionSortables = [];
const fieldConts = [];
const sections = [];

/** @type {HTMLElement} */
let fakeGhost = null;

/**
 * @param {DragEvent} e
 */
function drag(e) {
    fakeGhost.style.translate = `${e.pageX}px ${e.pageY}px`;
}

addSectionBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const sectionTemplate = /** @type {HTMLTemplateElement} */ (document.getElementById("section-template"));
    const section = /** @type {DocumentFragment} */ (sectionTemplate.content.cloneNode(true)).firstElementChild;
    const newSection = formContainer.insertAdjacentElement("beforeend", section);

    transition(section, "vertical");

    const fieldContainers = newSection.querySelectorAll("[data-section]");
    for (let i = 0; i < fieldContainers.length; ++i) {
        const container = fieldContainers[i];

        /** @type {import("../types").Sortable.Options} */
        const sortableOptions = {
            group: {
                name: "fieldCont",
                pull: true,
                put: true,
            },
            animation: 150,
            forceFallback: false,
            supportPointer: true,

            scroll: true,
            forceAutoScrollFallback: true,
            scrollSensitivity: 100,
            scrollSpeed: 25,
            bubbleScroll: true,

            setData: function (dataTransfer, dragEl) {
                dataTransfer.setDragImage(new Image(), 0, 0);
            },
        };

        /** @type {import("../types").Sortable} */
        // @ts-ignore
        let sortable = new Sortable(container, sortableOptions);
        fieldContSortables.push(sortable);
        fieldConts.push(container);
    }

    sections.push(newSection);
    newSection.scrollIntoView({ behavior: "smooth", block: "center" });
});

/************************************************/
/*                                              */
/*             Drag & Drop Handlers             */
/*                                              */
/************************************************/

let dragElement = null;
let tempEl = null;

/**
 * @param {DragEvent} e
 */
function dragOver(e) {
    e.preventDefault();
    const target = /** @type {HTMLElement} */ (e.target);
    const formField = target.closest("[form-field]");
    const section = target.closest("[data-section]");
    console.log(e);

    // if (formField && tempEl.firstElementChild !== formField && tempPreviousSibling !== formField) {
    dragElement.dispatchEvent(new Event("mouseup", { bubbles: true, cancelable: true }));
    dragElement.dispatchEvent(new Event("pointerup", { bubbles: true, cancelable: true }));
    dragElement.dispatchEvent(new Event("touchup", { bubbles: true, cancelable: true }));
    // section.dispatchEvent(new DragEvent("drop"));
    dragElement = null;
    section.append(tempEl);

    for (const container of fieldConts) {
        container.removeEventListener("dragover", dragOver);
        container.removeEventListener("drop", drop);
    }

    const event = new PointerEvent("pointerdown");
    tempEl.dispatchEvent(event);
    tempEl = null;

    // formField.insertAdjacentElement("afterend", tempEl);
    // tempPreviousSibling = formField;
    // }
}

/**
 * @param {DragEvent} e
 */
function drop(e) {
    e.preventDefault();

    // const data = e.dataTransfer.getData("text/plain");

    // if (data !== null || data != undefined) {
    //     const target = /** @type {HTMLDivElement} */ (e.target).closest("[data-section]");
    //     const child = tempEl.firstElementChild;
    //     target.append(child);
    //     transition(child, "horizontal");

    //     tempEl.remove();
    //     tempPreviousSibling = null;
    // }
}

/**
 *
 * @param {Element} el
 * @param {"vertical" | "horizontal"} direction
 */
function transition(el, direction) {
    const translate = direction === "vertical" ? "translate-y-3" : "-translate-x-3";
    el.classList.add("opacity-0", translate, "transition-all", "duration-300", "delay-100");
    window.getComputedStyle(el).opacity;
    el.classList.remove("opacity-0", translate);

    function transitionEnd() {
        el.classList.remove("transition-all", "duration-300", "delay-100");
    }

    el.addEventListener("transitionend", transitionEnd, { once: true });
}

const newFields = /** @type {NodeListOf<HTMLDivElement>} */ (document.querySelectorAll("[dd-template]"));

for (const field of newFields) {
    field.addEventListener("dragstart", (ev) => {
        for (const container of fieldConts) {
            container.addEventListener("dragover", dragOver);
            container.addEventListener("drop", drop);
        }

        /** @type {string} */
        // @ts-ignore
        const templateId = ev.target.getAttribute("dd-template");
        const template = /** @type {HTMLTemplateElement} */ (document.getElementById(templateId));
        tempEl = document.importNode(template.content, true).firstElementChild;
        dragElement = field;
    });
    field.addEventListener("dragend", (ev) => {
        for (const container of fieldConts) {
            container.removeEventListener("dragover", dragOver);
            container.removeEventListener("drop", drop);
        }

        // tempEl.firstElementChild.remove();
    });
}
