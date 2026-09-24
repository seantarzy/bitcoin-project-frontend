"use client";
import { useEffect, useRef } from "react";
import {
  track,
  type EventName,
  type EventParameters,
} from "@/services/analytics";
// A view means at least 35% was visible for one second, once per mounted item.
export function useTrackView<T extends HTMLElement>(
  event: EventName,
  parameters: EventParameters = {},
  identity = event as string,
) {
  const ref = useRef<T>(null);
  const seen = useRef(new Set<string>());
  const serialized = JSON.stringify(parameters);
  useEffect(() => {
    const element = ref.current;
    if (!element || seen.current.has(identity)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let visible = false;
    const update = () => {
      clearTimeout(timer);
      if (
        visible &&
        document.visibilityState === "visible" &&
        !seen.current.has(identity)
      ) {
        timer = setTimeout(() => {
          seen.current.add(identity);
          track(event, JSON.parse(serialized));
        }, 1000);
      }
    };
    const threshold = Math.min(
      0.35,
      (window.innerHeight * 0.35) /
        Math.max(element.getBoundingClientRect().height, 1),
    );
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= threshold;
        update();
      },
      { threshold: [threshold] },
    );
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [event, serialized, identity]);
  return ref;
}
