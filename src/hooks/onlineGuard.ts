import toast from "react-hot-toast";

/**
 * Plain (non-hook) online check usable inside event handlers / async callbacks
 * without breaking the Rules of Hooks.
 *
 * Auth forms must not depend on the `useOnlineAction` hook (calling a hook
 * conditionally or inside a handler throws React error #321 "Invalid hook
 * call" in production). This helper gives the same user-facing guard using a
 * plain function and a one-shot `navigator.onLine` snapshot.
 */
export function checkOnline(): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    toast.error("Necesitas conexión para esta acción.");
    return false;
  }
  return true;
}
