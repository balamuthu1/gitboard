import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

export function useRepoWatcher(onChanged: () => void) {
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    listen("repo-changed", onChanged).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, [onChanged]);
}
