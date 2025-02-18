// @ts-check

let dragElement = null;

document.addEventListener("dragstart", (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const event = target.getAttribute("drag-event");

    if (!event) return false;

    e.dataTransfer.setData("drag-event", event);
    const [action] = event.split("-", 1);
    const templateId = event.substring(action.length + 1);

    if (action === "move") {
        dragElement = target;
    } else if (action === "copy") {
        dragElement = target.cloneNode(true);
    } else if (action === "insert" && templateId) {
        const template = /** @type {HTMLTemplateElement} */ (document.getElementById(templateId));
        dragElement = template.content.cloneNode(true);
    }
});

document.addEventListener("dragover", (e) => {
    const target = /** @type {HTMLElement} */ (e.target).closest("[drop-event]");

    if (!target) return;

    const dropEventAttr = target.getAttribute("drop-event");
    const dropEvents = dropEventAttr.split("|");

    if (!dropEvents.some((evt) => e.dataTransfer.types.includes(evt))) return;

    e.preventDefault();
});

document.addEventListener("drop", (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const action = /** @type {InsertPosition} */ (e.dataTransfer.getData("drag-action"));

    if (!target.hasAttribute("drop-event") || !action) return;

    e.preventDefault();
    target.insertAdjacentElement(action, dragElement);
});

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
    location: () => ({
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
        lat: "",
        long: "",
        defaultCurrent: false,
        layout: "inline",
        description: "",
        includeLabel: true,
        required: false,
        readonly: false,
        disabled: false,
        hidden: false,
    }),
    calculation: () => ({
        type: "calculation",
        name: "calculation",
        label: "Calculation",
        calcType: null,
        calculation: "",
        calcFields: [],
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
    let top = 0;
    let bottom = 0;
    if (el.offsetParent) {
        do {
            top += el.offsetTop;
            bottom += el.offsetHeight + el.offsetTop;
            el = /** @type {HTMLElement} */ (el.offsetParent);
        } while (el);
    }

    return { top, bottom };
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

        hoverElementId: null,
        activeElementId: null,
        activeSection: null,
        settingElementId: false,

        editData: {},
        editModalOpen: false,

        /** @type {HTMLDialogElement} */
        mapPopup: null,
        map: null,
        marker: null,

        previewFull: true,
        previewWidth: 450,
        formLayout: "single",

        /**
         * @param {String} type
         */
        initField(type) {
            // @ts-ignore
            let id = this.formAcronym + "-" + this.currentFieldIndex.toString().padStart(5, "0");
            const data = { id, ...defaults[type]() };
            this.currentFieldIndex++;

            this.fieldData[id] = data;
            return this.fieldData[id];
        },
        validateName(data) {
            if (data.name === "") {
                return false;
            }

            const nameValid = !Object.keys(this.fieldData).some((x) => {
                const field = this.fieldData[x];
                return field === data ? false : field.name === data.name;
            });

            return nameValid;
        },
        /**
         * @param {HTMLElement} el
         */
        initSection(el) {
            // @ts-ignore
            const id = this.formAcronym + "-section-" + this.currentSectionIndex.toString().padStart(5, "0");
            const data = {
                id,
                type: "section",
                label: "Section " + this.currentSectionIndex,
                name: "section_" + this.currentSectionIndex,
                description: "",
                fields: [],
            };
            this.currentSectionIndex++;

            this.sections[id] = data;
            return this.sections[id];
        },
        /**
         * @param {import("../types").Sortable.SortableEvent} e
         */
        processFieldMove(e) {
            const moveId = e.item.id;
            const fromId = e.from.closest("[section-container]").id;
            const fromIndex = e.oldDraggableIndex;
            const toId = e.to.closest("[section-container]").id;
            const toIndex = e.newDraggableIndex;

            if (this.lastMoveSectionId && this.lastMoveSectionId !== toId) {
                console.log("removing from last move section", this.lastMoveSectionId);
                const lastMoveSection = this.sections[this.lastMoveSectionId];
                lastMoveSection.fields = lastMoveSection.fields.filter((elemId) => elemId != moveId);
                this.lastMoveSectionId = null;
            }

            if (fromId === toId) {
                console.log("moving element within", fromId, moveId, ":", fromIndex, "->", toIndex);

                const fromSection = this.sections[fromId];
                fromSection.fields.splice(fromIndex, 1);
                fromSection.fields.splice(toIndex, 0, moveId);
                return;
            }

            console.log("moving element from", fromId, "->", toId, moveId, ":", fromIndex, "->", toIndex);
            this.lastMoveSectionId = toId;

            const fromSection = this.sections[fromId];
            const toSection = this.sections[toId];

            fromSection.fields.splice(fromIndex, 1);
            toSection.fields.splice(toIndex, 0, moveId);
        },
        /**
         * @param {String | null} id
         */
        editFieldData(id = null) {
            if (this.settingElementId || (this.activeElementId !== null && !this.validateName(this.editData))) {
                return;
            }

            if (id !== null) {
                this.editData = this.fieldData[id] ?? this.sections[id];
                setTimeout(() => document.dispatchEvent(new Event("active")), 0);
            }

            this.activeElementId = id;
            this.settingElementId = true;
            this.editModalOpen = id !== null;
            setTimeout(() => (this.settingElementId = false), 50);
        },
        setFieldData(data) {
            this.fieldData[data.id] = { ...data };
            this.editModalOpen = false;
        },
        /**
         * @param {String} id
         */
        async removeFieldData(id) {
            const el = document.getElementById(id);
            await removeElement(el);
            delete this.fieldData[id];
        },
        showMapPopup(data) {
            console.log(data);
            this.mapPopup.showModal();
            this.map.invalidateSize().locate({ setView: true, maxZoom: 16 });
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
            console.log(e);
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
            const offset = getElementTopOnPage(el);
            const elementBottom = offset.top + el.offsetHeight;
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

/************************************************/
/*                                              */
/*                  reactivity                  */
/*                                              */
/************************************************/

/**
 * @template T
 * @param {T} [value]
 * @returns {[() => T, (value?: T) => void]}
 */
function createSignal(value) {
    const subscriptions = new Set();

    /** @type {() => T} */
    const read = () => {
        const observer = context[context.length - 1];
        if (observer) subscribe(observer, subscriptions);
        return value;
    };

    /** @type {(value: T) => void} */
    const write = (newValue) => {
        value = newValue;
        for (const observer of [...subscriptions]) {
            observer.execute();
        }
    };

    return [read, write];
}

/************************************************/
/*                                              */
/*               Custom Elements                */
/*                                              */
/************************************************/

/************************************************/
/*                                              */
/*              Leaflet Extensions              */
/*                                              */
/************************************************/

L.Control.CurrentLocation = L.Control.extend({
    options: { position: "topleft" },
    container: null,
    map: null,
    onAdd: function (map) {
        this.map = map;

        this.container = L.DomUtil.create("div");
        this.container.setAttribute("class", "leaflet-bar");

        L.DomEvent.on(this.container, "contextmenu", L.DomEvent.preventDefault);
        L.DomEvent.disableScrollPropagation(this.container);
        L.DomEvent.disableClickPropagation(this.container);

        const anchor = L.DomUtil.create("a");
        anchor.title = "Current Location";
        anchor.href = "#";
        anchor.role = "button";
        anchor.setAttribute("class", "p-1");
        anchor.innerHTML =
            '<svg viewBox="0 0 24 24" class="w-5.5 h-5.5 fill-none stroke-current stroke-[2px] [stroke-linecap:round] [stroke-linejoin:round]"><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0 -16 0" /><path d="M12 2l0 2" /><path d="M12 20l0 2" /><path d="M20 12l2 0" /><path d="M2 12l2 0" /></svg>';

        L.DomEvent.on(anchor, "click", L.DomEvent.stop);
        L.DomEvent.on(anchor, "click", this.getCurrentLocation, this);
        // L.DomEvent.on(anchor, "click", this._refocusOnMap, this);

        this.container.append(anchor);
        return this.container;
    },
    onRemove: function (map) {
        L.DomEvent.off(this.container, "click", this.getCurrentLocation, this);
    },
    getCurrentLocation: function (e) {
        this.map.locate({ setView: true, maxZoom: 16 });
    },
});

L.control.currentLocation = function (options) {
    return new L.Control.CurrentLocation(options);
};

L.Control.Search = L.Control.extend({
    options: { position: "topright" },
    container: null,
    map: null,
    onAdd: function (map) {
        this.map = map;

        this.container = L.DomUtil.create("div");
        this.container.setAttribute(
            "class",
            "relative flex mt-4 mr-4 shadow-md rounded-full text-accent-dark bg-white dark:bg-[#121212] dark:text-white"
        );
        this.container.title = "Search";

        const input = L.DomUtil.create("input");
        input.setAttribute(
            "class",
            "w-[clamp(240px,40dvh,340px)] pl-5 pr-11 py-3 text-sm rounded-full bg-transparent border-2 border-black/20 dark:border-[#73737366] focus:!border-[#2880caB3] placeholder:!text-neutral-400"
        );
        input.style.outline = "none";
        input.placeholder = "Search";

        const searchBtn = L.DomUtil.create("button");
        searchBtn.setAttribute(
            "class",
            "absolute p-1.5 top-2 right-2 rounded-full transition text-neutral-400 hover:!text-[#2880ca] focus:!text-[#2880ca]"
        );
        searchBtn.style.outline = "none";
        searchBtn.innerHTML =
            '<svg viewBox="0 0 512 512" class="h-5 w-5 fill-none stroke-current stroke-[3rem] [stroke-miterlimit:10]"><path d="M221.09,64A157.09,157.09,0,1,0,378.18,221.09,157.1,157.1,0,0,0,221.09,64Z" /><line x1="338.29" y1="338.29" x2="448" y2="448" style="stroke-linecap: round" /></svg>';

        this.container.append(input);
        this.container.append(searchBtn);

        L.DomEvent.disableScrollPropagation(this.container);
        L.DomEvent.disableClickPropagation(this.container);
        L.DomEvent.on(this.container, "contextmenu", L.DomEvent.stopPropagation);
        L.DomEvent.on(input, "input", this.onInput, this);

        return this.container;
    },
    onRemove: function (map) {
        L.DomEvent.off(this.container, "click", this.getCurrentLocation, this);
    },
    getCurrentLocation: function (e) {
        this.map.locate({ setView: true, maxZoom: 16 });
    },
    onInput(e) {
        console.log(e);
    },
});

L.control.search = function (options) {
    return new L.Control.Search(options);
};
