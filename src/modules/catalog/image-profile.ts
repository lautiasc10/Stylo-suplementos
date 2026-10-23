export type ImagePurpose = "product" | "information" | "brand";
export type ImageUploadResult = {
  path?: string;
  error?: string;
  notice?: string;
};

const uuid = "[0-9a-f-]{36}";
const processed = new RegExp(
  `^(${uuid})/(${uuid})-(normalized|information)-v1-(jpg|png|webp)(-1000)?\\.webp$`,
);

export function imageProfile(path: string) {
  const match = processed.exec(path);
  if (!match || (match[3] === "normalized") !== !!match[5]) return null;
  return {
    kind: match[3] as "normalized" | "information",
    originalPath: `${match[1]}/${match[2]}.${match[4]}`,
    file: (size: number) => path.replace(/-1000\.webp$/, `-${size}.webp`),
  };
}

export function validImagePath(path: string) {
  return (
    new RegExp(`^${uuid}/${uuid}\\.(jpg|jpeg|png|webp)$`).test(path) ||
    !!imageProfile(path)
  );
}
