import { useCallback } from "react";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import toast from "react-hot-toast";

export function useOnlineAction() {
  const offline = useOfflineStatus();

  const ensureOnline = useCallback((): boolean => {
    if (offline) {
      toast.error("Necesitas conexión para esta acción.");
      return false;
    }
    return true;
  }, [offline]);

  return { offline, ensureOnline };
}
