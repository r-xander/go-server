//@ts-check

class ListComponent extends FormFieldBase {
    /** @type {import("../types").ListComponentAttributes} */
    data = createReactiveObject({
        id: "",
        type: "list",
        name: "list",
        label: "List",
        defaultValue: null,
        description: "",
        layout: "block",
        includeColumnHeaders: true,
        columns: ["one", "two", "three", "four", "five", "six"],
        fields: ["text", "text", "number", "text", "number", "text"],
        listItems: ["Option One", "Option Two", "Option Three"],
        includeLabel: true,
        required: false,
        readonly: false,
        disabled: false,
        hidden: false,
    });

    initialize() {
        this.input = parseHtml(`<div class="grid gap-1"></div>`);

        createEffect(() => {
            this.input.innerHTML = "";

            if (this.data.columns.length === 0) {
                const noColumnSpan = document.createElement("span");
                noColumnSpan.className =
                    "col-span-full flex items-center px-3 p-1.5 rounded border border-[#ccc] dark:bg-aux-dark dark:border-aux-dark";
                noColumnSpan.textContent = "No options have been added";
                this.input.append(noColumnSpan);
                return;
            }

            if (this.data.includeColumnHeaders) {
                const row = parseHtml(`<div class="grid grid-cols-[3fr_4fr]"></div>`);
                row.append(parseHtml(`<span class="align-center text-center"></span>`));

                const columnContainer = parseHtml(`<div class="grid gap-1"></div>`);
                columnContainer.style.gridTemplateColumns = `repeat(${this.data.columns.length}, 1fr)`;
                for (const col of this.data.columns) {
                    columnContainer.append(parseHtml(`<span class="align-center text-center">${col}</span>`));
                }

                row.append(columnContainer);
                this.input.append(row);
            }

            for (const col of this.data.listItems) {
                const row = parseHtml(`<div class="grid grid-cols-[3fr_4fr] gap-1"></div>`);
                row.append(parseHtml(`<span class="min-w-48 flex items-center h-full w-full p-1">${col}</span>`));

                const columnContainer = parseHtml(`<div class="grid gap-1"></div>`);
                columnContainer.style.gridTemplateColumns = `repeat(${this.data.columns.length}, 1fr)`;
                for (const field of this.data.fields) {
                    columnContainer.append(parseHtml(`<span"><input type="${field}" class="w-full" /></span>`));
                }

                row.append(columnContainer);
                this.input.append(row);
            }
        });
    }

    setup() {}
}

customElements.define("list-component", ListComponent);
