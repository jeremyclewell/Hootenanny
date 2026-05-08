import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        serif: ["Fraunces", "Lora", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // Coral — primary CTA / "Can't make it" tone
        terracotta: {
          50:  "hsl(8, 80%, 96%)",
          100: "hsl(8, 75%, 91%)",
          400: "hsl(8, 78%, 70%)",
          500: "hsl(8, 82%, 62%)",
          600: "hsl(8, 70%, 50%)",
          700: "hsl(8, 65%, 40%)",
        },
        // Sand — "Maybe" tone (soft warm yellow)
        sand: {
          100: "hsl(38, 90%, 95%)",
          200: "hsl(38, 85%, 88%)",
          400: "hsl(35, 75%, 70%)",
          600: "hsl(32, 65%, 42%)",
        },
        // Mint — "Going" tone
        sage: {
          50:  "hsl(160, 50%, 95%)",
          100: "hsl(160, 45%, 88%)",
          400: "hsl(160, 40%, 60%)",
          600: "hsl(165, 50%, 32%)",
          700: "hsl(165, 45%, 24%)",
        },
        // Midnight teal — dark hero gradient + accents
        teal: {
          50:  "hsl(195, 60%, 95%)",
          100: "hsl(195, 55%, 88%)",
          400: "hsl(195, 50%, 50%)",
          500: "hsl(195, 50%, 36%)",
          700: "hsl(200, 45%, 22%)",
          900: "hsl(210, 45%, 16%)",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
