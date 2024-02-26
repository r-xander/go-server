// const actionElementContainer = document.querySelector("#action-element-container");

// const actionSortable = new Sortable(actionElementContainer, {
//     group: {
//         name: "action_elements",
//         pull: "clone",
//         put: false,
//     },
//     sort: false,
//     animation: 150,
//     // onStart: function (evt) {
//     //     console.log(evt);
//     // },
//     // onEnd: function (evt) {
//     //     console.log(evt);
//     // },
//     // onAdd: function (evt) {
//     //     console.log(evt);
//     // },
//     // onRemove: function (evt) {
//     //     console.log(evt);
//     // },
//     // onMove: function (evt) {
//     //     console.log(evt);
//     // },
// });

const sectionElements = document.querySelectorAll("[data-section]");
const sectionSortables = [];

for (let i = 0; i < sectionElements.length; i++) {
    const section = sectionElements[i];
    sectionSortables.push(
        new Sortable(section, {
            group: {
                name: "sections",
                pull: true,
                put: true,
            },
            animation: 150,
            // onAdd: function (evt) {
            //     console.log(evt);
            //     const template = evt.item.getAttribute("dd-template");
            //     const templateElement = document.querySelector("#" + template);
            //     evt.clone = templateElement.content.cloneNode(true);
            // },
            // onClone: function (evt) {
            //     console.log(evt);
            //     const template = evt.item.getAttribute("dd-template");
            //     const templateElement = document.querySelector("#" + template);
            //     evt.clone = templateElement.content.cloneNode(true);
            // },
        })
    );
}
