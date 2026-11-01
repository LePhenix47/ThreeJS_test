import { useEffect, useState } from "react";

/** Turns a File into a stable blob URL for its lifetime, revoking the previous one on change/unmount. */
export function useObjectUrl(file: File | null): string | null {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setObjectUrl(url);

    // ? One object URL per file — revoke the old one or it leaks for the page's lifetime
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return objectUrl;
}
