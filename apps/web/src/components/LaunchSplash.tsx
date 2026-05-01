"use client";

import { useEffect, useState } from "react";

const INTRO_KEY = "moviepedia_intro_seen";
const INTRO_DURATION_MS = 2200;
let introStartedAt = 0;

export function LaunchSplash() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    const now = Date.now();
    const runtimeRemaining = introStartedAt > 0 ? Math.max(0, INTRO_DURATION_MS - (now - introStartedAt)) : 0;
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(INTRO_KEY) === "1";
    } catch {
      seen = false;
    }
    if (runtimeRemaining > 0) return true;
    if (seen) return false;
    introStartedAt = now;
    try {
      window.sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      // Ignore storage write failures.
    }
    return true;
  });

  useEffect(() => {
    if (!visible) return;
    const now = Date.now();
    const runtimeRemaining = introStartedAt > 0 ? Math.max(0, INTRO_DURATION_MS - (now - introStartedAt)) : INTRO_DURATION_MS;
    const timer = window.setTimeout(() => {
      setVisible(false);
    }, runtimeRemaining);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="launch-overlay" aria-hidden>
      <div className="launch-logo-wrap">
        <p className="launch-logo-text">MOVIEPEDIA</p>
        <div className="launch-logo-glow" />
      </div>
    </div>
  );
}
