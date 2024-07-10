// @ts-check

const fieldContSortables = [];
const sectionSortables = [];
/** @type { Element[] } */
const fieldConts = [];

/** @type {HTMLElement} */
let fakeGhost = null;

/**
 * @param {HTMLElement & { animationDuration?: number}} el
 * @param {Number} duration
 */
function transition(el, duration = 150) {
    const rect = el.getBoundingClientRect();
    const animationDuration = el.animationDuration ?? duration;
    el.animationDuration ??= duration;

    console.log(rect);
    el.style.overflow = "hidden";
    el.animate(
        [
            {
                maxHeight: "0px",
                opacity: 0,
                paddingBlock: "0px",
                marginBlock: "0px",
            },
            {
                opacity: 0,
                offset: 0.7,
            },
            {
                maxHeight: `${rect.height}px`,
                opacity: 1,
            },
        ],
        {
            duration: animationDuration,
            easing: "cubic-bezier(0, 0, 0.2, 1)",
        }
    ).addEventListener("finish", () => (el.style.overflow = ""));
}

/**
 * @param {HTMLElement & { animationDuration?: number}} el
 * @param {Number} duration
 */
async function removeElement(el, duration = 150) {
    const rect = el.getBoundingClientRect();
    const animationDuration = el.animationDuration ?? duration;

    el.style.overflow = "hidden";
    const animation = el.animate(
        [
            {
                height: `${rect.height}px`,
                opacity: 1,
            },
            {
                opacity: 0,
                offset: 0.3,
            },
            {
                height: "0px",
                opacity: 0,
                paddingBlock: "0px",
                marginBlock: "0px",
            },
        ],
        {
            duration: animationDuration,
            easing: "cubic-bezier(0.4, 0, 1, 1)",
        }
    );

    return new Promise((res, _) => {
        animation.addEventListener("finish", () => {
            el.style.overflow = "";
            el.remove();
            res();
        });
    });
}

let sectionDragElement = null;
let fieldDragElement = null;
let movingField = false;
let addingField = false;

/************************************************/
/*                                              */
/*             Drag & Drop Handlers             */
/*                                              */
/************************************************/

/**
 *
 * @param {DragEvent} e
 * @param {HTMLElement} el
 */
function dragOver(e, el) {
    e.preventDefault();

    if (el) {
        if (el.parentElement.childElementCount > 1) {
            console.log(el.parentElement.childElementCount, el.parentElement.childNodes);
            el.style.position = "absolute";
            el.style.inset = "0";
            el.style.visibility = "hidden";
            el.inert = true;
        }
    }
}

/**
 *
 * @param {DragEvent} e
 * @param {HTMLElement} el
 */
function dragLeave(e, el) {
    e.preventDefault();

    if (el) {
        if (el.parentElement.childElementCount > 1) {
            console.log(el.parentElement.childElementCount, el.parentElement.childNodes);
            el.style.position = "";
            el.style.top = "";
            el.style.visibility = "";
            el.removeAttribute("inert");
        }
    }
}

/**
 *
 * @param {DragEvent} e
 * @param {HTMLElement} el
 */
function drop(e, el) {
    e.preventDefault();
    e.stopPropagation();
    const target = /** @type {HTMLElement} */ (e.target);

    const templateId = e.dataTransfer.getData("text/plain");
    const template = /** @type {HTMLTemplateElement} */ (document.getElementById(templateId));
    const newEl = /** @type {HTMLElement} */ (document.importNode(template.content, true).firstElementChild);

    console.log(el);
    if (target === el) {
        el.parentElement.appendChild(newEl);
    } else {
        const insertLocation = /** @type {InsertPosition} */ (target.dataset.insertLocation);
        target.parentElement.insertAdjacentElement(insertLocation, newEl);
    }
    transition(newEl);
}

/** @param {DragEvent} e */
function dragStart(e) {
    /** @type {string} */
    // @ts-ignore
    const templateId = e.target.getAttribute("dd-template");
    e.dataTransfer.setData("text/plain", templateId);
}

document.addEventListener("DOMContentLoaded", function (e) {
    /************************************************/
    /*                                              */
    /*               Sortabler Config               */
    /*                                              */
    /************************************************/
    const formContainer = /** @type {HTMLDivElement} */ (document.getElementById("form_container"));

    /** @type {import("../types").Sortable.Options} */
    const formContainerSortableOptions = {
        group: { name: "form", pull: false, put: false },
        animation: 150,
        forceFallback: false,
        supportPointer: true,
        swapThreshold: 0.25,

        scroll: true,
        forceAutoScrollFallback: true,
        scrollSensitivity: 100,
        scrollSpeed: 25,
        bubbleScroll: true,

        onStart: function (evt) {
            sectionDragElement = evt.item;
            movingField = true;
        },
        onEnd: function (evt) {
            movingField = false;
        },
        setData: function (dataTransfer, dragEl) {
            dataTransfer.setDragImage(new Image(), 0, 0);
        },
    };

    // @ts-ignore
    new Sortable(formContainer, formContainerSortableOptions);

    // const addSectionBtn = document.getElementById("add-section-button");
    // addSectionBtn.addEventListener("click", (e) => {
    //     const sectionTemplate = /** @type {HTMLTemplateElement} */ (document.getElementById("section-template"));
    //     const sectionDocFrag = /** @type {DocumentFragment} */ (sectionTemplate.content.cloneNode(true));
    //     const section = /** @type {HTMLElement} */ (sectionDocFrag.firstElementChild);
    //     const newSection = formContainer.insertAdjacentElement("beforeend", section);

    //     transition(section);

    //     const container = newSection.querySelector("[data-section]");

    //     /** @type {import("../types").Sortable} */
    //     // @ts-ignore
    //     let sortable = new Sortable(container, containerSortableOptions);
    //     fieldContSortables.push(sortable);
    //     fieldConts.push(container);

    //     sections.push(newSection);
    //     setTimeout(() => newSection.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
    // });

    // const newFields = /** @type {NodeListOf<HTMLDivElement>} */ (document.querySelectorAll("[dd-template]"));

    // for (const field of newFields) {
    //     field.addEventListener("dragstart", (ev) => {
    //         addingField = true;
    //         for (const container of fieldConts) {
    //             const emptyDropZone = container.nextElementSibling;
    //             container.addEventListener("dragover", dragOver);
    //             emptyDropZone.addEventListener("dragover", dragOver);
    //             container.addEventListener("drop", drop);
    //             emptyDropZone.addEventListener("drop", drop);
    //         }

    //         /** @type {string} */
    //         // @ts-ignore
    //         const templateId = ev.target.getAttribute("dd-template");
    //         ev.dataTransfer.setData("text/plain", templateId);
    //     });
    //     field.addEventListener("dragend", (ev) => {
    //         addingField = false;
    //         for (const container of fieldConts) {
    //             const emptyDropZone = container.nextElementSibling;
    //             container.removeEventListener("dragover", dragOver);
    //             emptyDropZone.removeEventListener("dragover", dragOver);
    //             container.removeEventListener("drop", drop);
    //             emptyDropZone.removeEventListener("drop", drop);
    //         }
    //     });
    // }
});

/************************************************/
/*                                              */
/*            Alpine Data & Handlers            */
/*                                              */
/************************************************/

const defaults = {
    text: () => ({
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
    }),
    number: () => ({
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
    }),
    select: () => ({
        type: "select",
        name: "select",
        label: "Select Input",
        prompt: "",
        options: [],
        defaultValue: "",
        layout: "inline",
        description: "",
        includeLabel: true,
        required: false,
        readonly: false,
        disabled: false,
        hidden: false,
    }),
    date: () => ({
        type: "date",
        name: "date",
        label: "Date Input",
        defaultValue: "",
        layout: "inline",
        description: "",
        includeLabel: true,
        required: false,
        readonly: false,
        disabled: false,
        hidden: false,
    }),
    datetime: () => ({
        type: "datetime",
        name: "datetime",
        label: "Date/Time Input",
        defaultValue: "",
        layout: "inline",
        description: "",
        includeLabel: true,
        required: false,
        readonly: false,
        disabled: false,
        hidden: false,
    }),
};

/** @type {import("../types").Sortable.Options} */
const containerSortableOptions = {
    group: { name: "fieldCont", pull: true, put: true },
    animation: 150,
    supportPointer: true,

    scroll: true,
    forceAutoScrollFallback: true,
    scrollSensitivity: 100,
    scrollSpeed: 25,
    bubbleScroll: true,

    onStart: function (evt) {
        fieldDragElement = evt.item;
        movingField = true;
    },
    onMove: function (evt, originalEvt) {
        // console.log(this);
    },
    onEnd: function (evt) {
        movingField = false;
    },
    setData: function (dataTransfer, dragEl) {
        dataTransfer.setDragImage(new Image(), 0, 0);
    },
};

/** @type {import("../types").Sortable.Options} */
const newOptionSortableOptions = {
    group: { name: "newOption", pull: false, put: false },
    animation: 150,
    supportPointer: true,
    chosenClass: "!bg-sky-500/20",
    handle: "#option-handle",
    setData: function (dataTransfer, dragEl) {
        dataTransfer.setDragImage(new Image(), 0, 0);
    },
};

/**
 *
 * @param {HTMLElement} el
 */
function getElementTopOnPage(el) {
    let location = 0;
    if (el.offsetParent) {
        do {
            location += el.offsetTop;
            el = /** @type {HTMLElement} */ (el.offsetParent);
        } while (el);
    }
    return location >= 0 ? location : 0;
}

document.addEventListener("alpine:init", function (e) {
    // @ts-ignore
    Alpine.data("formData", () => ({
        formName: "Test Form",
        formAcronym: "TF",
        currentFieldIndex: 1,
        currentSectionIndex: 1,
        showNewFieldDropZone: false,
        addingField: false,
        movingField: false,
        lastMoveSectionId: null,
        fieldData: {},
        sections: {},

        activeElementId: null,
        settingElementId: false,

        editData: {},
        editModalOpen: false,

        previewFull: true,
        previewWidth: 450,
        formLayout: "single",

        getId() {
            // @ts-ignore
            let id = this.formAcronym + "-" + this.currentFieldIndex.toString().padStart(5, "0");
            this.currentFieldIndex++;
            return id;
        },
        initField(/** @type {String} */ type) {
            const id = this.getId();
            const data = { id, ...defaults[type]() };
            this.fieldData[id] = data;

            return this.fieldData[id];
        },
        initSection(/** @type {HTMLElement} */ el) {
            // @ts-ignore
            const id = this.formAcronym + "_section_" + this.currentSectionIndex.toString().padStart(5, "0");
            this.currentSectionIndex++;
            const data = {
                id,
                fields: [],
            };

            this.sections[id] = data;

            return this.sections[id];
        },
        /**
         * @param {string} fromId
         * @param {string} toId
         * @param {string} movedId
         * @param {number} fromIndex
         * @param {number} toIndex
         */
        moveField(movedId, fromId, toId, fromIndex, toIndex) {
            if (this.lastMoveSectionId && this.lastMoveSectionId !== toId) {
                console.log("removing from last move section", this.lastMoveSectionId);
                const lastMoveSection = this.sections[this.lastMoveSectionId];
                lastMoveSection.fields = lastMoveSection.fields.filter((elemId) => elemId != movedId);
                this.lastMoveSectionId = null;
            }

            if (fromId === toId) {
                console.log("moving element within", fromId, movedId, ":", fromIndex, "->", toIndex);

                const fromSection = this.sections[fromId];
                fromSection.fields.splice(fromIndex, 1);
                fromSection.fields.splice(toIndex, 0, movedId);
                return;
            }

            console.log("moving element from", fromId, "->", toId, movedId, ":", fromIndex, "->", toIndex);
            this.lastMoveSectionId = toId;

            const fromSection = this.sections[fromId];
            const toSection = this.sections[toId];

            fromSection.fields.splice(fromIndex, 1);
            toSection.fields.splice(toIndex, 0, movedId);
        },
        processFieldMove(e) {
            console.log(e);
            const moveId = e.item.id;
            const fromId = e.from.closest("[section-container]").id;
            const fromIdx = e.oldDraggableIndex;
            const toId = e.to.closest("[section-container]").id;
            const toIdx = e.newDraggableIndex;

            this.moveField(moveId, fromId, toId, fromIdx, toIdx);
        },
        editFieldData(id) {
            this.editData = this.fieldData[id];
            this.setActiveElement(id);
        },
        setActiveElement(id) {
            if (this.settingElementId) {
                return;
            }

            this.activeElementId = id;
            this.settingElementId = true;
            this.editModalOpen = id !== null;
            console.log(this.settingElementId, id, this.editModalOpen);

            setTimeout(() => (this.settingElementId = false), 50);
        },
        setFieldData(data) {
            this.fieldData[data.id] = { ...data };
            this.editModalOpen = false;
        },
        async removeFieldData(/** @type {String} */ id) {
            const el = document.getElementById(id);
            await removeElement(el);
            delete this.fieldData[id];
        },
        isInput() {
            if (!this.editData) {
                return false;
            }

            switch (this.editData.type) {
                case "text":
                case "number":
                case "date":
                case "datetime":
                    return true;
                default:
                    return false;
            }
        },
    }));

    // @ts-ignore
    Alpine.data("date_field", (/** @type {Date} */ defaultValue) => ({
        days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        showCalendar: false,
        showMonthYearPanel: false,
        showHours: false,
        showMinutes: false,
        dates: null,
        years: null,

        internalDate: defaultValue ? new Date(defaultValue) : new Date(),
        year: null,
        month: null,
        day: null,
        hour: null,
        minute: null,

        value: "",
        hourTemp: null,
        minuteTemp: null,

        init() {
            this.year = this.internalDate.getFullYear();
            this.month = this.internalDate.getMonth();
            this.day = this.internalDate.getDate();
            this.hour = this.internalDate.getHours();
            this.minute = this.internalDate.getMinutes();

            this.populateCalendarDays(this.internalDate);
        },
        populateCalendarDays(/** @type {Date} */ date) {
            const calendarDays = [];
            const firstDay = new Date(this.year, this.month, 1).getDay();

            for (let i = -firstDay; i < 42 - firstDay; i++) {
                let newDate = new Date(this.year, this.month, i + 1);
                calendarDays.push({
                    year: newDate.getFullYear(),
                    month: newDate.getMonth(),
                    day: newDate.getDate(),
                });
            }

            this.years = Array.from({ length: 8 }).map((_, i) => this.year - 3 + i);
            this.dates = calendarDays;
        },
        handleDateChange(/** @type {Date} */ date) {
            this.internalDate = date;
            this.month = date.getMonth();
            this.year = date.getFullYear();
            this.day = date.getDate();
            this.hour = date.getHours();
            this.minute = date.getMinutes();

            this.populateCalendarDays(date);
        },
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
        },
        clearValue() {
            this.handleDateChange(new Date());
            this.showCalendar = false;
            this.value = "";
        },
        getNextMonth() {
            this.handleDateChange(new Date(this.year, this.month + 1, this.day, this.hour, this.minute));
        },
        getPrevMonth() {
            this.handleDateChange(new Date(this.year, this.month - 1, this.day, this.hour, this.minute));
        },
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
        },
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
        },
        setToday() {
            const today = new Date();
            this.onDateChange(today);
        },
        changeMonthOnWheel(/** @type {WheelEvent} */ e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            if (e.deltaY === 0) {
                return;
            }

            const date = new Date(this.year, this.month + (e.deltaY < 0 ? -1 : 1), this.day, this.hour, this.minute);
            this.handleDateChange(date);
        },
        /**
         * @param {HTMLElement} el
         * @returns {Boolean}
         */
        displayCalendar(el) {
            if (!this.showCalendar) {
                setTimeout(() => {
                    el.style.top = "";
                    el.style.bottom = "";
                }, 100);
                return false;
            }

            el.style.display = "";
            const location = getElementTopOnPage(el);
            const elementBottom = location + el.offsetHeight;
            const pageBottom = window.scrollY + window.innerHeight;

            if (elementBottom + 10 > pageBottom) {
                el.style.bottom = "calc(100% + 0.5rem)";
            } else {
                el.style.top = "calc(100% + 0.5rem)";
            }

            console.log(elementBottom, document.body.scrollHeight, window.scrollY + window.innerHeight);

            return true;
        },
        parseInput(dateValue) {
            const reg = /[^\d\/]/g;

            if (reg.test(dateValue)) {
                return;
            }

            if (parseInt(dateValue[1])) {
            }
            let [month, day, year, ...rest] = dateValue.split("/");

            //too many slashes. invalid date.
            if (rest.length > 0) {
                return;
            }

            if (day === undefined) {
                month = month.slice(0, 2);
                day = month.slice(2, 4);
                year = month.slice(4);
            } else if (year === undefined) {
                month = month.slice(0, 2);
                day = month.slice(2, 4);
                year = month.slice(4);
            }

            const newDate = Date.parse(`${month}/${day}/${year}`);

            if (isNaN(newDate)) {
                return;
            }

            this.internalDate = new Date(newDate);
            this.populateCalendarDays(this.internalDate);
        },
    }));
});
