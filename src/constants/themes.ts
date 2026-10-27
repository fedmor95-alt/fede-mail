/**
 * Full-surface themes (Apple Mail style: solid panels, no glass).
 * Each theme sets every colour token from styles/globals.css, in a light and
 * a dark variant; the variant follows the light/dark/system setting.
 */
export type ColorThemeId = "mail" | "grafite" | "carta" | "nord" | "salvia" | "notte";

interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgHover: string;
  bgSelected: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  borderPrimary: string;
  borderSecondary: string;
  accent: string;
  accentHover: string;
  accentLight: string;
  sidebarBg: string;
  sidebarText: string;
  sidebarHover: string;
}

export interface ColorTheme {
  id: ColorThemeId;
  name: string;
  swatch: string;
  light: ThemeColors;
  dark: ThemeColors;
}

const MAIL_LIGHT: ThemeColors = {
  bgPrimary: "#ffffff",
  bgSecondary: "#f5f5f7",
  bgTertiary: "#e8e8ed",
  bgHover: "rgba(0, 0, 0, 0.04)",
  bgSelected: "#dbe9ff",
  textPrimary: "#1d1d1f",
  textSecondary: "#6e6e73",
  textTertiary: "#8e8e93",
  borderPrimary: "rgba(0, 0, 0, 0.1)",
  borderSecondary: "rgba(0, 0, 0, 0.05)",
  accent: "#0a84ff",
  accentHover: "#0071e3",
  accentLight: "#e5f0ff",
  sidebarBg: "#ececef",
  sidebarText: "#1d1d1f",
  sidebarHover: "rgba(0, 0, 0, 0.05)",
};

const MAIL_DARK: ThemeColors = {
  bgPrimary: "#1e1e1e",
  bgSecondary: "#252527",
  bgTertiary: "#323235",
  bgHover: "rgba(255, 255, 255, 0.05)",
  bgSelected: "#0b3a73",
  textPrimary: "#f5f5f7",
  textSecondary: "#a1a1a6",
  textTertiary: "#7c7c80",
  borderPrimary: "rgba(255, 255, 255, 0.1)",
  borderSecondary: "rgba(255, 255, 255, 0.05)",
  accent: "#0a84ff",
  accentHover: "#409cff",
  accentLight: "#0b2a4f",
  sidebarBg: "#2a2a2d",
  sidebarText: "#e5e5ea",
  sidebarHover: "rgba(255, 255, 255, 0.06)",
};

export const COLOR_THEMES: ColorTheme[] = [
  { id: "mail", name: "Mail", swatch: "#0a84ff", light: MAIL_LIGHT, dark: MAIL_DARK },
  {
    id: "grafite",
    name: "Grafite",
    swatch: "#6e6e73",
    light: {
      ...MAIL_LIGHT,
      bgSelected: "#e3e3e8",
      accent: "#6e6e73",
      accentHover: "#545458",
      accentLight: "#ececf0",
    },
    dark: {
      ...MAIL_DARK,
      bgSelected: "#3a3a3e",
      accent: "#a1a1a6",
      accentHover: "#c7c7cc",
      accentLight: "#2c2c2f",
    },
  },
  {
    id: "carta",
    name: "Carta",
    swatch: "#b3541e",
    light: {
      bgPrimary: "#fbf8f1",
      bgSecondary: "#f3eee2",
      bgTertiary: "#e7e0cf",
      bgHover: "rgba(60, 40, 10, 0.05)",
      bgSelected: "#f3dcc8",
      textPrimary: "#2b2620",
      textSecondary: "#6b6156",
      textTertiary: "#968b7c",
      borderPrimary: "rgba(60, 40, 10, 0.12)",
      borderSecondary: "rgba(60, 40, 10, 0.06)",
      accent: "#b3541e",
      accentHover: "#953f10",
      accentLight: "#f6e3d3",
      sidebarBg: "#efe8d8",
      sidebarText: "#2b2620",
      sidebarHover: "rgba(60, 40, 10, 0.06)",
    },
    dark: {
      bgPrimary: "#1f1b16",
      bgSecondary: "#27221b",
      bgTertiary: "#352e25",
      bgHover: "rgba(255, 240, 220, 0.05)",
      bgSelected: "#4a2f1c",
      textPrimary: "#efe7da",
      textSecondary: "#b9ad9c",
      textTertiary: "#8a7f70",
      borderPrimary: "rgba(255, 240, 220, 0.1)",
      borderSecondary: "rgba(255, 240, 220, 0.05)",
      accent: "#e08a4f",
      accentHover: "#eba574",
      accentLight: "#3b2618",
      sidebarBg: "#24201a",
      sidebarText: "#e6dccb",
      sidebarHover: "rgba(255, 240, 220, 0.06)",
    },
  },
  {
    id: "nord",
    name: "Nord",
    swatch: "#5e81ac",
    light: {
      bgPrimary: "#f4f6f9",
      bgSecondary: "#e9edf2",
      bgTertiary: "#d8dee9",
      bgHover: "rgba(46, 52, 64, 0.05)",
      bgSelected: "#d3dff0",
      textPrimary: "#2e3440",
      textSecondary: "#4c566a",
      textTertiary: "#6b7385",
      borderPrimary: "rgba(46, 52, 64, 0.12)",
      borderSecondary: "rgba(46, 52, 64, 0.06)",
      accent: "#5e81ac",
      accentHover: "#4c6d96",
      accentLight: "#dfe8f3",
      sidebarBg: "#e5e9f0",
      sidebarText: "#2e3440",
      sidebarHover: "rgba(46, 52, 64, 0.06)",
    },
    dark: {
      bgPrimary: "#2e3440",
      bgSecondary: "#353c4a",
      bgTertiary: "#434c5e",
      bgHover: "rgba(236, 239, 244, 0.05)",
      bgSelected: "#44556e",
      textPrimary: "#eceff4",
      textSecondary: "#d8dee9",
      textTertiary: "#a3abba",
      borderPrimary: "rgba(236, 239, 244, 0.1)",
      borderSecondary: "rgba(236, 239, 244, 0.05)",
      accent: "#88c0d0",
      accentHover: "#a3d0dc",
      accentLight: "#3b4a5c",
      sidebarBg: "#292e39",
      sidebarText: "#e5e9f0",
      sidebarHover: "rgba(236, 239, 244, 0.06)",
    },
  },
  {
    id: "salvia",
    name: "Salvia",
    swatch: "#4f7d5c",
    light: {
      bgPrimary: "#fbfcfa",
      bgSecondary: "#f0f3ee",
      bgTertiary: "#dfe6da",
      bgHover: "rgba(30, 50, 30, 0.05)",
      bgSelected: "#dceadf",
      textPrimary: "#1f2a1f",
      textSecondary: "#556353",
      textTertiary: "#7d8a7a",
      borderPrimary: "rgba(30, 50, 30, 0.12)",
      borderSecondary: "rgba(30, 50, 30, 0.06)",
      accent: "#4f7d5c",
      accentHover: "#3d6649",
      accentLight: "#e3efe5",
      sidebarBg: "#e9eee6",
      sidebarText: "#1f2a1f",
      sidebarHover: "rgba(30, 50, 30, 0.06)",
    },
    dark: {
      bgPrimary: "#1a1f1b",
      bgSecondary: "#212823",
      bgTertiary: "#2c352e",
      bgHover: "rgba(230, 245, 230, 0.05)",
      bgSelected: "#2b4433",
      textPrimary: "#e8efe8",
      textSecondary: "#aab8aa",
      textTertiary: "#7d8b7e",
      borderPrimary: "rgba(230, 245, 230, 0.1)",
      borderSecondary: "rgba(230, 245, 230, 0.05)",
      accent: "#7fb58e",
      accentHover: "#9bc7a7",
      accentLight: "#22352a",
      sidebarBg: "#171c18",
      sidebarText: "#dfe7df",
      sidebarHover: "rgba(230, 245, 230, 0.06)",
    },
  },
  {
    id: "notte",
    name: "Notte",
    swatch: "#000000",
    light: MAIL_LIGHT,
    dark: {
      ...MAIL_DARK,
      bgPrimary: "#000000",
      bgSecondary: "#0b0b0c",
      bgTertiary: "#1c1c1e",
      bgSelected: "#10284a",
      textTertiary: "#6e6e73",
      sidebarBg: "#000000",
    },
  },
];

export const DEFAULT_COLOR_THEME: ColorThemeId = "mail";

export function getThemeById(id: string): ColorTheme {
  return (
    COLOR_THEMES.find((t) => t.id === id) ??
    COLOR_THEMES.find((t) => t.id === DEFAULT_COLOR_THEME)!
  );
}

const TOKENS: [keyof ThemeColors, string][] = [
  ["bgPrimary", "--color-bg-primary"],
  ["bgSecondary", "--color-bg-secondary"],
  ["bgTertiary", "--color-bg-tertiary"],
  ["bgHover", "--color-bg-hover"],
  ["bgSelected", "--color-bg-selected"],
  ["textPrimary", "--color-text-primary"],
  ["textSecondary", "--color-text-secondary"],
  ["textTertiary", "--color-text-tertiary"],
  ["borderPrimary", "--color-border-primary"],
  ["borderSecondary", "--color-border-secondary"],
  ["accent", "--color-accent"],
  ["accentHover", "--color-accent-hover"],
  ["accentLight", "--color-accent-light"],
  ["sidebarBg", "--color-sidebar-bg"],
  ["sidebarText", "--color-sidebar-text"],
  ["sidebarHover", "--color-sidebar-hover"],
  ["accent", "--color-sidebar-active"],
];

/**
 * Apply a theme to <html>, following the system light/dark setting when
 * `mode` is "system". Returns a cleanup function.
 */
export function applyColorTheme(themeId: string, mode: "light" | "dark" | "system"): () => void {
  const root = document.documentElement;
  const theme = getThemeById(themeId);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = () => {
    const isDark = mode === "dark" || (mode === "system" && mq.matches);
    const colors = isDark ? theme.dark : theme.light;
    for (const [key, prop] of TOKENS) root.style.setProperty(prop, colors[key]);
  };
  apply();
  if (mode !== "system") return () => {};
  mq.addEventListener("change", apply);
  return () => mq.removeEventListener("change", apply);
}
