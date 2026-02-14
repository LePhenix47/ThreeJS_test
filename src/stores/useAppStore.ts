import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

type Theme = "light" | "dark" | "system";

type AppActions = {
  setTheme: (theme: Theme) => void;
};

type AppState = {
  theme: Theme;
  actions: AppActions;
};

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        theme: "system",
        actions: {
          setTheme: (theme) => set({ theme }),
        },
      }),
      {
        name: "app-store",
        partialize: ({ theme }) => ({ theme }),
      }
    ),
    { name: "AppStore" }
  )
);

export const useTheme = () => useAppStore((state) => state.theme);

export const useAppActions = () => useAppStore((state) => state.actions);
