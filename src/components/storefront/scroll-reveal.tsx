"use client";

import { Children, type ReactNode } from "react";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";

// Compatibility for older sections; all reveals now share the same policy.
export function ScrollReveal({
  children,
  className = "",
  stagger = false,
}: {
  children: ReactNode;
  className?: string;
  stagger?: boolean;
}) {
  return stagger ? (
    <RevealGroup className={className}>
      {Children.map(children, (child) => (
        <RevealItem>{child}</RevealItem>
      ))}
    </RevealGroup>
  ) : (
    <Reveal className={className}>{children}</Reveal>
  );
}

export function BrandTagline() {
  return (
    <Reveal as="h2" className="brand-tagline">
      Lo que nos mueve
      <br />
      es tu constancia.
    </Reveal>
  );
}
