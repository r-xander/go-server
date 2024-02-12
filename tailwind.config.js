/** @type {import('tailwindcss').Config} */
module.exports = {
    mode: "jit",
    content: ["./**/*.{html,js}"],
    theme: {
        extend: {
            gridTemplateColumns: {
                "fill-20": "repeat(auto-fill, minmax(5rem, 1fr))",
            },
        },
    },
    plugins: [require("@tailwindcss/container-queries"), require("@tailwindcss/forms")],
};
