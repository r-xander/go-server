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
        columns: ["one", "two", "three"],
        fields: ["text", "text", "number"],
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
            this.input.style.gridTemplateColumns = `repeat(${this.data.columns.length + 1}, minmax(0, 1fr))`;

            if (this.data.columns.length === 0) {
                const noColumnSpan = parseHtml(
                    `<span class="col-span-full flex items-center px-3 p-1.5 rounded border border-[#ccc] dark:bg-aux-dark dark:border-aux-dark">No options have been added</span>`
                );
                this.input.append(noColumnSpan);
                return;
            }

            if (this.data.includeColumnHeaders) {
                this.input.append(parseHtml(`<span class="align-center text-center"></span>`));
                for (const col of this.data.columns) {
                    this.input.append(parseHtml(`<span class="align-center text-center">${col}</span>`));
                }
            }

            for (const col of this.data.listItems) {
                this.input.append(parseHtml(`<span class="flex items-center h-full w-full p-1">${col}</span>`));
                for (const field of this.data.fields) {
                    this.input.append(parseHtml(`<span"><input type="${field}" class="w-full" /></span>`));
                }
            }
        });
    }

    setup() {}
}

customElements.define("list-component", ListComponent);
