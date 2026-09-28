import { useEffect } from "react";

import {
  useWebcamActions,
  useWebcamStatus,
  useWebcamStream,
} from "@/stores/useWebcamStore";

import "./WebcamButton.scss";

const STATUS_MESSAGES = new Map(
  Object.entries({
    denied:
      "Camera is blocked for this site. Allow it in your browser's site settings, then reload.",
    unavailable:
      "Camera isn't available. It needs HTTPS and a device with a camera.",
    error: "Couldn't start your camera, another app may be using it. Try again.",
  }),
);

const BUTTON_LABELS = new Map(
  Object.entries({
    requesting: "Waiting for camera...",
    error: "Try again",
  }),
);

function WebcamButton() {
  const status = useWebcamStatus();
  const stream = useWebcamStream();
  const { requestWebcam, syncPermission } = useWebcamActions();

  useEffect(() => {
    if (!("permissions" in navigator)) return;

    let permissionStatus: PermissionStatus | null = null;
    let isActive = true;

    const handleChange = () => {
      if (!permissionStatus) return;

      syncPermission(permissionStatus.state);
    };

    const trackPermission = async () => {
      try {
        const result = await navigator.permissions.query({
          name: "camera" as PermissionName,
        });
        if (!isActive) return;

        permissionStatus = result;
        syncPermission(result.state);
        result.addEventListener("change", handleChange);
      } catch {
        // ? Some browsers reject the "camera" permission name, the click-time result is enough there
      }
    };

    trackPermission();

    return () => {
      isActive = false;
      permissionStatus?.removeEventListener("change", handleChange);
    };
  }, [syncPermission]);

  const message = STATUS_MESSAGES.get(status);
  const hasStream: boolean = stream !== null;
  const defaultLabel = hasStream ? "Webcam on" : "Use my webcam";
  const buttonLabel = BUTTON_LABELS.get(status) ?? defaultLabel;
  const isRequesting = status === "requesting";
  const isDenied = status === "denied";

  return (
    <div className="webcam-button">
      {!isDenied && (
        <button
          type="button"
          className="webcam-button__button"
          onClick={requestWebcam}
          disabled={isRequesting || hasStream}
        >
          {buttonLabel}
        </button>
      )}

      {message && (
        <p className="webcam-button__message" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

export default WebcamButton;
