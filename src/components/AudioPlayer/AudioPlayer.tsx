import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";

import "./AudioPlayer.scss";

type AudioPlayerProps = {
  className?: string;
};

// ? NaN before metadata loads, Infinity for some streamed sources — both would render as "NaN:NaN"
function formatPlaybackTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds)) return "0:00";

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function AudioPlayer({ className = "" }: AudioPlayerProps) {
  // 1. State
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // 2. Refs
  const audioRef = useRef<HTMLAudioElement>(null);

  // 5. Effects
  useEffect(() => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    setObjectUrl(url);

    // ? One object URL per file — revoke the old one or it leaks for the page's lifetime
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    if (!audioRef.current) return;

    /*
      ? iOS Safari ignores this entirely — HTMLMediaElement.volume is locked to 1 and only the
      ? hardware buttons control output there. Still correct everywhere else, so it stays.
    */
    audioRef.current.volume = volume;
  }, [volume]);

  // 6. Event handlers
  function loadFile(nextFile: File): void {
    setFile(nextFile);
    setIsPlaying(false);
    setCurrentTime(0);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const { files } = event.target;
    const [selectedFile] = files ?? [];

    // ? Reset so picking the exact same file again still fires this change event
    event.target.value = "";

    if (!selectedFile) return;

    loadFile(selectedFile);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>): void {
    // ? Without this, Firefox shows a "no-drop" cursor and drop never fires
    event.preventDefault();
    setIsDraggingOver(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>): void {
    const nextTarget = event.relatedTarget as Node | null;

    // ? Moving over the hint text inside the dropzone re-fires dragLeave/dragEnter and flickers
    if (nextTarget && event.currentTarget.contains(nextTarget)) return;

    setIsDraggingOver(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>): void {
    event.preventDefault();
    setIsDraggingOver(false);

    const [droppedFile] = event.dataTransfer.files;
    if (!droppedFile?.type.startsWith("audio/")) return;

    loadFile(droppedFile);
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

  function handleScrub(event: ChangeEvent<HTMLInputElement>): void {
    const value = Number(event.target.value);
    setCurrentTime(value);

    if (!audioRef.current) return;
    audioRef.current.currentTime = value;
  }

  function handleVolumeChange(event: ChangeEvent<HTMLInputElement>): void {
    const volume = Number(event.target.value);
    setVolume(volume);
  }

  // 7. Render
  const dropzoneClassName = isDraggingOver
    ? "audio-player__dropzone audio-player__dropzone--dragging"
    : "audio-player__dropzone";

  return (
    <figure className={`audio-player ${className}`}>
      <label
        className={dropzoneClassName}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="audio/*"
          className="screen-readers-only"
          onChange={handleFileChange}
        />
        <span className="audio-player__dropzone-hint">
          {file
            ? "Drop a new file to replace it"
            : "Drag & drop an audio file, or click to browse"}
        </span>
      </label>

      <figcaption className="audio-player__filename" aria-live="polite">
        {file ? file.name : "No audio loaded"}
      </figcaption>

      {file && (
        <div className="audio-player__controls">
          <button
            type="button"
            className="audio-player__toggle square stack"
            onClick={togglePlayback}
            aria-pressed={isPlaying}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            <svg
              className="audio-player__icon audio-player__icon--play"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            <svg
              className="audio-player__icon audio-player__icon--pause"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
            </svg>
          </button>

          <span className="audio-player__time">
            {formatPlaybackTime(currentTime)}
          </span>

          <input
            type="range"
            className="audio-player__scrubber"
            min={0}
            max={duration || 0}
            step={0.01}
            value={currentTime}
            onChange={handleScrub}
            aria-label="Seek"
          />

          <span className="audio-player__time">
            {formatPlaybackTime(duration)}
          </span>

          <label className="audio-player__volume">
            <svg
              className="audio-player__icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M3 10v4h4l5 5V5L7 10H3z" />
              <path d="M16 8.5a4.5 4.5 0 0 1 0 7" />
            </svg>
            <span className="screen-readers-only">Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={handleVolumeChange}
            />
          </label>
        </div>
      )}

      {objectUrl && (
        <audio
          ref={audioRef}
          src={objectUrl}
          preload="metadata"
          className="hide"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onLoadedMetadata={(event) =>
            setDuration(event.currentTarget.duration)
          }
          onTimeUpdate={(event) =>
            setCurrentTime(event.currentTarget.currentTime)
          }
        />
      )}
    </figure>
  );
}

export default AudioPlayer;
