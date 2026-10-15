"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function HomeLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  const router = useRouter();
  return (
    <Link
      href="/#inicio"
      className="brand-link"
      aria-label="STYLO Suplementos, inicio"
      onClick={(event) => {
        onClick?.();
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          window.location.pathname !== "/"
        )
          return;
        // A native #categorias link may have changed the browser hash while
        // the router still holds #inicio. Explicitly handle this same-page
        // action rather than allowing that cached route to swallow the jump.
        event.preventDefault();
        if (window.location.hash !== "#inicio" || window.location.search)
          window.history.pushState(window.history.state, "", "/#inicio");
        // Also cancel an inner-route navigation that may still be loading.
        // Otherwise it could commit after this same-page jump and take over.
        router.replace("/#inicio", { scroll: false });
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        document
          .querySelector<HTMLAnchorElement>(".site-header .brand-link")
          ?.focus({ preventScroll: true });
      }}
    >
      {children}
    </Link>
  );
}
