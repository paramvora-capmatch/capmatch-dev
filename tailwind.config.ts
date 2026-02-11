/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}', // Add this line if your components are also in the root 'components' directory
    './app/**/*.{ts,tsx}',       // Add this line if your app directory is also in the root 'app' directory
    './**/*.{ts,tsx}',            // Add this line to include all tsx/ts files in the project
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['TASA Orbiter', 'var(--font-sans)', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      colors: {
        primary: { // Define primary color
          DEFAULT: "#007BFF", // A standard blue - you can adjust this hex code to your preferred blue
          50: "#E3F2FD",       // Lightest blue
          100: "#BBDEFB",
          200: "#90CAF9",
          300: "#64B5F6",
          400: "#42A5F5",
          500: "#2196F3",      // Slightly darker blue
          600: "#1E88E5",
          700: "#1976D2",
          800: "#1565C0",
          900: "#0D47A1",       // Darkest blue
        },
        secondary: {
          DEFAULT: "#A0AEC0",
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#F0F0F0",
          foreground: "#717171",
        },
        accent: {
          DEFAULT: "#E0E7FF",
          foreground: "#3730A3",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#27272a",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#27272a",
        },
      },
      borderRadius: {
        lg: "0.8rem",
        md: "calc(0.8rem - 2px)",
        sm: "calc(0.8rem - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slow-pulse": {
          "0%, 100%": { opacity: "0.2" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 500ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "slow-pulse": "slow-pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      boxShadow: {
        'sm': '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
        'DEFAULT': '0 4px 8px -2px rgba(0, 0, 0, 0.15), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'md': '0 8px 16px -4px rgba(0, 0, 0, 0.18), 0 4px 8px -4px rgba(0, 0, 0, 0.12)',
        'lg': '0 12px 24px -10px rgba(0, 0, 0, 0.2), 0 8px 16px -10px rgba(0, 0, 0, 0.15)',
        'xl': '0 25px 50px -15px rgba(0, 0, 0, 0.22), 0 12px 24px -15px rgba(0, 0, 0, 0.18)',
        '2xl': '0 40px 80px -20px rgba(0, 0, 0, 0.28)',
        'inner': 'inset 0 4px 8px 0 rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}