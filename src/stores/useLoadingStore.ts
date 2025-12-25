import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface LoadingState {
  isLoading: boolean;
  loadingProgress: number;
  actions: {
    setLoading: (isLoading: boolean) => void;
    setProgress: (progress: number) => void;
    reset: () => void;
  };
}

export const useLoadingStore = create<LoadingState>()(
  devtools(
    (set) => ({
      isLoading: false,
      loadingProgress: 0,
      actions: {
        setLoading: (isLoading) => set({ isLoading }),
        setProgress: (loadingProgress) => set({ loadingProgress }),
        reset: () => set({ isLoading: false, loadingProgress: 0 }),
      },
    }),
    {
      name: "loading-store",
    }
  )
);
