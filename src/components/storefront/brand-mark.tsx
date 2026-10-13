import Image from "next/image";

export function BrandMark({ priority = false }: { priority?: boolean }) {
  return (
    <>
      <Image
        className="brand-isotype"
        src="/branding/logo-principal.webp"
        width={80}
        height={80}
        alt=""
        priority={priority}
      />
      <span className="brand-horizontal">
        <Image
          src="/branding/logo-horizontal.webp"
          width={640}
          height={640}
          sizes="(max-width: 800px) 160px, 200px"
          alt=""
          priority={priority}
        />
      </span>
    </>
  );
}
