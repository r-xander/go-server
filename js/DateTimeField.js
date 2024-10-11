//@ts-check

class CalendarModal extends HTMLElement {
    static observedAttributes = ["type"];

    today = new Date();
    days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    monthStrings = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
    months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    dateElements = /** @type {HTMLButtonElement[]} */ ([]);
    yearElements = /** @type {HTMLButtonElement[]} */ ([]);

    /** @type {DateTimeFormField} */
    refElement;

    /** @type {import("../types").CalendarAttributes} */
    data = createReactiveObject({
        year: this.today.getFullYear(),
        month: this.today.getMonth(),
        day: this.today.getDate(),
        hour: this.today.getHours(),
        minute: this.today.getMinutes(),
        activeYear: this.today.getFullYear(),
        activeMonth: this.today.getMonth(),
        hourTemp: "",
        minuteTemp: "",
    });

    initialized = false;

    get internalDate() {
        return new Date(this.data.year, this.data.month, this.data.day, this.data.hour, this.data.minute);
    }

    /** @type {HTMLDivElement} */
    header = parseHtml(
        `<div class="flex w-full items-center justify-between p-3 border-b border-neutral-200 text-neutral-500 dark:border-[#5e5e5e] dark:text-white/75">
            <button class="flex items-center gap-1 font-bold hover:text-neutral-800 dark:hover:text-white" tabindex="-1">
                <span></span>
                <svg class="w-4 h-4"><use href="#caretdown-icon" /></svg>
            </button>
            <div class="flex gap-1">
                <button class="rounded-full p-1 hover:text-neutral-800 dark:hover:text-white" tabindex="-1">
                    <svg class="w-4 h-4"><use href="#caretleft-icon" /></svg>
                </button>
                <button class="rounded-full p-1 hover:text-neutral-800 dark:hover:text-white" tabindex="-1">
                    <svg class="w-4 h-4"><use href="#caretright-icon" /></svg>
                </button>
            </div>
        </div>`
    );

    monthYearButton = /** @type {HTMLButtonElement} */ (this.header.children[0]);
    previousMonthButton = /** @type {HTMLButtonElement} */ (this.header.children[1].children[0]);
    nextMonthButton = /** @type {HTMLButtonElement} */ (this.header.children[1].children[1]);

    /** @type {HTMLDivElement} */
    mainPanel = parseHtml(
        `<div class="p-3">
            <div class="grid grid-cols-7 gap-0.5 w-60 mb-1 items-center justify-items-center font-mono"></div>
            <div class="flex relative items-center justify-center mt-3">
                <span class="font-semibold mr-2">Time:</span>
                <input type="text" class="w-10 hide-arrows text-center" />
                <div class="grid gap-y-1 ml-1">
                    <button tabindex="-1"><svg class="w-4 h-4 rotate-180"><use href="#caretdown-icon" /></svg></button>
                    <button tabindex="-1"><svg class="w-4 h-4"><use href="#caretdown-icon" /></svg></button>
                </div>
                <span class="mx-2">:</span>
                <input type="text" class="w-10 hide-arrows text-center" />
                <div class="grid gap-y-1 ml-1">
                    <button tabindex="-1"><svg class="w-4 h-4 rotate-180"><use href="#caretdown-icon" /></svg></button>
                    <button tabindex="-1"><svg class="w-4 h-4"><use href="#caretdown-icon" /></svg></button>
                </div>
            </div>
        </div>`
    );

    dateContainer = /** @type {HTMLDivElement} */ (this.mainPanel.children[0]);
    timeContainer = /** @type {HTMLDivElement} */ (this.mainPanel.children[1]);
    hourInput = /** @type {HTMLInputElement} */ (this.mainPanel.children[1].children[1]);
    hourButtonContainer = /** @type {HTMLDivElement} */ (this.mainPanel.children[1].children[2]);
    minuteInput = /** @type {HTMLInputElement} */ (this.mainPanel.children[1].children[4]);
    minuteButtonContainer = /** @type {HTMLDivElement} */ (this.mainPanel.children[1].children[5]);

    /** @type {HTMLDivElement} */
    footer = parseHtml(
        `<div class="flex justify-around w-full border-t border-neutral-200 dark:border-[#5e5e5e]">
            <button class="w-full p-3 hover:bg-neutral-200 hover:text-neutral-800 dark:hover:bg-[#5e5e5e] hover:dark:text-white" tabindex="-1">Clear</button>
            <button class="w-full p-3 hover:bg-neutral-200 hover:text-neutral-800 dark:hover:bg-[#5e5e5e] hover:dark:text-white" tabindex="-1">Today</button>
            <button class="w-full p-3 hover:bg-neutral-200 hover:text-neutral-800 dark:hover:bg-[#5e5e5e] hover:dark:text-white" tabindex="-1">Accept</button>
        </div>`
    );

    /** @type {HTMLDivElement} */
    monthYearPanel = parseHtml(
        `<div style="display: none;" class="absolute z-[100] flex inset-0 flex-col rounded bg-white dark:bg-neutral-800">
            <div class="grid w-full grid-cols-4 justify-items-center gap-2 p-4 border-b dark:border-neutral-700"></div>
            <div class="flex justify-center gap-1 mt-4">
                <button class="rounded-full p-1 hover:text-neutral-800 dark:hover:text-white" tabindex="-1">
                    <svg class="w-4 h-4"><use href="#caretleft-icon" /></svg>
                </button>
                <button class="rounded-full p-1 hover:text-neutral-800 dark:hover:text-white" tabindex="-1">
                    <svg class="w-4 h-4"><use href="#caretright-icon" /></svg>
                </button>
            </div>
            <div class="grid w-full grid-cols-4 justify-items-center gap-2 p-4"></div>
            <div class="mt-auto flex h-12 w-full divide-x border-t dark:divide-neutral-700 dark:border-neutral-700">
                <button class="flex-1 font-bold" tabindex="-1">OK</button>
                <button class="flex-1 font-bold" tabindex="-1">Cancel</button>
            </div>
        </div>`
    );

    monthContainer = /** @type {HTMLDivElement} */ (this.monthYearPanel.children[0]);
    yearButtons = /** @type {HTMLDivElement} */ (this.monthYearPanel.children[1]);
    yearContainer = /** @type {HTMLDivElement} */ (this.monthYearPanel.children[2]);
    monthYearFooter = /** @type {HTMLDivElement} */ (this.monthYearPanel.children[3]);

    initialize() {
        this.tabIndex = 0;
        this.style.display = "none";
        this.className =
            "absolute z-50 w-max p-0 text-sm rounded select-none outline-none shadow-lg border bg-white dark:bg-[#434343] dark:border-transparent";

        this.append(this.header, this.mainPanel, this.footer, this.monthYearPanel);

        for (const day of this.days) {
            const dayElement = parseHtml(`<span class="w-full text-center font-bold">${day}</span>`);
            this.dateContainer.append(dayElement);
        }

        for (var i = 0; i < 42; ++i) {
            const dateElement = /** @type {HTMLButtonElement} */ (
                parseHtml(`<button class="w-full aspect-square rounded-md" tabindex="-1"></button>`)
            );
            this.dateElements.push(dateElement);
            this.dateContainer.append(dateElement);
            createEffect(() => {
                const date = new Date(+dateElement.dataset.year, +dateElement.dataset.month, +dateElement.dataset.day);
                const isActive = date.getDate() === this.data.day && date.getMonth() === this.data.month;
                forceToggleClasses(dateElement, isActive, "font-semibold", "bg-sky-500/20", "text-sky-500");
                forceToggleClasses(dateElement, !isActive, "hover:bg-neutral-200", "dark:hover:bg-[#5e5e5e]", "dark:hover:text-white");
                forceToggleClasses(dateElement, date.getMonth() !== this.data.month, "text-[#333]/50", "dark:text-white/40");
            });
        }

        for (const [index, month] of this.monthStrings.entries()) {
            const monthElement = parseHtml(
                `<button class="aspect-[2/1] w-full py-1.5 rounded text-center" tabindex="-1">${month.slice(0, 3)}</button>`
            );
            this.monthContainer.append(monthElement);
            createEffect(() => {
                const isActive = index === this.data.activeMonth;
                forceToggleClasses(monthElement, isActive, "font-semibold", "bg-sky-500/20", "text-sky-500");
                forceToggleClasses(monthElement, !isActive, "hover:bg-neutral-200", "dark:hover:bg-[#5e5e5e]", "dark:hover:text-white");
            });
        }

        for (var i = 0; i < 8; ++i) {
            const yearElement = parseHtml(`<button class="aspect-[2/1] w-full py-1.5 rounded text-center" tabindex="-1"></button>`);
            this.yearElements.push(yearElement);
            this.yearContainer.append(yearElement);
            createEffect(() => {
                const isActive = +yearElement.textContent === this.data.activeYear;
                forceToggleClasses(yearElement, isActive, "font-semibold", "bg-sky-500/20", "text-sky-500");
                forceToggleClasses(yearElement, !isActive, "hover:bg-neutral-200", "dark:hover:bg-[#5e5e5e]", "dark:hover:text-white");
            });
        }

        createEffect(() => this.updateCalendar(new Date(this.data.year, this.data.month, this.data.day, this.data.hour, this.data.minute)));
        createEffect(() => (this.hourInput.value = this.data.hour.toString().padStart(2, "0")));
        createEffect(() => (this.minuteInput.value = this.data.minute.toString().padStart(2, "0")));
    }

    connectedCallback() {
        if (!this.initialized) {
            this.initialize();
            this.initialized = true;
        }

        addEvents(this.monthYearButton, "click", () => (this.monthYearPanel.style.display = ""));
        addEvents(this.previousMonthButton, "click", () => this.getPrevMonth());
        addEvents(this.nextMonthButton, "click", () => this.getNextMonth());

        addEvents(this.dateContainer, "wheel", (/** @type {WheelEvent} */ e) => this.changeMonthOnWheel(e));
        this.dateElements.forEach((el) =>
            addEvents(el, "click", () => {
                this.data.year = +el.dataset.year;
                this.data.month = +el.dataset.month;
                this.data.day = +el.dataset.day;
                this.updateDateTimeInput(this.internalDate);
            })
        );

        addEvents(this.hourInput, "focus", () => this.hourInput.select());
        addEvents(this.hourInput, "keydown", (e) => this.handleHourChange(e));
        addEvents(this.hourInput, ["input", "change"], (e) => this.handleHourInputEvents(e));
        addEvents(this.hourButtonContainer.children[0], "click", () => (this.data.hour++ === 23 ? (this.data.hour = 0) : null));
        addEvents(this.hourButtonContainer.children[1], "click", () => (this.data.hour-- === 0 ? (this.data.hour = 23) : null));

        addEvents(this.minuteInput, "focus", () => this.minuteInput.select());
        addEvents(this.minuteInput, "keydown", (e) => this.handleMinuteChange(e));
        addEvents(this.minuteInput, ["input", "change"], (e) => this.handleMinuteInputEvents(e));
        addEvents(this.minuteButtonContainer.children[0], "click", () => (this.data.minute++ === 59 ? (this.data.minute = 0) : null));
        addEvents(this.minuteButtonContainer.children[1], "click", () => (this.data.minute-- === 0 ? (this.data.minute = 59) : null));

        addEvents(this.footer.children[0], "click", () => this.updateDateTimeInput(null));
        addEvents(this.footer.children[1], "click", () => this.updateDateTimeInput(new Date()));
        addEvents(this.footer.children[2], "click", () => this.updateDateTimeInput(this.internalDate));

        Array.from(this.monthContainer.children).forEach((/** @type {HTMLElement} */ el, index) => {
            addEvents(el, "click", () => (this.data.activeMonth = index));
            addEvents(el, "dblclick", () => this.handleDateChange());
        });

        addEvents(this.yearButtons.children[0], "click", () => untrack(() => this.updateYears(-1)));
        addEvents(this.yearButtons.children[1], "click", () => untrack(() => this.updateYears(1)));
        this.yearElements.forEach((el) => {
            addEvents(el, "click", () => (this.data.activeYear = +el.textContent));
            addEvents(el, "dblclick", () => this.handleDateChange());
        });

        addEvents(this.monthYearFooter.children[0], "click", () => this.handleDateChange());
        addEvents(this.monthYearFooter.children[1], "click", () => (this.monthYearPanel.style.display = "none"));

        addEvents(this, "keydown", (/** @type {KeyboardEvent} */ e) => this.handleCalendarKeydown(e));
        addEvents(window, "pointerdown", (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            if (!this.contains(target)) {
                this.close();
            }

            if (!this.monthYearPanel.contains(target)) {
                this.monthYearPanel.style.display = "none";
            }
        });
    }

    /**
     * @param {string} attribute
     * @param {string} _
     * @param {string} newValue
     */
    attributeChangedCallback(attribute, _, newValue) {
        if (attribute === "type") {
            this.dateContainer.style.display = newValue === "time" ? "none" : "";
            this.header.style.display = newValue === "time" ? "none" : "";
            this.footer.children[1].textContent = newValue === "time" ? "Now" : "Today";

            this.timeContainer.style.display = newValue === "date" ? "none" : "";
        }
    }

    updateDateTimeInput(/** @type {Date} */ date) {
        this.handleDateChange(date ?? new Date());
        this.refElement.setDate(date);
        this.close();
    }

    handleDateChange(/** @type {Date} */ date) {
        date ??= new Date(this.data.activeYear, this.data.activeMonth, this.data.day, this.data.hour, this.data.minute);
        this.data.year = date.getFullYear();
        this.data.month = date.getMonth();
        this.data.day = date.getDate();
        this.data.hour = date.getHours();
        this.data.minute = date.getMinutes();
        this.data.activeYear = date.getFullYear();
        this.data.activeMonth = date.getMonth();
        this.monthYearButton.children[0].textContent = `${this.monthStrings[this.data.month]} ${this.data.year}`;
        this.monthYearPanel.style.display = "none";

        this.updateCalendar(date);
    }

    updateCalendar(/** @type {Date} */ date) {
        const year = date.getFullYear();
        const month = date.getMonth();

        let firstDay = -new Date(year, month, 1).getDay();

        for (const dateElement of this.dateElements) {
            let newDate = new Date(year, month, ++firstDay);
            dateElement.textContent = newDate.getDate().toString();
            dateElement.dataset.year = newDate.getFullYear().toString();
            dateElement.dataset.month = newDate.getMonth().toString();
            dateElement.dataset.day = newDate.getDate().toString();
        }

        let startYear = year - 3;
        for (const yearElement of this.yearElements) {
            yearElement.textContent = (startYear++).toString();
        }
    }

    /** @param {number} [increment] */
    updateYears(increment) {
        for (const yearElement of this.yearElements) {
            yearElement.textContent = (+yearElement.textContent + increment).toString();
            const isActive = +yearElement.textContent === this.data.activeYear;
            forceToggleClasses(yearElement, isActive, "font-semibold", "bg-sky-500/20", "text-sky-500");
            forceToggleClasses(yearElement, !isActive, "hover:bg-neutral-200", "dark:hover:bg-[#5e5e5e]", "dark:hover:text-white");
        }
    }

    getNextMonth() {
        this.handleDateChange(new Date(this.data.year, this.data.month + 1, this.data.day, this.data.hour, this.data.minute));
    }

    getPrevMonth() {
        this.handleDateChange(new Date(this.data.year, this.data.month - 1, this.data.day, this.data.hour, this.data.minute));
    }

    changeMonthOnWheel(/** @type {WheelEvent} */ e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (e.deltaY === 0) {
            return;
        }

        const date = new Date(this.data.year, this.data.month + (e.deltaY < 0 ? -1 : 1), this.data.day, this.data.hour, this.data.minute);
        this.handleDateChange(date);
    }

    handleCalendarKeydown(/** @type {KeyboardEvent} */ e) {
        const key = e.key;
        if (key === "Enter" || key === "Tab") {
            this.updateDateTimeInput(this.internalDate);
        } else if (key === "Escape") {
            this.close();
        }

        if (navigationKeys.indexOf(key) === -1) {
            return;
        }

        e.preventDefault();
        console.log(e);
        const date = new Date(this.data.year, this.data.month, this.data.day, this.data.hour, this.data.minute);
        if (upKeys.indexOf(key) > -1) {
            date.setDate(this.data.day - 7);
        } else if (downKeys.indexOf(key) > -1) {
            date.setDate(this.data.day + 7);
        } else if (lefttKeys.indexOf(key) > -1) {
            date.setDate(this.data.day - 1);
        } else if (rightKeys.indexOf(key) > -1) {
            date.setDate(this.data.day + 1);
        }
        this.handleDateChange(date);
    }

    handleHourChange(/** @type {KeyboardEvent} */ e) {
        e.stopPropagation();
        e.stopImmediatePropagation();

        const key = e.key;
        if (key.length === 1 && !e.ctrlKey && /[ -\/:-~]/.test(key)) {
            e.preventDefault();
        } else if (upKeys.indexOf(key) > -1) {
            this.data.hour = this.data.hour + 1 > 23 ? 0 : this.data.hour + 1;
        } else if (downKeys.indexOf(key) > -1) {
            this.data.hour = this.data.hour - 1 < 0 ? 23 : this.data.hour - 1;
        }
    }

    handleHourInputEvents(/** @type {InputEvent} */ e) {
        const value = this.hourInput.value;
        if (/[ -\/:-~]/.test(value) || +value > 23) {
            this.hourInput.value = value[0];
        } else if (/[3-9]/.test(value) || value.length === 2 || e.type === "change") {
            this.data.hour = +value;
            this.minuteInput.focus();
        }
    }

    handleMinuteChange(/** @type {KeyboardEvent} */ e) {
        e.stopPropagation();
        e.stopImmediatePropagation();

        const key = e.key;
        if (key === "Tab") {
            this.updateDateTimeInput(this.internalDate);
        }

        if (key.length === 1 && !e.ctrlKey && /[ -\/:-~]/.test(key)) {
            e.preventDefault();
        } else if (upKeys.indexOf(key) > -1) {
            this.data.minute = this.data.minute + 1 > 59 ? 0 : this.data.minute + 1;
        } else if (downKeys.indexOf(key) > -1) {
            this.data.minute = this.data.minute - 1 < 0 ? 59 : this.data.minute - 1;
        }
    }

    handleMinuteInputEvents(/** @type {InputEvent} */ e) {
        const value = this.minuteInput.value;
        if (/[ -\/:-~]/.test(value) || +value > 59) {
            this.minuteInput.value = value[0];
        } else if (/[6-9]/.test(value) || value.length === 2 || e.type === "change") {
            this.data.minute = +value;
            this.minuteInput.blur();
        }
    }

    /** @param {DateTimeFormField} el */
    setActiveElement(el) {
        this.refElement = el;
        const rect = el.getBoundingClientRect();
        const right = Math.max(
            document.documentElement.clientWidth,
            document.body.scrollWidth,
            document.documentElement.scrollWidth,
            document.body.offsetWidth,
            document.documentElement.offsetWidth
        );

        this.style.top = rect.bottom + 8 + "px";
        this.style.right = right - rect.right + "px";
    }

    /**
     * @param {Date} date
     * @param {string} type
     */
    open(date, type) {
        this.style.display = "";
        this.setAttribute("type", type);
        this.focus();
        this.handleDateChange(date ?? new Date());
    }

    close() {
        if (!this.refElement) {
            return;
        }

        this.style.display = "none";
        this.monthYearPanel.style.display = "none";
        this.refElement.returnFocus();
        this.refElement = null;
    }
}

class DateTimeFormField extends FormFieldBase {
    /** @type {import("../types").DateTimeFormFieldAttributes} */
    data = createReactiveObject({
        id: "",
        type: "datetime",
        name: "datetime",
        label: "Date/Time Input",
        includeLabel: true,
        description: "",
        defaultValue: "",
        placeholder: "Date",
        min: null,
        max: null,
        includeDate: true,
        incudeTime: true,
        layout: "inline",
        required: false,
        readonly: false,
        disabled: false,
        hidden: false,
    });

    /** @type {HTMLDivElement} */
    input = parseHtml(
        `<div class="relative">
            <input id="${this.data.id}" name="${this.data.name}" type="text" class="w-full" disabled />
            <button class="absolute inset-y-0 right-0 flex items-center px-2.5 text-neutral-400" tabindex="-1">
                <svg class="w-5 h-5"><use href="#calendar-icon" /></svg>
            </button>
        </div>`
    );

    internalInput = /** @type {HTMLInputElement} */ (this.input.children[0]);
    button = /** @type {HTMLButtonElement} */ (this.input.children[1]);
    calendar = /** @type {CalendarModal} */ (document.querySelector("calendar-modal"));

    /** @type {Intl.DateTimeFormatOptions} */
    dateStringOptions;
    datetimeRegex =
        /^(1[0-2]|0?[1-9])([\/\-. ])?(3[01]|[12][0-9]|0?[1-9])\2(19[0-9]{2}|2[0-9]{3}|[0-9]{2}),? +(2[0-3]|1[0-9]|0?[0-9]):?([0-5][0-9])/;
    timeRegex = /(2[0-3]|1[0-9]|0?[0-9]):?([0-5][0-9])/;

    initialize() {
        createEffect(() => (this.internalInput.value = this.data.defaultValue));
        createEffect(() => (this.internalInput.placeholder = this.data.placeholder));
        createEffect(() => (this.internalInput.readOnly = this.data.readonly));
        createEffect(() => (this.internalInput.disabled = this.data.disabled));
        createEffect(() => {
            const isDateOrDateTime = this.data.type === "date" || this.data.type == "datetime";
            const isTimeOrDateTime = this.data.type === "time" || this.data.type == "datetime";
            const dateOptions = isDateOrDateTime ? { year: "numeric", month: "2-digit", day: "2-digit" } : {};
            const timeOptions = isTimeOrDateTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {};

            this.dateStringOptions = /** @type {Intl.DateTimeFormatOptions} */ ({ ...dateOptions, ...timeOptions });
            this.calendar.setAttribute("type", this.data.type);
            this.internalInput.value = "";
        });
    }

    setup() {
        addEvents(this.internalInput, "change", () => this.parseDate(this.internalInput.value));
        addEvents(this.button, "click", (/** @type {MouseEvent} */ e) => this.showCalendar(e));
    }

    /** @param {string} dateStr */
    parseDate(dateStr) {
        if (dateStr === "") {
            return;
        }

        let date = new Date();
        let matches;

        if (this.data.type.indexOf("date") > -1 && (matches = dateStr.match(this.datetimeRegex))) {
            let [_1, month, _2, day, year, hours, minutes] = matches;
            if (matches[4].length === 2) {
                year = date.getFullYear().toString().slice(0, 2) + matches[4];
            }
            date.setFullYear(year ? +year : date.getFullYear());
            date.setMonth(month ? +month - 1 : date.getMonth());
            date.setDate(day ? +day : date.getDate());
            date.setHours(hours ? +hours : date.getHours());
            date.setMinutes(minutes ? +minutes : date.getMinutes());
        }

        if (this.data.type === "time" && (matches = dateStr.match(this.timeRegex))) {
            const [_, hours, minutes] = matches;
            date.setHours(hours ? +hours : date.getHours());
            date.setMinutes(minutes ? +minutes : date.getMinutes());
        }

        const isValidDate = date.toString() !== "Invalid Date";
        this.setDate(isValidDate ? date : null);
    }

    /** @param {Date} date */
    setDate(date) {
        this.internalInput.value = date ? date.toLocaleString("default", this.dateStringOptions).replace(",", "") : "";
    }

    /** @param {MouseEvent} e */
    showCalendar(e) {
        e.stopPropagation();

        this.calendar.setActiveElement(this);
        this.button.style.visibility = "hidden";
        this.button.inert = true;
        this.focus();

        const date = new Date(this.internalInput.value);
        this.calendar.open(date.toString() !== "Invalid Date" ? date : new Date(), this.data.type);
    }

    returnFocus() {
        this.button.style.visibility = "";
        this.button.inert = false;
        this.internalInput.focus();
    }
}

customElements.define("calendar-modal", CalendarModal);
customElements.define("datetime-field", DateTimeFormField);
