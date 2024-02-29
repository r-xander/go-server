/** @type {import('tailwindcss').Config} */
module.exports = {
    mode: "jit",
    content: ["./**/*.{html,js}"],
    theme: {
        extend: {
            gridTemplateColumns: {
                "fill-20": "repeat(auto-fill, minmax(5rem, 1fr))",
            },
            keyframes: {
                insert: {
                    "0%": { scaleY: "0", opacity: "0" },
                    "100%": { scaleY: "1", opacity: "1" },
                },
            },
            animation: {
                insert: "insert 0.5s ease-in forwards",
            },
        },
    },
    plugins: [require("@tailwindcss/container-queries"), require("@tailwindcss/forms")],
};
