import { useEffect } from "react";

import {
  useLocationActions,
  useLocationStatus,
  useUserCoords,
} from "@/stores/useLocationStore";

import "./LocationButton.scss";

const COORDINATE_DECIMALS = 2;

const STATUS_MESSAGES = new Map(
  Object.entries({
    denied:
      "Location is blocked for this site. Allow it in your browser's site settings, then reload.",
    unavailable:
      "Location isn't available. It needs HTTPS and a device that can report a position.",
    error: "Couldn't get your location in time. Try again.",
  }),
);

const BUTTON_LABELS = new Map(
  Object.entries({
    requesting: "Locating...",
    error: "Try again",
    granted: "Update location",
  }),
);

function LocationButton() {
  const status = useLocationStatus();
  const coords = useUserCoords();
  const { requestLocation, syncPermission } = useLocationActions();

  useEffect(() => {
    if (!("permissions" in navigator)) return;

    let permissionStatus: PermissionStatus | null = null;
    let isActive = true;

    const handleChange = () => {
      if (!permissionStatus) return;

      syncPermission(permissionStatus.state);
    };

    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        if (!isActive) return;

        permissionStatus = result;
        syncPermission(result.state);
        result.addEventListener("change", handleChange);
      })
      .catch(() => {
        // ? Some browsers reject the "geolocation" permission name, the click-time result is enough there
      });

    return () => {
      isActive = false;
      permissionStatus?.removeEventListener("change", handleChange);
    };
  }, [syncPermission]);

  const message = STATUS_MESSAGES.get(status);
  const buttonLabel = BUTTON_LABELS.get(status) ?? "Use my location";
  const isRequesting = status === "requesting";
  const isDenied = status === "denied";

  return (
    <div className="location-button">
      {!isDenied && (
        <button
          type="button"
          className="location-button__button"
          onClick={requestLocation}
          disabled={isRequesting}
        >
          {buttonLabel}
        </button>
      )}

      {coords && (
        <span className="location-button__coords">
          {coords.latitude.toFixed(COORDINATE_DECIMALS)}°,{" "}
          {coords.longitude.toFixed(COORDINATE_DECIMALS)}°
        </span>
      )}

      {message && (
        <p className="location-button__message" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

export default LocationButton;
