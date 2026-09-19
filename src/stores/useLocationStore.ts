import { create } from "zustand";
import { devtools } from "zustand/middleware";

/** The browser's permission state plus the outcomes of our own request. */
export type LocationStatus =
  | PermissionState
  | "requesting"
  | "unavailable"
  | "error";

export type UserCoords = {
  /** Degrees, -90 (south) to 90 (north). */
  latitude: number;
  /** Degrees, positive east of the prime meridian. */
  longitude: number;
  /** Radius in meters around the position where the user probably is. */
  accuracy: number;
};

type LocationActions = {
  requestLocation: () => void;
  syncPermission: (permission: PermissionState) => void;
  reset: () => void;
};

type LocationState = {
  status: LocationStatus;
  coords: UserCoords | null;
  actions: LocationActions;
};

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false, // ? A city-level position is enough and skips the GPS warm-up
  timeout: 10_000,
  maximumAge: 60_000,
};

const STATUS_BY_ERROR_CODE = new Map<number, LocationStatus>([
  [GeolocationPositionError.PERMISSION_DENIED, "denied"],
  [GeolocationPositionError.POSITION_UNAVAILABLE, "unavailable"],
  [GeolocationPositionError.TIMEOUT, "error"],
]);

function getStatusAfterPermissionChange(
  permission: PermissionState,
  currentStatus: LocationStatus,
): LocationStatus {
  // ? Answering the prompt fires a permission change before the position arrives, which would re-enable the button too early
  if (currentStatus === "requesting") return currentStatus;

  return permission;
}

export const useLocationStore = create<LocationState>()(
  devtools(
    (set) => ({
      status: "prompt",
      coords: null,
      actions: {
        requestLocation: () => {
          const isSupported: boolean =
            window.isSecureContext && "geolocation" in navigator;

          if (!isSupported) {
            set({ status: "unavailable", coords: null });
            return;
          }

          set({ status: "requesting" });

          navigator.geolocation.getCurrentPosition(
            ({ coords: { latitude, longitude, accuracy } }) =>
              set({
                status: "granted",
                coords: { latitude, longitude, accuracy },
              }),
            ({ code }) =>
              set({ status: STATUS_BY_ERROR_CODE.get(code) ?? "error" }),
            GEOLOCATION_OPTIONS,
          );
        },
        syncPermission: (permission) =>
          set(({ status }) => ({
            status: getStatusAfterPermissionChange(permission, status),
          })),
        reset: () => set({ status: "prompt", coords: null }),
      },
    }),
    { name: "LocationStore" },
  ),
);

export const useLocationStatus = () =>
  useLocationStore((state) => state.status);

export const useUserCoords = () => useLocationStore((state) => state.coords);

export const useLocationActions = () =>
  useLocationStore((state) => state.actions);
