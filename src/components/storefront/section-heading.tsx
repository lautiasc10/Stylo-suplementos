import Link from "next/link";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/icon";

/** Shared by present and future home collections: one reveal per heading. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  href = "/catalogo",
  linkText = "Explorar tienda",
}: {
  id: string;
  eyebrow: string;
  title: string;
  href?: string;
  linkText?: string;
}) {
  return (
    <RevealGroup as="header" className="home-section-heading">
      <RevealItem>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id} className="reveal-heading">
          {title}
        </h2>
      </RevealItem>
      <RevealItem className="home-section-heading-action">
        <Link href={href} className="text-link">
          {linkText} <Icon name="arrow" />
        </Link>
      </RevealItem>
    </RevealGroup>
  );
}
