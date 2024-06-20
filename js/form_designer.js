// @ts-check

/************************************************/
/*                                              */
/*            Alpine Data & Handlers            */
/*                                              */
/************************************************/

const defaults = {
    text: {
        type: "text",
        label: "Text Input",
        placeholder: "",
        minLenth: 0,
        maxLength: 2000,
        defaultValue: "",
        layout: "inline",
        description: "",
        includeLabel: true,
        required: false,
        readonly: false,
        hidden: false,
    },
    number: {
        type: "number",
        label: "Number Input",
        placeholder: "",
        min: 0,
        max: 1000,
        defaultValue: "",
        layout: "inline",
        description: "",
        includeLabel: true,
        required: false,
        readonly: false,
        hidden: false,
    },
    select: {
        type: "select",
        label: "Select Input",
        options: [],
        defaultValue: "",
        layout: "inline",
        description: "",
        includeLabel: true,
        required: false,
        readonly: false,
        hidden: false,
    },
    date: {
        type: "date",
        label: "Date Input",
        defaultValue: "",
        layout: "inline",
        description: "",
        includeLabel: true,
        required: false,
        readonly: false,
        hidden: false,
    },
    datetime: {
        type: "datetime",
        label: "Date/Time Input",
        defaultValue: "",
        layout: "inline",
        description: "",
        includeLabel: true,
        required: false,
        readonly: false,
        hidden: false,
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
        showNewFieldDropZone: false,
        activeElement: null,
        fieldData: {},
        sections: {},

        editData: {},
        editModalOpen: false,

        getId() {
            // @ts-ignore
            let id = this.formAcronym + "-" + this.currentFieldIndex.toString().padStart(5, "0");
            this.currentFieldIndex++;
            return id;
        },
        initField(/** @type {String} */ type) {
            const id = this.getId();
            const data = { id, ...defaults[type] };
            this.fieldData[id] = data;

            return this.fieldData[id];
        },
        initSection() {
            const id = this.formAcronym + "_section_" + (this.sections.length + 1);
            const data = {
                id,
                fields: [],
            };

            this.sections[id] = data;

            return this.sections[id];
        },
        editFieldData(data) {
            this.editData = data;

            this.editModalOpen = true;
            switch (data.type) {
                case "text":
                    break;
                default:
                    console.log("unsupported field type: " + data.type);
            }
        },
        setFieldData(data) {
            this.fieldData[data.id] = { ...data };
            this.editModalOpen = false;
        },
        removeFieldData(/** @type {String} */ id) {
            delete this.fieldData[id];
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

const fieldContSortables = [];
const sectionSortables = [];
/** @type { Element[] } */
const fieldConts = [];
const sections = [];

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

/** @type {import("../types").Sortable.Options} */
const containerSortableOptions = {
    group: {
        name: "fieldCont",
        pull: true,
        put: true,
    },
    filter: "[no-drag]",
    animation: 150,
    forceFallback: false,
    supportPointer: true,

    scroll: true,
    forceAutoScrollFallback: true,
    scrollSensitivity: 100,
    scrollSpeed: 25,
    bubbleScroll: true,

    onStart: function (evt) {
        fieldDragElement = evt.item;
        movingField = true;
        console.log("onStart", evt);
    },
    onMove: function (evt, originalEvt) {
        console.log("onMove:", evt);
    },
    onEnd: function (evt) {
        movingField = false;
        console.log("onEnd:", evt);
    },
    onSort: function (evt) {
        console.log("onSort:", evt);
    },
    setData: function (dataTransfer, dragEl) {
        dataTransfer.setDragImage(new Image(), 0, 0);
    },
};

/************************************************/
/*                                              */
/*             Drag & Drop Handlers             */
/*                                              */
/************************************************/

/** @param {DragEvent} e */
function dragOver(e) {
    e.preventDefault();
}

/** @param {DragEvent} e */
function drop(e) {
    e.preventDefault();
    const target = /** @type {HTMLElement} */ (e.target);
    const section = /** @type {HTMLElement} */ (this);

    const templateId = e.dataTransfer.getData("text/plain");
    const template = /** @type {HTMLTemplateElement} */ (document.getElementById(templateId));
    const newEl = /** @type {HTMLElement} */ (document.importNode(template.content, true).firstElementChild);

    if (target === section) {
        section.previousElementSibling.appendChild(newEl);
    } else {
        const insertLocation = /** @type {InsertPosition} */ (target.dataset.insertLocation);
        target.parentElement.insertAdjacentElement(insertLocation, newEl);
    }
    transition(newEl);
}

document.addEventListener("DOMContentLoaded", function (e) {
    /************************************************/
    /*                                              */
    /*               Sortabler Config               */
    /*                                              */
    /************************************************/
    const addSectionBtn = document.getElementById("add-section-button");
    const formContainer = /** @type {HTMLDivElement} */ (document.getElementById("form_container"));

    /** @type {import("../types").Sortable.Options} */
    const sectionSortableOptions = {
        group: {
            name: "form",
            pull: false,
            put: false,
        },
        filter: ".no-drag",
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
            console.log("onStart", evt);
        },
        onMove: function (evt, originalEvt) {
            console.log("onMove:", evt);
        },
        onEnd: function (evt) {
            movingField = false;
            console.log("onEnd:", evt);
        },
        onSort: function (evt) {
            console.log("onSort:", evt);
        },
        setData: function (dataTransfer, dragEl) {
            dataTransfer.setDragImage(new Image(), 0, 0);
        },
    };

    // @ts-ignore
    new Sortable(formContainer, sectionSortableOptions);

    addSectionBtn.addEventListener("click", (e) => {
        const sectionTemplate = /** @type {HTMLTemplateElement} */ (document.getElementById("section-template"));
        const sectionDocFrag = /** @type {DocumentFragment} */ (sectionTemplate.content.cloneNode(true));
        const section = /** @type {HTMLElement} */ (sectionDocFrag.firstElementChild);
        const newSection = formContainer.insertAdjacentElement("beforeend", section);

        transition(section);

        const container = newSection.querySelector("[data-section]");
        // for (let i = 0; i < fieldContainers.length; ++i) {
        // const container = fieldContainers[i];

        /** @type {import("../types").Sortable} */
        // @ts-ignore
        let sortable = new Sortable(container, containerSortableOptions);
        fieldContSortables.push(sortable);
        fieldConts.push(container);
        // }

        sections.push(newSection);
        setTimeout(() => newSection.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
    });

    const newFields = /** @type {NodeListOf<HTMLDivElement>} */ (document.querySelectorAll("[dd-template]"));

    for (const field of newFields) {
        field.addEventListener("dragstart", (ev) => {
            addingField = true;
            for (const container of fieldConts) {
                const emptyDropZone = container.nextElementSibling;
                container.addEventListener("dragover", dragOver);
                emptyDropZone.addEventListener("dragover", dragOver);
                container.addEventListener("drop", drop);
                emptyDropZone.addEventListener("drop", drop);
            }

            /** @type {string} */
            // @ts-ignore
            const templateId = ev.target.getAttribute("dd-template");
            ev.dataTransfer.setData("text/plain", templateId);
        });
        field.addEventListener("dragend", (ev) => {
            addingField = false;
            for (const container of fieldConts) {
                const emptyDropZone = container.nextElementSibling;
                container.removeEventListener("dragover", dragOver);
                emptyDropZone.removeEventListener("dragover", dragOver);
                container.removeEventListener("drop", drop);
                emptyDropZone.removeEventListener("drop", drop);
            }
        });
    }
});
