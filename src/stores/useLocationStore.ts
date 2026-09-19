import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type LocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
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
  if (permission === "denied") return "denied";

  // ? The permission was reset in the browser settings, so the "denied" message no longer applies
  if (currentStatus === "denied") return "idle";

  return currentStatus;
}

export const useLocationStore = create<LocationState>()(
  devtools(
    (set) => ({
      status: "idle",
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
        reset: () => set({ status: "idle", coords: null }),
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
