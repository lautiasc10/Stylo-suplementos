import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
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
    <Reveal as="header" className="home-section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id} className="reveal-heading">
          {title}
        </h2>
      </div>
      <Link href={href} className="text-link">
        {linkText} <Icon name="arrow" />
      </Link>
    </Reveal>
  );
}
