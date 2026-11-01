import type { ChangeEvent, CSSProperties } from "react";

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
  const rootClassName = [
    "audio-player",
    isDraggingOver && "audio-player--dragging",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const uploadClassName = file
    ? "audio-player__upload audio-player__upload--compact"
    : "audio-player__upload";
  const progress = duration ? (currentTime / duration) * 100 : 0;
  // ? Drives &__scrubber::before's width — see AudioPlayer.scss
  const scrubberStyle = { "--_progress": `${progress}%` } as CSSProperties;

  return (
    <figure className={rootClassName} {...dropHandlers}>
      <label className={uploadClassName}>
        <input
          type="file"
          accept={acceptAttr}
          className="screen-readers-only"
          onChange={handleFileChange}
        />
        <svg
          className="audio-player__icon audio-player__upload-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 16V4m0 0 5 5m-5-5-5 5" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        <figcaption className="audio-player__filename" aria-live="polite">
          {file ? file.name : "Drop audio, or click to browse"}
        </figcaption>
      </label>

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

          <div className="audio-player__track" style={scrubberStyle}>
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
          </div>

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

      {fileError && (
        <p className="audio-player__error" role="alert">
          {fileError}
        </p>
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
