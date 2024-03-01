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
                    "100%": { clip: "rect(auto, auto, 20rem, auto)" },
                },
            },
            animation: {
                insert: "insert 0.5s ease-in forwards",
            },
        },
    },
    plugins: [require("@tailwindcss/container-queries"), require("@tailwindcss/forms")],
};
