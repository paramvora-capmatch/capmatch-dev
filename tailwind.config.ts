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
          sans: ['var(--font-sans)', 'Poppins', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
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
          "accordion-down": "accordion-down 0.2s ease-out",
          "accordion-up": "accordion-up 0.2s ease-out",
        },
        animation: {
          "accordion-down": "accordion-down 0.2s ease-out",
          "accordion-up": "accordion-up 0.2s ease-out",
        },
      },
    },
    plugins: [require("tailwindcss-animate")],
  }