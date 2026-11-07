/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Stitch Brand & Action Tokens
        "primary": "#4f28cf",
        "primary-container": "#6848e8",
        "btn-primary": "#6040F0",
        "primary-hover": "#5639D8",
        "primary-light": "#8870F0",
        "primary-fixed": "#e6deff",
        "primary-fixed-dim": "#cabeff",
        "on-primary": "#ffffff",
        "on-primary-container": "#e9e2ff",
        "on-primary-fixed": "#1c0062",
        "on-primary-fixed-variant": "#471ac8",
        "inverse-primary": "#cabeff",

        // Canvas & Surfaces
        "canvas-main": "#F9F9FB",
        "canvas-lavender": "#F5F4FC",
        "surface-card": "#FFFFFF",
        "surface-sidebar": "#F8F8FC",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f5f2ff",
        "surface-container": "#eeecff",
        "surface-container-high": "#e8e6fe",
        "surface-container-highest": "#e2e0f8",
        "border-subtle": "#E5E5EF",
        "surface-dim": "#d9d8f0",
        "surface-bright": "#fcf8ff",
        "surface-tint": "#603edf",
        "inverse-surface": "#2e2f41",
        "inverse-on-surface": "#f1efff",

        // Typography
        "text-primary": "#141529",
        "text-secondary": "#5C5C70",
        "text-muted": "#9C9CA9",
        "on-surface": "#191a2b",
        "on-surface-variant": "#484555",
        "on-background": "#191a2b",

        // Ticket Severity
        "severity-blocker": "#F55354",
        "severity-critical": "#F8A040",
        "severity-major": "#F8C048",

        // Ticket Workflow Status
        "status-open": "#3888F8",
        "status-wip": "#6848E8",
        "status-on-hold": "#F8A040",
        "status-resolved": "#28C078",
        "status-closed": "#9C9CA9",

        // Feedback / Error
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",

        // Secondary / Tertiary
        "secondary": "#5f5887",
        "secondary-container": "#d1c8fe",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#595280",
        "tertiary": "#7f3b00",
        "tertiary-container": "#a44e00",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#ffdfcd",
        "outline": "#797586",
        "outline-variant": "#c9c4d8",
      },
      fontFamily: {
        headline: ["'Plus Jakarta Sans'", "sans-serif"],
        body: ["Inter", "sans-serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["monospace"],
      },
      spacing: {
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2rem",
        "space-2xl": "3rem",
        "gutter": "1.5rem",
        "gutter-sm": "1rem",
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "sm": "0.25rem",
        "md": "0.375rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "full": "9999px",
      },
      fontSize: {
        "label-sm": ["11px", { lineHeight: "14px", letterSpacing: "0.02em", fontWeight: "600" }],
        "body-sm": ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.01em", fontWeight: "600" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "label-lg": ["14px", { lineHeight: "20px", fontWeight: "600" }],
        "headline-sm": ["16px", { lineHeight: "24px", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "headline-md": ["20px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-lg": ["24px", { lineHeight: "32px", letterSpacing: "-0.015em", fontWeight: "700" }],
        "headline-xl": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }],
      },
    },
  },
  plugins: [],
}
