import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/app/**/*.{js,ts,jsx,tsx}",
        "./src/components/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                brand: {
                    // Warm cream background
                    bgStart: "#FDF8F3",
                    bgEnd: "#FAF3E8",
                    // Golden yellow accent (matching reference)
                    accent: "#F5C542",
                    accentDark: "#E5B432",
                    accentLight: "#FDF4D8",
                    // Dark text
                    text: "#1A1A1A",
                    mutedText: "#6B7280",
                    // Card & UI
                    card: "#FFFFFF",
                    border: "#F0E6D8",
                    pillBg: "#F5F0E8",
                }
            },
            borderRadius: {
                'card': '24px',
                'button': '12px',
                'pill': '50px',
            },
            boxShadow: {
                'card': '0 4px 20px rgba(0, 0, 0, 0.04)',
                'cardHover': '0 8px 30px rgba(0, 0, 0, 0.08)',
                'button': '0 2px 8px rgba(245, 197, 66, 0.3)',
            },
            keyframes: {
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'slide-up': {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'pulse-soft': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.6' },
                },
                'shimmer': {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
            animation: {
                'fade-in': 'fade-in 0.4s ease-out',
                'slide-up': 'slide-up 0.5s ease-out',
                'slide-up-delay': 'slide-up 0.5s ease-out 0.1s both',
                'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
                'shimmer': 'shimmer 1.5s infinite linear',
            },
        },
    },
    plugins: [
        require("@tailwindcss/typography"),
    ],
}

export default config;
