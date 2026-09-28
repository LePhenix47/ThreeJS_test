import { create } from "zustand";
import { devtools } from "zustand/middleware";

/** The browser's permission state plus the outcomes of our own request. */
export type WebcamStatus =
  | PermissionState
  | "requesting"
  | "unavailable"
  | "error";

type WebcamActions = {
  requestWebcam: () => Promise<void>;
  syncPermission: (permission: PermissionState) => void;
  /** Stops the camera and goes back to the initial state. */
  reset: () => void;
};

export type WebcamState = {
  status: WebcamStatus;
  /** Live camera stream, null until the user allows access. */
  stream: MediaStream | null;
  actions: WebcamActions;
};

const WEBCAM_CONSTRAINTS: MediaStreamConstraints = {
  video: true,
  audio: false, // ? Only the picture is used, this also avoids a microphone prompt
};

const STATUS_BY_ERROR_NAME = new Map<string, WebcamStatus>(
  Object.entries({
    NotAllowedError: "denied",
    NotFoundError: "unavailable",
    NotReadableError: "error",
  } as const),
);

function getStatusAfterPermissionChange(
  permission: PermissionState,
  currentStatus: WebcamStatus,
): WebcamStatus {
  // ? Answering the prompt fires a permission change before the stream arrives, which would re-enable the button too early
  if (currentStatus === "requesting") return currentStatus;

  return permission;
}

export const useWebcamStore = create<WebcamState>()(
  devtools(
    (set, get) => ({
      status: "prompt",
      stream: null,
      actions: {
        requestWebcam: async () => {
          const isSupported: boolean =
            window.isSecureContext && "mediaDevices" in navigator;

          if (!isSupported) {
            set({ status: "unavailable", stream: null });
            return;
          }

          set({ status: "requesting" });

          try {
            const stream =
              await navigator.mediaDevices.getUserMedia(WEBCAM_CONSTRAINTS);

            set({ status: "granted", stream });
          } catch (error) {
            const errorName: string =
              error instanceof DOMException ? error.name : "";

            set({
              status: STATUS_BY_ERROR_NAME.get(errorName) ?? "error",
              stream: null,
            });
          }
        },
        syncPermission: (permission) =>
          set(({ status }) => ({
            status: getStatusAfterPermissionChange(permission, status),
          })),
        reset: () => {
          const { stream } = get();

          for (const track of stream?.getTracks() ?? []) {
            track.stop();
          }

          set({ status: "prompt", stream: null });
        },
      },
    }),
    { name: "WebcamStore" },
  ),
);

export const useWebcamStatus = () => useWebcamStore((state) => state.status);

export const useWebcamStream = () => useWebcamStore((state) => state.stream);

export const useWebcamActions = () => useWebcamStore((state) => state.actions);
