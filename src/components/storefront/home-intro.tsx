"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const IntroContext = createContext({
  waiting: false,
  setWaiting: (_waiting: boolean) => {},
});

export function HomeIntroProvider({ children }: { children: ReactNode }) {
  const [waiting, setWaiting] = useState(false);
  const value = useMemo(() => ({ waiting, setWaiting }), [waiting]);
  return (
    <IntroContext.Provider value={value}>{children}</IntroContext.Provider>
  );
}

export function useHomeIntro() {
  return useContext(IntroContext);
}
