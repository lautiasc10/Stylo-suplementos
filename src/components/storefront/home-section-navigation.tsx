"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const HOME_PATHS = new Set(["/", "/vista-previa/portada"]);

/** Resolve the destination after scroll scenes settle, without travelling through
 * their pinned runways. Native anchors remain usable without JavaScript. */
export function HomeSectionNavigation() {
  const pathname = usePathname();
  useEffect(() => {
    let dispose: (() => void) | undefined;
    function settle() {
      dispose?.();
      if (!HOME_PATHS.has(location.pathname) || location.hash !== "#atletas") return;
      let frame = 0, focused = false;
      const main = document.getElementById("contenido");
      window.dispatchEvent(new Event("stylo:home-anchor"));
      const adjust = () => {
        frame = 0;
        const target = document.getElementById("atletas");
        if (!target) return;
        target.scrollIntoView({ behavior: "instant", block: "start" });
        if (!focused) { target.focus({ preventScroll: true }); focused = true; }
      };
      const schedule = () => { if (!frame) frame = requestAnimationFrame(adjust); };
      const resize = new ResizeObserver(schedule);
      const mutation = new MutationObserver(schedule);
      if (main) {
        resize.observe(main);
        mutation.observe(main, { childList: true, subtree: true });
      }
      const cancel = () => dispose?.();
      const timer = setTimeout(cancel, 1500);
      dispose = () => {
        cancelAnimationFrame(frame);
        resize.disconnect();
        mutation.disconnect();
        clearTimeout(timer);
        for (const type of ["wheel", "touchstart", "pointerdown", "keydown"]) window.removeEventListener(type, cancel);
        dispose = undefined;
      };
      for (const type of ["wheel", "touchstart", "pointerdown", "keydown"]) window.addEventListener(type, cancel, { passive: true });
      schedule();
    }
    function click(event: MouseEvent) {
      if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || !HOME_PATHS.has(url.pathname) || url.hash !== "#atletas") return;
      event.preventDefault();
      history.pushState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
      settle();
    }
    document.addEventListener("click", click, true);
    window.addEventListener("hashchange", settle);
    settle();
    return () => {
      dispose?.();
      document.removeEventListener("click", click, true);
      window.removeEventListener("hashchange", settle);
    };
  }, [pathname]);
  return null;
}
