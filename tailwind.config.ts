import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        grayscale: {
          50: "#f8f8f8",
          100: "#eaeaea",
          200: "#d8d8d8",
          300: "#bababa",
          400: "#aaaaaa",
          500: "#9b9b9b",
          600: "#666666",
          700: "#565656",
          800: "#474747",
          900: "#2d2d2d",
          1000: "#1e1e1e",
          1100: "#101010",
        },
        orange: {
          50: "#fdf8e8",
          100: "#faeab8",
          200: "#f4d062",
          300: "#dca910",
          400: "#c7990e",
          500: "#b58b0d",
          600: "#795d09",
          700: "#695107",
          800: "#554206",
          900: "#372b04",
          1000: "#292003",
          1100: "#130f01",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
