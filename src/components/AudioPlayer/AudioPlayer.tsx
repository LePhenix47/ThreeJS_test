import type { ChangeEvent } from "react";

import { formatMediaTimeStamp } from "@/utils/formatting/format";
import { useFileDrop } from "@/hooks/useFileDrop";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";

import "./AudioPlayer.scss";

type AudioPlayerProps = {
  className?: string;
};

// ? <audio> plays an mp4/webm/mov's audio track fine, it just ignores any video track
const ACCEPTED_MIME_TYPES = new Set([
  "audio/*",
  "video/mp4",
  "video/webm",
  "video/quicktime", // ? .mov
  "video/x-m4v",
]);

function AudioPlayer({ className = "" }: AudioPlayerProps) {
  // 4. Custom hooks
  const {
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
  } = useAudioPlayer(ACCEPTED_MIME_TYPES);
  const { isDraggingOver, dropHandlers } = useFileDrop({
    onDropFile: loadFile,
  });

  // 6. Event handlers
  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const { files } = event.target;
    const [selectedFile] = files ?? [];

    // ? Reset so picking the exact same file again still fires this change event
    event.target.value = "";

    if (!selectedFile) return;

    loadFile(selectedFile);
  }

  function handleScrub(event: ChangeEvent<HTMLInputElement>): void {
    seek(Number(event.target.value));
  }

  function handleVolumeChange(event: ChangeEvent<HTMLInputElement>): void {
    setVolume(Number(event.target.value));
  }

  // 7. Render
  const dropzoneClassName = isDraggingOver
    ? "audio-player__dropzone audio-player__dropzone--dragging"
    : "audio-player__dropzone";

  return (
    <figure className={`audio-player ${className}`}>
      <label className={dropzoneClassName} {...dropHandlers}>
        <input
          type="file"
          accept={acceptAttr}
          className="screen-readers-only"
          onChange={handleFileChange}
        />
        <span className="audio-player__dropzone-hint">
          {file
            ? "Drop a new file to replace it"
            : "Drag & drop an audio file, or click to browse"}
        </span>
      </label>

      {fileError && (
        <p className="audio-player__error" role="alert">
          {fileError}
        </p>
      )}

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
            {formatMediaTimeStamp(currentTime)}
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
            {formatMediaTimeStamp(duration)}
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
        />
      )}
    </figure>
  );
}

export default AudioPlayer;
