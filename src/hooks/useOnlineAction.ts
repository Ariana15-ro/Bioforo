import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import toast from "react-hot-toast";

export function useOnlineAction() {
  const offline = useOfflineStatus();

  const ensureOnline = (): boolean => {
    if (offline) {
      toast.error("Necesitas conexión para esta acción.");
      return false;
    }
    return true;
  };

  return { offline, ensureOnline };
}
