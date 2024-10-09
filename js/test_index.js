//@ts-check

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
