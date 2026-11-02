"use client";
import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

/** Chrome/Edge/Android fire this before showing their own install UI. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "gap-intel-install-dismissed";

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * One-tap "Install app" on Android/desktop Chrome, and Add-to-Home-Screen
 * instructions on iPhone/iPad (Apple does not let sites trigger installs).
 * Hidden once installed or dismissed.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (isStandalone()) return;

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* storage unavailable */
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setShowIos(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    const t = setTimeout(() => setShowIos(ios && !dismissed), 0);

    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setShowIos(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* storage unavailable */
    }
  };

  if (deferred) {
    return (
      <button
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-emerald-600 text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/40"
        title="Add 24/7 Intel to your home screen"
      >
        <Download className="w-3.5 h-3.5" /> Install app
      </button>
    );
  }

  if (showIos) {
    return (
      <div className="fixed bottom-3 left-3 right-3 z-50 sm:left-auto sm:w-[360px] rounded-lg border border-emerald-700 bg-[#0b1220] p-3 shadow-xl text-sm text-slate-200">
        <div className="flex items-start gap-2">
          <img src="/apple-icon.png" alt="" width={36} height={36} className="rounded-lg" />
          <div className="flex-1">
            <div className="font-semibold text-white">Put 24/7 Intel on your home screen</div>
            <div className="text-slate-400 text-xs mt-0.5">
              Tap <Share className="inline w-3.5 h-3.5 -mt-0.5" /> <b className="text-slate-200">Share</b>, then{" "}
              <b className="text-slate-200">Add to Home Screen</b>.
            </div>
          </div>
          <button onClick={dismiss} aria-label="Dismiss" className="text-slate-500 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }
  return null;
}
