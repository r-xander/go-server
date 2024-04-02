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
/** @type {HTMLElement} */
let dragElement = null;
let tempEl = null;
let tempPreviousSibling = null;
/**
 * @param {DragEvent} e
 */
function dragOver(e) {
    e.preventDefault();
    const target = /** @type {HTMLElement} */ (e.target);
    const formField = target.closest("[form-field]");
    const section = target.closest("[data-section]");

    if (section.childElementCount === 0) {
        section.append(tempEl);
    } else if (formField && tempEl !== formField && tempPreviousSibling !== formField) {
        console.log(e);
        formField.insertAdjacentElement("beforebegin", tempEl);
        tempPreviousSibling = formField;
    }

    // const eventOptions = { bubbles: true, cancelable: true, composed: true };
    // section.dispatchEvent(new DragEvent("drop", eventOptions));
    // dragElement.dispatchEvent(new DragEvent("dragend", eventOptions));
    // dragElement.dispatchEvent(new PointerEvent("pointerup", eventOptions));
    // dragElement.dispatchEvent(new MouseEvent("mouseup", eventOptions));
    // dragElement.dispatchEvent(new TouchEvent("touchend", eventOptions));
    // dragElement = null;

    // for (const container of fieldConts) {
    //     container.removeEventListener("dragover", dragOver);
    //     container.removeEventListener("drop", drop);
    // }

    // section.append(tempEl);
    // tempEl.dispatchEvent(new PointerEvent("pointerdown"));
    // tempEl = null;

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
    const target = /** @type {HTMLDivElement} */ (e.target).closest("[data-section]");
    // const child = tempEl.firstElementChild;
    target.append(tempEl);
    transition(tempEl, "horizontal");
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

        tempEl = document.createElement("div");
        tempEl.classList.add(
            "flex",
            "items-center",
            "justify-center",
            "h-20",
            "gap-4",
            "rounded",
            "border",
            "border-dashed",
            "border-neutral-600"
        );
        tempEl.innerHTML = field.innerHTML;

        const templateElement = document.importNode(template.content, true).firstElementChild;
        ev.dataTransfer.setData("text/html", templateElement.outerHTML);
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
