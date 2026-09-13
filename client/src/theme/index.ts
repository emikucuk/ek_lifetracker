import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

/** Jungle #1A4731 · Cream Soda #FFF4CC */
export const theme = extendTheme({
  config,
  fonts: {
    heading: `'Outfit', system-ui, sans-serif`,
    body: `'Manrope', system-ui, sans-serif`,
  },
  colors: {
    canvas: {
      50: "#FFFFFF",
      100: "#FFF4CC",
      200: "#F5E6A8",
      300: "#E8D48A",
    },
    ink: {
      50: "#F2F6F3",
      100: "#DCE6E0",
      200: "#B8C9BF",
      300: "#8AA497",
      400: "#5C7A6B",
      500: "#3F5C4E",
      600: "#2D4A3C",
      700: "#1F3A2E",
      800: "#1A4731",
      900: "#0F2A1C",
    },
    brand: {
      50: "#EAF3EE",
      100: "#D0E4D9",
      200: "#A3C8B4",
      300: "#6FA68A",
      400: "#3F7A5C",
      500: "#1A4731",
      600: "#163C2A",
      700: "#123224",
      800: "#0E281C",
      900: "#0A1D15",
    },
    accent: {
      50: "#FFF9E8",
      100: "#FFF4CC",
      200: "#F5E6A8",
      300: "#E8D48A",
      400: "#D4BB5C",
      500: "#C4A63A",
      600: "#9A8128",
      700: "#74611F",
      800: "#524516",
      900: "#3A310F",
    },
  },
  radii: {
    xl: "1rem",
    "2xl": "1.25rem",
    "3xl": "1.75rem",
  },
  shadows: {
    soft: "0 1px 2px rgba(26, 71, 49, 0.05), 0 8px 24px rgba(26, 71, 49, 0.07)",
    lift: "0 16px 48px rgba(26, 71, 49, 0.14)",
    focus: "0 0 0 3px rgba(26, 71, 49, 0.18)",
  },
  styles: {
    global: {
      "html, body": {
        bg: "canvas.50",
        color: "ink.900",
      },
      body: {
        letterSpacing: "var(--tracking-normal)",
      },
      h1: { letterSpacing: "var(--tracking-tighter)" },
      h2: { letterSpacing: "var(--tracking-tighter)" },
      h3: { letterSpacing: "var(--tracking-tight)" },
      h4: { letterSpacing: "var(--tracking-tight)" },
      "*:focus": {
        outline: "none",
      },
      "*:focus-visible": {
        outline: "none",
        boxShadow: "none",
      },
      "input:focus, input:focus-visible, textarea:focus, textarea:focus-visible, select:focus, select:focus-visible":
        {
          outline: "none !important",
          boxShadow: "none !important",
        },
    },
  },
  components: {
    Heading: {
      baseStyle: {
        fontFamily: "heading",
        fontWeight: "750",
        letterSpacing: "var(--tracking-tighter)",
      },
    },
    Text: {
      baseStyle: {
        letterSpacing: "var(--tracking-normal)",
      },
    },
    Button: {
      baseStyle: {
        fontWeight: "600",
        borderRadius: "xl",
        letterSpacing: "var(--tracking-normal)",
        transition: "all 200ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
      defaultProps: {
        colorScheme: "brand",
      },
      variants: {
        solid: {
          bg: "brand.500",
          color: "canvas.100",
          _hover: { bg: "brand.600", color: "canvas.100" },
          _active: { bg: "brand.700", color: "canvas.100" },
        },
        outline: {
          borderColor: "brand.100",
          color: "brand.700",
          _hover: { bg: "brand.50", color: "brand.800" },
        },
        ghost: {
          color: "ink.600",
          _hover: { bg: "brand.50", color: "brand.700" },
          _active: { bg: "brand.100", color: "brand.800" },
        },
      },
    },
    IconButton: {
      baseStyle: {
        borderRadius: "xl",
        transition: "all 180ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
      defaultProps: {
        colorScheme: "brand",
      },
      variants: {
        solid: {
          bg: "brand.500",
          color: "canvas.100",
          _hover: { bg: "brand.600", color: "canvas.100" },
          _active: { bg: "brand.700", color: "canvas.100" },
        },
        outline: {
          borderColor: "brand.100",
          color: "brand.700",
          _hover: { bg: "brand.50", color: "brand.800" },
        },
        ghost: {
          color: "ink.600",
          _hover: { bg: "brand.50", color: "brand.700" },
          _active: { bg: "brand.100", color: "brand.800" },
        },
      },
    },
    FormLabel: {
      baseStyle: {
        fontSize: "xs",
        fontWeight: "700",
        color: "ink.500",
        letterSpacing: "var(--tracking-widest)",
        textTransform: "uppercase",
        mb: 2,
      },
    },
    Switch: {
      baseStyle: {
        track: {
          bg: "ink.100",
          _checked: { bg: "brand.500" },
        },
      },
    },
    Drawer: {
      baseStyle: {
        dialog: {
          bg: "white",
          boxShadow: "lift",
        },
        header: {
          fontFamily: "heading",
          fontWeight: "750",
          letterSpacing: "var(--tracking-tight)",
          borderBottom: "1px solid",
          borderColor: "brand.50",
        },
        footer: {
          bg: "accent.50",
          borderTop: "1px solid",
          borderColor: "brand.50",
        },
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: "full",
        px: 2.5,
        py: 0.5,
        textTransform: "none",
        fontWeight: "600",
        letterSpacing: "var(--tracking-wide)",
      },
    },
  },
});
