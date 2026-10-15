"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

const INTRO_SEEN = "stylo.home-intro-seen.v1";

const IntroContext = createContext({
  waiting: false,
  setWaiting: (_waiting: boolean) => {},
  introSeen: false,
  claimIntro: (): boolean => true,
});

export function HomeIntroProvider({ children }: { children: ReactNode }) {
  const [waiting, setWaiting] = useState(false);
  const [introSeen, setIntroSeen] = useState(false);
  const seen = useRef<boolean | null>(null);
  const pathname = usePathname();
  const claimIntro = useCallback(() => {
    if (seen.current === true) return false;
    let stored = false;
    try {
      stored = window.sessionStorage.getItem(INTRO_SEEN) === "1";
    } catch {}
    seen.current = true;
    setIntroSeen(true);
    try {
      window.sessionStorage.setItem(INTRO_SEEN, "1");
    } catch {}
    return !stored;
  }, []);
  useEffect(() => {
    // Entering the store on an inner route should not introduce a delayed
    // splash screen when the shopper later uses the logo.
    if (pathname !== "/") claimIntro();
  }, [pathname, claimIntro]);
  const value = useMemo(
    () => ({ waiting, setWaiting, introSeen, claimIntro }),
    [waiting, introSeen, claimIntro],
  );
  return (
    <IntroContext.Provider value={value}>{children}</IntroContext.Provider>
  );
}

export function useHomeIntro() {
  return useContext(IntroContext);
}
