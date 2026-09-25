import type { ReactNode } from "react";
import { useTheme, useAppActions } from "@/stores/useAppStore";

import "./ThemeToggle.scss";

type Theme = ReturnType<typeof useTheme>;

type ThemeOption = {
  value: Theme;
  label: string;
  icon: ReactNode;
};

// ? Stroke icons on a 24x24 grid (Lucide's sun, moon and monitor). Only the shapes live here, the shared <svg> wrapper is in the component
const THEME_OPTIONS = [
  {
    value: "light",
    label: "Light",
    icon: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </>
    ),
  },
  {
    value: "dark",
    label: "Dark",
    icon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
  },
  {
    value: "system",
    label: "System",
    icon: (
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </>
    ),
  },
] as const satisfies readonly ThemeOption[];

function ThemeToggle() {
  const theme = useTheme();
  const { setTheme } = useAppActions();

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Theme">
      {THEME_OPTIONS.map(({ value, label, icon }) => (
        <label key={value} className="theme-toggle__option" title={label}>
          <input
            className="theme-toggle__input"
            type="radio"
            name="theme"
            value={value}
            checked={theme === value}
            aria-label={label}
            onChange={() => setTheme(value)}
          />
          <svg
            className="theme-toggle__icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {icon}
          </svg>
        </label>
      ))}
    </div>
  );
}

export default ThemeToggle;
