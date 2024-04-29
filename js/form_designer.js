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

    onMove: function (evt, originalEvt) {
        console.log("onMove:", evt);
    },
    onEnd: function (evt) {
        console.log("onEnd:", evt);
    },
    onSort: function (evt) {
        console.log("onSort:", evt);
    },
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

            onMove: function (evt, originalEvt) {
                console.log("onMove:", evt);
            },
            onEnd: function (evt) {
                console.log("onEnd:", evt);
            },
            onSort: function (evt) {
                console.log("onSort:", evt);
            },
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

/** @type {HTMLElement} */
let tempEl = null;

/** @type {HTMLElement} */
let tempPreviousSibling = null;

/** @type {Element} */
let currSection = null;
let animating = false;
const animationDuration = 250;

/** @param {DragEvent} e */
function dragOver(e) {
    e.preventDefault();
}

// /** @param {DragEvent} e */
// function dragOver(e) {
//     e.preventDefault();

//     const dropEl = /** @type {HTMLElement} */ (this);
//     const lastChild = dropEl.lastElementChild;

//     const target = /** @type {HTMLElement} */ (e.target);
//     const section = target.closest("[data-section]");
//     const formField = target.closest("[form-field]");
//     const childCount = section.childElementCount;
//     const children = Array.from(section.children);

//     if ((childCount > 0 && !formField) || animating) {
//         return;
//     }

//     const nearest = children.filter((el) => el === formField)[0];
//     const near = document.elementFromPoint(e.clientX, e.clientY);
//     // console.log(near);

//     animating = true;
//     setTimeout(() => {
//         if (childCount === 0) {
//             section.append(tempEl);
//         } else if (nearest.previousElementSibling === tempEl) {
//             formField.insertAdjacentElement("afterend", tempEl);
//         } else {
//             formField.insertAdjacentElement("beforebegin", tempEl);
//         }

//         transition(tempEl, "vertical");

//         animating = false;
//         // formField.classList.toggle("[&_*]:pointer-events-none");
//         console.log("dragging over end");
//     }, animationDuration);
// }

// /** @param {DragEvent} e */
// function dragEnter(e) {
//     currSection = /** @type {HTMLElement} */ (this);
//     const childArray = Array.from(currSection.children);
//     childArray.forEach((x) => x.classList.toggle("[&_*]:pointer-events-none"));
// }

// /** @param {DragEvent} e */
// function dragLeave(e) {
//     const childArray = Array.from(currSection.children);
//     childArray.forEach((x) => x.classList.toggle("[&_*]:pointer-events-none"));
//     currSection = null;
// }

/** @param {DragEvent} e */
function drop(e) {
    e.preventDefault();

    const section = /** @type {HTMLElement} */ (this);
    const templateId = e.dataTransfer.getData("text/plain");
    const template = /** @type {HTMLTemplateElement} */ (document.getElementById(templateId));
    const newEl = document.importNode(template.content, true).firstElementChild;

    section.appendChild(newEl);
    transition(newEl, "horizontal");
}

/**
 * @param {Element} el
 * @param {"vertical" | "horizontal"} direction
 */
function transition(el, direction) {
    const translate = direction === "vertical" ? "translate-y-3" : "-translate-x-3";
    el.classList.add("opacity-0", translate, "transition", "duration-300", "delay-100");
    window.getComputedStyle(el).opacity;
    el.classList.remove("opacity-0", translate);

    function transitionEnd() {
        el.classList.remove("transition", "duration-300", "delay-100");
    }
    el.addEventListener("transitionend", transitionEnd, { once: true });
}

/**
 * @param {Element} el
 */
function removeElement(el) {
    el.classList.add("opacity-0", "scale-0", "transition", "duration-300", "delay-100");
    window.getComputedStyle(el).opacity;

    function transitionEnd() {
        el.remove();
    }
    el.addEventListener("transitionend", transitionEnd, { once: true });
}

const newFields = /** @type {NodeListOf<HTMLDivElement>} */ (document.querySelectorAll("[dd-template]"));

for (const field of newFields) {
    field.addEventListener("dragstart", (ev) => {
        for (const container of fieldConts) {
            container.addEventListener("dragover", dragOver);
            // container.addEventListener("dragenter", dragEnter);
            // container.addEventListener("dragleave", dragLeave);
            container.addEventListener("drop", drop);
        }

        /** @type {string} */
        // @ts-ignore
        const templateId = ev.target.getAttribute("dd-template");

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

        ev.dataTransfer.setData("text/plain", templateId);
        dragElement = field;
    });
    field.addEventListener("dragend", (ev) => {
        for (const container of fieldConts) {
            container.removeEventListener("dragover", dragOver);
            // container.removeEventListener("dragenter", dragEnter);
            // container.removeEventListener("dragleave", dragLeave);
            container.removeEventListener("drop", drop);
        }
    });
}
