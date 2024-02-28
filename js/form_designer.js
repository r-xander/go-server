// @ts-check

const addSectionBtn = /** @type {HTMLInputElement} */ (document.getElementById("add-section-button"));
const sectionSortables = [];
const sections = [];
const containers = [];

addSectionBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const sectionTemplate = /** @type {HTMLTemplateElement} */ (document.getElementById("section-template"));
    const section = /** @type {DocumentFragment} */ (sectionTemplate.content.cloneNode(true));
    const sectionContainer = /** @type {HTMLDivElement} */ (e.target);
    const newSection = sectionContainer.insertAdjacentElement("beforebegin", section.firstElementChild);

    const fieldContainers = newSection.querySelectorAll("[data-section]");
    for (let i = 0; i < fieldContainers.length; ++i) {
        const container = fieldContainers[i];

        /** @type {import("../types").Sortable.Options} */
        const sortableOptions = {
            group: {
                name: "sections",
                pull: true,
                put: true,
            },
            animation: 150,
        };

        /** @type {import("../types").Sortable} */
        // @ts-ignore
        let sortable = new Sortable(container, sortableOptions);
        sectionSortables.push(sortable);
        containers.push(container);
    }

    sections.push(newSection);
});

/************************************************/
/*                                              */
/*             Drag & Drop Handlers             */
/*                                              */
/************************************************/

/**
 * @param {DragEvent} e
 */
function dragOver(e) {
    e.preventDefault();
}

/**
 * @param {DragEvent} e
 */
function drop(e) {
    e.preventDefault();

    const data = e.dataTransfer?.getData("text/plain");

    if (data !== null || data != undefined) {
        const target = /** @type {HTMLDivElement} */ (e.target).closest("[data-section]");
        const template = /** @type {HTMLTemplateElement} */ (document.getElementById(data));
        const docFrag = document.importNode(template.content, true);
        target.append(docFrag);

        const child = /** @type {HTMLDivElement} */ (target?.lastElementChild);
        child.style.opacity = "0";
        child.style.translate = "-12px 0";
        window.getComputedStyle(child).opacity;
        child.removeAttribute("style");
    }
}

const newFields = /** @type {NodeListOf<HTMLDivElement>} */ (document.querySelectorAll("[dd-template]"));

for (const field of newFields) {
    field.addEventListener("dragstart", (ev) => {
        for (const container of containers) {
            container.addEventListener("dragover", dragOver);
            container.addEventListener("drop", drop);
        }

        /** @type {string} */
        // @ts-ignore
        const templateId = ev.target.getAttribute("dd-template");
        ev.dataTransfer?.setData("text/plain", /** @type {string} */ (templateId));
        // console.log(ev);
    });
    field.addEventListener("dragend", (ev) => {
        for (const container of containers) {
            container.removeEventListener("dragover", dragOver);
            container.removeEventListener("drop", drop);
        }
    });
}
