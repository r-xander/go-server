(function (root, func) {
    root.formDesigner = root.formDesigner || func();
})(typeof self !== "undefined" ? self : this, function () {
    return (function () {
        "use strict";

        const formDesigner = {
            templates: {},
            fields: [],
            newField: newField,
        };

        function newField(parentSelector, type) {
            /** @type {TextInputAttributes} */
            const fieldDetails = {};

            /** @type {HTMLTemplateElement} */
            const template = formDesigner.templates[type];

            /** @type {HTMLElement} */
            const child = template.firstChild.cloneNode(true);

            /** @type {HTMLElement} */
            const parent = document.querySelector(parentSelector);
            parent.appendChild(child);

            child.style.opacity = "0";
            child.style.translate = "-12px 0";
            window.getComputedStyle(child).opacity;
            child.removeAttribute("style");
        }

        function intializeTemplates() {
            const templates = getDocument().querySelectorAll("[form-template]");

            for (let i = 0; i < templates.length; i++) {
                const template = templates[i];
                const templateName = template.getAttribute("form-template");

                formDesigner.templates[templateName] = template;
            }
        }

        //====================================================================
        // Initialization
        //====================================================================
        var isReady = false;
        getDocument().addEventListener("DOMContentLoaded", function () {
            isReady = true;
        });

        /**
         * Execute a function now if DOMContentLoaded has fired, otherwise listen for it.
         *
         * This function uses isReady because there is no realiable way to ask the browswer whether
         * the DOMContentLoaded event has already been fired; there's a gap between DOMContentLoaded
         * firing and readystate=complete.
         */
        function ready(fn) {
            // Checking readyState here is a failsafe in case the htmx script tag entered the DOM by
            // some means other than the initial page load.
            if (isReady || getDocument().readyState === "complete") {
                fn();
            } else {
                getDocument().addEventListener("DOMContentLoaded", fn);
            }
        }

        ready(function () {
            intializeTemplates();
        });

        return formDesigner;
    })();
});
