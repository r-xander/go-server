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
        layout: "global",
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
        layout: "global",
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
        layout: "global",
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
        layout: "global",
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
        layout: "global",
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
        fieldData: {},
        setions: [],

        editData: {},
        editModalOpen: false,

        globalSettings: {
            fieldLayout: "block",
            sectionLayout: "single",
        },

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
        editFieldData(data) {
            this.editData = data;

            switch (data.type) {
                case "text":
                    // this.editModalOpen = true;
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

/** @param {DragEvent} e */
function drop(e) {
    e.preventDefault();

    console.log(this);
    const section = /** @type {HTMLElement} */ (this);
    const templateId = e.dataTransfer.getData("text/plain");
    const template = /** @type {HTMLTemplateElement} */ (document.getElementById(templateId));
    const newEl = /** @type {HTMLElement} */ (document.importNode(template.content, true).firstElementChild);

    section.appendChild(newEl);
    transition(newEl);
}

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
                height: "0px",
                opacity: 0,
                paddingBlock: "0px",
                marginBlock: "0px",
            },
            {
                opacity: 0,
                offset: 0.7,
            },
            {
                height: `${rect.height}px`,
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
function removeElement(el, duration = 150) {
    const rect = el.getBoundingClientRect();
    const animationDuration = el.animationDuration ?? duration;

    el.style.overflow = "hidden";
    el.animate(
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
    ).addEventListener("finish", () => {
        el.style.overflow = "";
        el.remove();
    });
}

let sectionDragElement = null;
let fieldDragElement = null;
let dragging = false;

document.addEventListener("DOMContentLoaded", function (e) {
    /************************************************/
    /*                                              */
    /*               Sortabler Config               */
    /*                                              */
    /************************************************/
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

        onStart: function (evt) {
            sectionDragElement = evt.item;
            dragging = true;
            console.log("onStart", evt);
        },
        onMove: function (evt, originalEvt) {
            console.log("onMove:", evt);
        },
        onEnd: function (evt) {
            dragging = false;
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

    addSectionBtn.addEventListener("click", (e) => {
        const sectionTemplate = /** @type {HTMLTemplateElement} */ (document.getElementById("section-template"));
        const sectionDocFrag = /** @type {DocumentFragment} */ (sectionTemplate.content.cloneNode(true));
        const section = /** @type {HTMLElement} */ (sectionDocFrag.firstElementChild);
        const newSection = formContainer.insertAdjacentElement("beforeend", section);

        transition(section);

        const fieldContainers = newSection.querySelectorAll("[data-container]");
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

                onStart: function (evt) {
                    fieldDragElement = evt.item;
                    dragging = true;
                    console.log("onStart", evt);
                },
                onMove: function (evt, originalEvt) {
                    console.log("onMove:", evt);
                },
                onEnd: function (evt) {
                    dragging = false;
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
        setTimeout(() => newSection.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
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

    const newFields = /** @type {NodeListOf<HTMLDivElement>} */ (document.querySelectorAll("[dd-template]"));

    for (const field of newFields) {
        field.addEventListener("dragstart", (ev) => {
            dragging = true;
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
            dragging = false;
            for (const container of fieldConts) {
                container.removeEventListener("dragover", dragOver);
                // container.removeEventListener("dragenter", dragEnter);
                // container.removeEventListener("dragleave", dragLeave);
                container.removeEventListener("drop", drop);
            }
        });
    }
});
