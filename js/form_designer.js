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
        required: false,
        readonly: false,
        hidden: false,
    },
};

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
        initField(type) {
            const id = this.getId();
            const data = { id, ...defaults[type] };
            this.fieldData[id] = data;

            return this.fieldData[id];
        },
        editFieldData(data) {
            this.editData = data;

            switch (data.type) {
                case "text":
                    this.editModalOpen = true;
                    break;
                default:
                    console.log("unsupported field type: " + data.type);
            }
        },
        setFieldData(data) {
            this.fieldData[data.id] = { ...data };
            this.editModalOpen = false;
        },
        removeFieldData(id) {
            delete this.fieldData[id];
        },
    }));

    // @ts-ignore
    Alpine.data("date_field", (value = null) => ({
        internalDate: value ?? new Date(),
        days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        showCalendar: false,
        showMonthYearPanel: false,
        value: "",
        year: null,
        month: null,
        day: null,
        dates: null,
        years: null,

        init() {
            this.year = this.internalDate.getFullYear();
            this.month = this.internalDate.getMonth();
            this.day = this.internalDate.getDate();
            this.populateCalendarDays(this.internalDate);
            this.years = Array.from({ length: 8 }).map((_, i) => this.year - 3 + i);
        },

        /**
         *
         * @param {HTMLElement} el
         * @returns {Boolean}
         */
        displayCalendar(el) {
            // @ts-ignore
            el.style.display = "";
            console.log(el.getBoundingClientRect(), document.body.clientHeight);
            return this.showCalendar;
        },
        handleInput(e) {
            const reg = /[^\d\/]/g;
            console.log(e, reg.test(e.data));
            if (reg.test(e.data)) {
                e.preventDefault();
                return false;
            }

            return e.data;
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
            this.populateCalendarDays;
        },
        populateCalendarDays(date) {
            this.month = date.getMonth();
            this.year = date.getFullYear();
            this.day = date.getDate();
            const calendarDays = [];
            const firstDay = new Date(this.year, this.month, 1).getDay();

            for (let i = -firstDay; i < 42 - firstDay; i++) {
                let newDate = new Date(this.year, this.month, i + 1);
                calendarDays.push({
                    day: newDate.getDate(),
                    month: newDate.getMonth(),
                    year: newDate.getFullYear(),
                });
            }

            this.dates = calendarDays;
        },
        handleDateChange(date) {
            const newVal = new Date(date.year, date.month, date.day);

            this.internalDate = newVal;
            this.year = date.year;
            this.month = date.month;
            this.day = date.day;
            this.populateCalendarDays(newVal);
        },
        onDateChange(date) {
            console.log(date);
            this.handleDateChange(date);
            this.showCalendar = false;

            this.value = `${(date.month + 1).toString().padStart(2, "0")}/${date.day.toString().padStart(2, "0")}/${
                date.year
            }`;
        },
        getNextMonth() {
            this.handleDateChange({ year: this.year, month: this.month + 1, day: this.day });
        },
        getPrevMonth() {
            this.handleDateChange({ year: this.year, month: this.month - 1, day: this.day });
        },
        setToday() {
            const today = new Date();
            this.populateCalendarDays(today);

            const date = this.dates.find(
                (d) => d.day === today.getDate() && d.month === today.getMonth() && d.year === today.getFullYear()
            );
            this.onDateChange(date);
        },
        changeMonthOnWheel(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            if (e.deltaY === 0) {
                return;
            }

            const date = {
                year: this.year,
                month: this.month + (e.deltaY < 0 ? -1 : 1),
                day: this.day,
            };
            this.handleDateChange(date);
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

    const section = /** @type {HTMLElement} */ (this);
    const templateId = e.dataTransfer.getData("text/plain");
    const template = /** @type {HTMLTemplateElement} */ (document.getElementById(templateId));
    console.log(template);
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

    addSectionBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const sectionTemplate = /** @type {HTMLTemplateElement} */ (document.getElementById("section-template"));
        const sectionDocFrag = /** @type {DocumentFragment} */ (sectionTemplate.content.cloneNode(true));
        const section = /** @type {HTMLElement} */ (sectionDocFrag.firstElementChild);
        const newSection = formContainer.insertAdjacentElement("beforeend", section);

        transition(section);

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
        setTimeout(() => newSection.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
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
});
