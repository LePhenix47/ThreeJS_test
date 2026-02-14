import { create } from "zustand";
import { devtools } from "zustand/middleware";

type LoadingActions = {
  setLoading: (isLoading: boolean) => void;
  setProgress: (progress: number) => void;
  reset: () => void;
};

type LoadingState = {
  isLoading: boolean;
  loadingProgress: number;
  actions: LoadingActions;
};

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
    { name: "LoadingStore" }
  )
);

export const useIsLoading = () =>
  useLoadingStore((state) => state.isLoading);

export const useLoadingProgress = () =>
  useLoadingStore((state) => state.loadingProgress);

export const useLoadingActions = () =>
  useLoadingStore((state) => state.actions);
