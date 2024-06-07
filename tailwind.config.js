/** @type {import('tailwindcss').Config} */

const defaultTheme = require("tailwindcss/defaultTheme");
const colors = require("tailwindcss/colors");
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
            fontFamily: {
                sans: ["Inter", ...defaultTheme.fontFamily.sans],
            },
            // Set theme colors (Required config!)
            colors: {
                primary: colors.blue,
                secondary: colors.slate,
                "base-dark": "#0e0e0e",
                "card-dark": "#202020",
                "aux-dark": "#363636",
            },
        },
    },
    plugins: [require("@tailwindcss/container-queries")],
};
