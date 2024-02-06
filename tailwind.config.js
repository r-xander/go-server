/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./views/*.html", "./js/*.js"],
    theme: {
        extend: {
            gridTemplateColumns: {
                "fill-18": "repeat(auto-fill, minmax(4.5rem, 1fr))",
            },
        },
    },
    plugins: [],
};
