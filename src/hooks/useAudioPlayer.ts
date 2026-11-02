import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { useObjectUrl } from "./useObjectUrl";

const DEFAULT_ACCEPTED_MIME_TYPES: ReadonlySet<string> = new Set(["audio/*"]);

type UseAudioPlayerOptions = {
  /** Called whenever the <audio> element becomes available (mount, or a new file after unmount). */
  onAudioElementReady?: (audio: HTMLAudioElement) => void;
};

type UseAudioPlayerResult = {
  /** Attach to the <audio> element: `<audio ref={audioRef} src={objectUrl ?? undefined} />`. */
  audioRef: RefObject<HTMLAudioElement | null>;
  file: File | null;
  /** Set when `loadFile` rejects a file, cleared on the next accepted one. */
  fileError: string | null;
  /** The loaded file's blob URL, or null until one's loaded. Feed straight into the <audio> src. */
  objectUrl: string | null;
  /** Mirrors `acceptedMimeTypes` in `<input accept>` syntax, for `<input type="file" accept={acceptAttr}>`. */
  acceptAttr: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  /** Validates `candidate` against `acceptedMimeTypes` before loading it; sets `fileError` and bails otherwise. */
  loadFile: (candidate: File) => void;
  togglePlayback: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
};

/*
  ? Matches "audio/*"-style wildcards (same syntax as the native <input accept> attribute) against
  ? a file's exact MIME type, so one list drives both the picker hint and the real check.
*/
function isAcceptedMimeType(
  fileType: string,
  acceptedMimeTypes: ReadonlySet<string>,
): boolean {
  for (const accepted of acceptedMimeTypes) {
    const isWildcard = accepted.endsWith("/*");
    if (isWildcard && fileType.startsWith(accepted.slice(0, -1))) return true;
    if (!isWildcard && fileType === accepted) return true;
  }

  return false;
}

/**
 * Owns a single <audio> element end to end: accepting a File (MIME-gated against
 * `acceptedMimeTypes`), its blob URL, and native playback state/controls. Rendering the element
 * itself is still the caller's job, this hook never returns JSX.
 */
export function useAudioPlayer(
  acceptedMimeTypes: ReadonlySet<string> = DEFAULT_ACCEPTED_MIME_TYPES,
  { onAudioElementReady }: UseAudioPlayerOptions = {},
): UseAudioPlayerResult {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const objectUrl = useObjectUrl(file);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const audioElement: HTMLAudioElement | null = audioRef.current;
    if (!audioElement) return;

    onAudioElementReady?.(audioElement);
  }, [objectUrl, onAudioElementReady]);

  useEffect(() => {
    // ? New source: previous element's playback position/duration no longer apply
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const audio = audioRef.current;
    if (!audio) return;

    const abortController = new AbortController();
    const { signal } = abortController;

    audio.addEventListener("play", () => setIsPlaying(true), { signal });
    audio.addEventListener("pause", () => setIsPlaying(false), { signal });
    audio.addEventListener("ended", () => setIsPlaying(false), { signal });
    audio.addEventListener(
      "timeupdate",
      () => setCurrentTime(audio.currentTime),
      { signal },
    );
    audio.addEventListener(
      "loadedmetadata",
      () => setDuration(audio.duration),
      { signal },
    );

    return () => {
      abortController.abort();
    };
  }, [objectUrl]);

  useEffect(() => {
    if (!audioRef.current) return;

    /*
      ? iOS Safari ignores this entirely — HTMLMediaElement.volume is locked to 1 and only the
      ? hardware buttons control output there. Still correct everywhere else, so it stays.
    */
    audioRef.current.volume = volume;
  }, [volume]);

  function loadFile(candidate: File): void {
    /*
      ? The input's `accept` attribute (built from `acceptAttr`) only filters the OS file picker,
      ? and even that's advisory — most pickers let the user override it with "All Files". This
      ? check is the actual enforcement, covering both that path and drag-and-drop.
    */
    if (!isAcceptedMimeType(candidate.type, acceptedMimeTypes)) {
      setFileError(`"${candidate.name}" isn't a supported audio file.`);
      return;
    }

    setFileError(null);
    setFile(candidate);
  }

  function togglePlayback(): void {
    if (!audioRef.current) return;

    if (audioRef.current.paused) {
      // ? play() returns a Promise that rejects on a near-simultaneous pause() — unhandled
      // ? rejections log a console error in Chrome if this isn't caught
      audioRef.current.play().catch((error: unknown) => {
        console.error("Audio playback failed:", error);
      });
      return;
    }

    audioRef.current.pause();
  }

  function seek(time: number): void {
    setCurrentTime(time);

    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
  }

  const acceptAttr = [...acceptedMimeTypes].join(",");

  return {
    audioRef,
    file,
    fileError,
    objectUrl,
    acceptAttr,
    isPlaying,
    currentTime,
    duration,
    volume,
    loadFile,
    togglePlayback,
    seek,
    setVolume,
  };
}
