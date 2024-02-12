/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./views/*.html", "./js/*.js"],
    theme: {
        extend: {
            gridTemplateColumns: {
                "fill-20": "repeat(auto-fill, minmax(5rem, 1fr))",
            },
        },
    },
    plugins: [],
};
