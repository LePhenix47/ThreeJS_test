import { useState } from "react";
import type { DragEvent } from "react";

type UseFileDropOptions = {
  /** Called with whatever file was dropped. Validating it is the caller's job. */
  onDropFile: (file: File) => void;
};

type UseFileDropResult = {
  isDraggingOver: boolean;
  /** Spread directly onto the dropzone element: `<label {...dropHandlers}>`. */
  dropHandlers: {
    onDragOver: (event: DragEvent<HTMLElement>) => void;
    onDragLeave: (event: DragEvent<HTMLElement>) => void;
    onDrop: (event: DragEvent<HTMLElement>) => void;
  };
};

/** Drag-and-drop file handling for a single dropzone element, with flicker-safe drag-over state. */
export function useFileDrop({
  onDropFile,
}: UseFileDropOptions): UseFileDropResult {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  function handleDragOver(event: DragEvent<HTMLElement>): void {
    // ? Without this, Firefox shows a "no-drop" cursor and drop never fires
    event.preventDefault();
    setIsDraggingOver(true);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>): void {
    const nextTarget = event.relatedTarget as Node | null;

    // ? Moving over a child inside the dropzone re-fires dragLeave/dragEnter and flickers
    if (nextTarget && event.currentTarget.contains(nextTarget)) return;

    setIsDraggingOver(false);
  }

  function handleDrop(event: DragEvent<HTMLElement>): void {
    event.preventDefault();
    setIsDraggingOver(false);

    const [droppedFile] = event.dataTransfer.files;
    if (!droppedFile) return;

    onDropFile(droppedFile);
  }

  return {
    isDraggingOver,
    dropHandlers: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
