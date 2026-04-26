"use client";

import Script from "next/script";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

type TurnstileRenderOptions = {
  sitekey: string;
  execution?: "render" | "execute";
  appearance?: "always" | "execute" | "interaction-only";
  callback?: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  execute: (target: string | HTMLElement) => void;
  reset: (target?: string | HTMLElement) => void;
  remove: (target?: string | HTMLElement) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileGateHandle = {
  getToken: () => Promise<string | null>;
  reset: () => void;
};

type TurnstileGateProps = {
  autoExecute?: boolean;
  inputName?: string;
  onError?: () => void;
};

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export const TurnstileGate = forwardRef<TurnstileGateHandle, TurnstileGateProps>(
  function TurnstileGate({ autoExecute = false, inputName = "turnstileToken", onError }, ref) {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const pendingResolveRef = useRef<((token: string | null) => void) | null>(null);
    const tokenRef = useRef<string>("");
    const [scriptReady, setScriptReady] = useState(false);
    const [tokenForInput, setTokenForInput] = useState<string>("");

    const handleToken = useCallback(
      (token: string) => {
        tokenRef.current = token;
        setTokenForInput(token);
        const resolver = pendingResolveRef.current;
        pendingResolveRef.current = null;
        resolver?.(token);
      },
      [],
    );

    const handleError = useCallback(() => {
      const resolver = pendingResolveRef.current;
      pendingResolveRef.current = null;
      resolver?.(null);
      onError?.();
    }, [onError]);

    useEffect(() => {
      if (
        !siteKey ||
        !scriptReady ||
        !containerRef.current ||
        !window.turnstile ||
        widgetIdRef.current
      ) {
        return;
      }

      const turnstile = window.turnstile;

      widgetIdRef.current = turnstile.render(containerRef.current, {
        sitekey: siteKey,
        execution: "execute",
        appearance: "interaction-only",
        callback: handleToken,
        "error-callback": handleError,
        "expired-callback": () => {
          tokenRef.current = "";
          setTokenForInput("");
          if (autoExecute && widgetIdRef.current) {
            turnstile.execute(widgetIdRef.current);
          }
        },
      });

      if (autoExecute && widgetIdRef.current) {
        turnstile.execute(widgetIdRef.current);
      }

      return () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
        pendingResolveRef.current = null;
      };
    }, [siteKey, scriptReady, autoExecute, handleToken, handleError]);

    useImperativeHandle(
      ref,
      () => ({
        getToken: () =>
          new Promise<string | null>((resolve) => {
            if (!siteKey) {
              resolve(null);
              return;
            }
            if (!window.turnstile || !widgetIdRef.current) {
              resolve(null);
              return;
            }

            if (tokenRef.current) {
              const cached = tokenRef.current;
              tokenRef.current = "";
              setTokenForInput("");
              window.turnstile.reset(widgetIdRef.current);
              resolve(cached);
              return;
            }

            pendingResolveRef.current = resolve;
            window.turnstile.execute(widgetIdRef.current);
          }),
        reset: () => {
          tokenRef.current = "";
          setTokenForInput("");
          if (window.turnstile && widgetIdRef.current) {
            window.turnstile.reset(widgetIdRef.current);
          }
        },
      }),
      [siteKey],
    );

    if (!siteKey) {
      return null;
    }

    return (
      <>
        <Script
          src={TURNSTILE_SCRIPT_SRC}
          strategy="afterInteractive"
          onLoad={() => setScriptReady(true)}
        />
        <div ref={containerRef} className="min-h-0" aria-hidden="true" />
        {autoExecute ? (
          <input type="hidden" name={inputName} value={tokenForInput} readOnly />
        ) : null}
      </>
    );
  },
);
