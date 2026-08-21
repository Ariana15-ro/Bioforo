import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { useSightingsStore } from "@/store/sightingsStore";

export function usePostDeepLink() {
  const openPost = useSightingsStore((s) => s.openPost);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const postId = searchParams.get("post");
    if (!postId) return;

    const timer = setTimeout(() => {
      openPost(postId);
    }, 0);

    return () => clearTimeout(timer);
  }, [searchParams, openPost]);
}
