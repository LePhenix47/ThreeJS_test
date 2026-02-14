import { useTheme, useAppActions } from "@/stores/useAppStore";

function ThemeToggle() {
  const theme = useTheme();
  const { setTheme } = useAppActions();

  return (
    <div className="theme-toggle">
      <label htmlFor="theme-select">Theme:</label>
      <select
        id="theme-select"
        value={theme}
        onChange={(e) =>
          setTheme(e.target.value as "light" | "dark" | "system")
        }
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>

      <div className="theme-buttons">
        <button
          onClick={() => setTheme("light")}
          className={theme === "light" ? "active" : ""}
          aria-label="Light theme"
        >
          ☀️
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={theme === "dark" ? "active" : ""}
          aria-label="Dark theme"
        >
          🌙
        </button>
        <button
          onClick={() => setTheme("system")}
          className={theme === "system" ? "active" : ""}
          aria-label="System theme"
        >
          💻
        </button>
      </div>
    </div>
  );
}

export default ThemeToggle;
