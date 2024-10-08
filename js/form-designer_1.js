(function (root, func) {
    root.formDesigner = root.formDesigner || func();
})(typeof self !== "undefined" ? self : this, function () {
    return (function () {
        "use strict";

        const formDesigner = {
            actions: {},
            dropZones: {},
            optionsContainer: null,
            newField: newField,
            setOptionsContainer: setOptionsContainer,
        };

        /**
         * @param {HTMLElement} container
         */
        function setOptionsContainer(container) {
            ready(() => {
                formDesigner.optionsContainer = container;
            });
        }

        function newField(name, parentSelector, type) {
            /** @type {HTMLTemplateElement} */
            const templ = formDesigner.fieldTemplates[type];

            /** @type {HTMLElement} */
            const child = templ.firstChild.cloneNode(true);

            child.internals = {
                /** @type {TextInputAttributes} */
                fieldDetails: addInputAttributes(name, type),
                type,
                name,
            };

            addEventHandler(child);

            /** @type {HTMLElement} */
            const parent = document.querySelector(parentSelector);
            parent.appendChild(child);

            child.style.opacity = "0";
            child.style.translate = "-12px 0";
            window.getComputedStyle(child).opacity;
            child.removeAttribute("style");
        }

        /**
         * Adds event handlers to the child element.
         *
         * @param {HTMLElement} child
         */
        function addEventHandler(child) {
            child.addEventListener("click", clickHandler);
        }

        function clickHandler(e) {
            const optionsTemplate = formDesigner.optionsTemplates[optionsType];
            const options = optionsTemplate.cloneNode(true);

            const target = e.target;
            const optionsType = target.optionsType;

            const fields = options.querySelectorAll("input, select, textarea");
            for (let i = 0; i < fields.length; i++) {
                const field = fields[i];

                field.addEventHandler("change", function (e) {
                    const fieldTarget = e.target;
                    const name = fieldTarget.name;
                    const value = fieldTarget.value;

                    target[name] = value;
                    formDesigner.fields[name] = value;

                    e.stopImmediatePropagation();
                    e.stopPropagation();
                    e.preventDefault();
                    return false;
                });
            }

            formDesigner.optionsContainer.appendChild(options);
        }

        function addInputAttributes(name, type) {
            return attributes;
        }

        function initializeActionElements() {
            /** @type {NodeListOf<HTMLTemplateElement>} */
            const inputs = getDocument().querySelectorAll("[draggable=true]");

            for (let i = 0; i < inputs.length; i++) {
                const input = inputs[i];
                const templateName = input.getAttribute("dd-template");

                /** @type {HTMLTemplateElement} */
                const templ = input.querySelector("#" + templateName);

                function dragStartHandler(e) {
                    e.dataTransfer.setData("text/html", templ.content.innerHTML);
                }

                formDesigner.actions[templateName] = {
                    template: templ,
                    handler: dragStartHandler,
                };

                input.addEventHandler("dragstart", dragStartHandler);
            }
        }

        function initializeDropZone() {
            const dropZones = getDocument().querySelectorAll("template[dd-dropzone]");

            for (let i = 0; i < dropZones.length; i++) {
                const dropZone = dropZones[i];
                const name = dropZone.getAttribute("dd-dropzone");

                formDesigner.actionElements[name] = dropZone;
            }
        }

        function addDropZone(templateId) {
            const actionElements = getDocument().querySelectorAll("[form-options]");

            for (let i = 0; i < actionElements.length; i++) {
                const actionElement = actionElements[i];
                const actionName = actionElement.getAttribute("form-options");

                formDesigner.actionElements[actionName] = actionElement;
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
            initializeActionElements();
        });

        return formDesigner;
    })();
});
