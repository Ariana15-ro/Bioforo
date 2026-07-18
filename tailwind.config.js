/**
 * TailwindCSS v3 configuration for BioForo.
 * Mobile-first design system with a "green leaf" primary and a dark forest theme.
 */
/** @type {import('tailwindcss').Config} */
export default {
  // Mobile-first: our base styles target small screens and scale up via sm:/md: prefixes.
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class", // we force dark via the `dark` class on <html>
  theme: {
    extend: {
      colors: {
        // Primary brand color (verde hoja / leaf green)
        bio: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e", // primary
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          DEFAULT: "#22c55e",
        },
        // Dark forest background palette
        forest: {
          50: "#f3f6f4",
          100: "#e3ebe5",
          200: "#c7d6cb",
          300: "#9cb6a3",
          400: "#6c8e76",
          500: "#4d6e57",
          600: "#3a5643",
          700: "#304536",
          800: "#28382c",
          900: "#1f2c23",
          950: "#0e1710", // deepest background
        },
      },
      fontFamily: {
        // Modern sans-serif stack (Inter loaded via index.html)
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      maxWidth: {
        // Simulated phone frame on larger screens
        mobile: "28rem", // == max-w-md
      },
      boxShadow: {
        nav: "0 -1px 12px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};
