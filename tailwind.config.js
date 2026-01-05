/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                morroky: {
                    red: '#c1272d',
                    green: '#006233',
                    gold: '#c6a664',
                    dark: '#1a1a1a'
                }
            }
        },
    },
    plugins: [],
}
