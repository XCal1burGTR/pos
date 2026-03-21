/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#6366f1",
                secondary: "#ec4899",
                dark: "#1e293b",
                darker: "#0f172a",
                sidebar: {
                    DEFAULT: "#0f172a",
                    hover: "#1e293b",
                    active: "#6366f1",
                    border: "#1e293b",
                    text: "#94a3b8",
                    "text-active": "#ffffff",
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            boxShadow: {
                'card': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
                'card-hover': '0 8px 30px -4px rgb(0 0 0 / 0.08), 0 3px 8px -2px rgb(0 0 0 / 0.06)',
                'modal': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
                'btn-primary': '0 2px 8px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
                'btn-primary-hover': '0 4px 20px rgba(99,102,241,0.55), inset 0 1px 0 rgba(255,255,255,0.25)',
                'btn-danger': '0 2px 8px rgba(239,68,68,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
                'btn-danger-hover': '0 4px 20px rgba(239,68,68,0.55), inset 0 1px 0 rgba(255,255,255,0.25)',
                'btn-success': '0 2px 8px rgba(16,185,129,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
                'btn-success-hover': '0 4px 20px rgba(16,185,129,0.55), inset 0 1px 0 rgba(255,255,255,0.25)',
                'btn-secondary': '0 2px 8px rgba(30,41,59,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                'btn-secondary-hover': '0 4px 16px rgba(30,41,59,0.45), inset 0 1px 0 rgba(255,255,255,0.15)',
                'input-focus': '0 0 0 3px rgba(99,102,241,0.12), 0 1px 4px rgba(0,0,0,0.04)',
                'glow-indigo': '0 0 20px rgba(99,102,241,0.3)',
            },
        },
    },
    plugins: [
        require("tailwindcss-animate")
    ],
}
