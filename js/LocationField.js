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

class MapModal extends HTMLElement {
    /** @type {import("../types").MapAttributes} */
    data = createReactiveObject({
        hasLocation: true,
        streetNumber: "6801",
        street: "Industrial Rd",
        city: "Springfield",
        state: "VA",
        zip: "22151",
        lat: 0,
        long: 0,
    });

    /** @type {LocationFormField} */
    activeElement;

    /** @type {import("../types").Map} */
    map;

    /** @type {import("../types").Marker} */
    marker;

    /** @type {HTMLDialogElement} */
    mapModal = parseHtml(
        `<dialog class="relative backdrop:bg-gray-400/40 open:flex flex-col w-[60dvw] h-[85dvh] p-4 shadow-lg rounded-md bg-white dark:bg-card-dark">
            <div class="relative flex px-4 py-2 -mx-4 -mt-4">
                <h2>Select a Location</h2>
                <button class="absolute right-4 p-1 rounded hover:bg-gray-100 dark:hover:bg-accent-dark dark:hover:text-white">
                    <svg class="w-4 h-4 fill-current [fill-rule:evenodd]"><use href="#close-icon" /></svg>
                </button>
            </div>
            <div id="map-popup" class="flex-1 h-full rounded border-2 border-black/20 dark:border-[#73737366] dark:!bg-[#121212]"></div>
            <div class="absolute bottom-8 left-1/2 -translate-x-1/2 grid grid-cols-2 gap-x-12 gap-y-4 p-4 z-[10000] text-sm rounded-lg border-2 bg-white border-black/20 dark:bg-card-dark dark:border-[#73737366]">
                <div class="row-span-2">
                    <h3></h3>
                    <span class="text-xs text-neutral-400"></span>
                    <hr class="mt-3 mb-2" />
                    <span class="text-xs text-[#2cb9e3]"></span>
                </div>        
                <button class="px-5 py-1.5 rounded border text-white bg-[var(--primary)] border-[var(--primary)]">Use Location</button>
                <button class="px-5 py-1.5 rounded border border-gray-200 dark:border-[#434343]">Clear</button>
            </div>
        </dialog>`
    );

    header = /** @type {HTMLDivElement} */ (this.mapModal.children[0]);
    mapElement = /** @type {HTMLDivElement} */ (this.mapModal.children[1]);
    locationPanel = /** @type {HTMLDivElement} */ (this.mapModal.children[2]);

    constructor() {
        super();
        this.append(this.mapModal);

        this.map = L.map("map-popup")
            .on("locationerror", () => alert("error finding location"))
            .on("locationfound", this.setMarker.bind(this))
            .on("click", this.setMarker.bind(this));

        this.marker = L.marker([this.data.lat, this.data.long], { draggable: true, autoPan: true })
            .on("dragend", this.dragEnd.bind(this))
            .addTo(this.map);

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
            className: "map-tiles",
        }).addTo(this.map);
        L.control.currentLocation().addTo(this.map);
        L.control.search().addTo(this.map);

        const locationDisplay = this.locationPanel.children[0];
        const streetAddress = locationDisplay.children[0];
        const statePart = locationDisplay.children[1];
        const latLong = locationDisplay.children[3];

        createEffect(() => (this.locationPanel.style.display = this.data.hasLocation ? "" : "none"));
        createEffect(() => (streetAddress.textContent = `${this.data.streetNumber} ${this.data.street}`));
        createEffect(() => (statePart.textContent = `${this.data.city}, ${this.data.state} ${this.data.zip}`));
        createEffect(() => (latLong.textContent = `${this.data.lat.toFixed(8)}, ${this.data.long.toFixed(8)}`));
    }

    connectedCallback() {
        addEvents(this.header.children[1], "click", () => this.mapModal.close());
        addEvents(this.locationPanel.children[1], "click", () => {
            this.activeElement.setLocationData(this.data);
            this.activeElement = null;
            this.mapModal.close();
        });
        addEvents(this.locationPanel.children[2], "click", () => {
            Object.keys(this.data).forEach((key) => (this.data[key] = typeof this.data[key] === "string" ? null : 0));
            this.data.hasLocation = false;
            this.marker.remove();
        });
    }

    /** @param {LocationFormField} el */
    open(el) {
        this.activeElement = el;
        this.mapModal.showModal();
        this.map.invalidateSize().locate({ setView: true, maxZoom: 16 });
    }

    dragEnd() {
        var position = this.marker.getLatLng();
        this.data.hasLocation = true;
        this.data.streetNumber = "6801";
        this.data.street = "Industrial Rd";
        this.data.city = "Springfield";
        this.data.state = "VA";
        this.data.zip = "22151";
        this.data.lat = position.lat;
        this.data.long = position.lng;
    }

    /** @param {import("../types").LeafletMouseEvent} e */
    setMarker(e) {
        this.data.hasLocation = true;
        this.data.streetNumber = "6801";
        this.data.street = "Industrial Rd";
        this.data.city = "Springfield";
        this.data.state = "VA";
        this.data.zip = "22151";
        this.data.lat = e.latlng.lat;
        this.data.long = e.latlng.lng;
        this.marker.setLatLng(e.latlng).addTo(this.map);
    }
}

class LocationFormField extends FormFieldBase {
    /** @type {import("../types").LocationFormFieldAttributes} */
    data = createReactiveObject({
        id: "",
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
        lat: 0,
        long: 0,
        defaultCurrent: false,
        layout: "inline",
        description: "",
        includeLabel: true,
        required: false,
        readonly: false,
        disabled: false,
        hidden: false,
    });

    /** @type {HTMLDivElement} */
    input = parseHtml(
        `<div class="relative grid grid-cols-3 gap-1.5">
            <button class="absolute top-1.5 right-2.5 mt-px text-neutral-400 hover:text-neutral-400 dark:text-neutral-400/80" tabindex="-1">
                <svg class="w-5 h-5 fill-none stroke-current stroke-[3rem]"><use href="#location-icon" /></svg>
            </button>
            <input type="text" class="col-span-full" style="padding-right: 3.25rem" />
        </div>`
    );

    /** @type {MapModal} */
    mapModal = document.querySelector("map-modal");

    constructor() {
        super();

        const input = this.input.getElementsByTagName("input")[0];
        input.id = this.data.id + "-address";
        input.name = this.data.id + "-address";
        createEffect(() => (input.placeholder = this.data.placeholder));
        createEffect(() => (input.value = this.data.address));
    }

    setup() {
        addEvents(this.input.children[0], "click", () => this.mapModal.open(this));
    }

    /** @param {import("../types").MapAttributes} data */
    setLocationData(data) {
        this.data.address = `${data.streetNumber} ${data.street}, ${data.city}, ${data.state} ${data.zip}`;
        this.data.streetNumber = data.streetNumber;
        this.data.street = data.street;
        this.data.city = data.city;
        this.data.state = data.state;
        this.data.zip = data.zip;
        this.data.lat = data.lat;
        this.data.long = data.long;
    }
}

customElements.define("map-modal", MapModal);
customElements.define("location-field", LocationFormField);
