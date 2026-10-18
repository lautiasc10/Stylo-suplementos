"""Local rembg/Pillow companion to normalize-products.mjs; never writes originals.

Input: {"images": [{"id", "input", "sourcePath", "variantId", ...}]}
Usage: python scripts/normalize-product-photos.py manifest.json output-directory
Dependencies (offline processing only): rembg[cpu], Pillow, scipy.
"""

import argparse
import hashlib
import io
import json
import re
from importlib.metadata import version
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageOps
from scipy import ndimage
from rembg import new_session, remove

CANVAS, HEIGHT, BASELINE = 1000, 800, 900
SIZES = (320, 600, 1000)


def normalize(image, session, matte_mode="rembg"):
    image = ImageOps.exif_transpose(image).convert("RGBA")
    if matte_mode == "existing-alpha":
        # Explicit opt-in for a visually verified transparent original. Running
        # segmentation again can eat white labels or fine edges of a clean pack.
        alpha = image.getchannel("A")
        if alpha.getextrema()[0] != 0 or any(
            alpha.getpixel(point) >= 24 for point in
            ((0, 0), (image.width - 1, 0), (0, image.height - 1),
             (image.width - 1, image.height - 1))
        ):
            raise ValueError("El modo existing-alpha necesita un fondo transparente verificado.")
    elif matte_mode == "rembg":
        # RGBA sources can still contain an opaque shadow or halo. Composite on
        # white to separate the black cap before predicting the foreground mask.
        matte = Image.new("RGBA", image.size, "white")
        matte.alpha_composite(image)
        mask = remove(matte.convert("RGB"), session=session, only_mask=True)
        alpha = ImageChops.darker(image.getchannel("A"), mask.convert("L"))
    else:
        raise ValueError("matteMode debe ser rembg o existing-alpha.")
    # Discard very faint inference noise; retain the original edge transparency.
    alpha = alpha.point(lambda value: 0 if value < 24 else value)
    labels, count = ndimage.label(np.asarray(alpha) > 32)
    if not count:
        raise ValueError("No se detectó un envase: revisar manualmente.")
    areas = np.bincount(labels.ravel())
    areas[0] = 0
    body = labels == int(areas.argmax())
    # A small dilation keeps antialiased pixels of the main connected object.
    support = ndimage.binary_dilation(body, iterations=2)
    alpha = Image.fromarray(np.where(support, np.asarray(alpha), 0).astype("uint8"))
    image.putalpha(alpha)
    bounds = alpha.getbbox()
    crop = image.crop(bounds)
    width = round(crop.width * HEIGHT / crop.height)
    if width > 900:
        raise ValueError("El recorte es demasiado ancho: revisar antes de publicar.")
    body_image = crop.resize((width, HEIGHT), Image.Resampling.LANCZOS)
    # LANCZOS can introduce a faint extra pixel; the canvas itself fixes the base.
    canvas = Image.new("RGBA", (CANVAS, CANVAS))
    left = (CANVAS - width) // 2
    canvas.alpha_composite(body_image, (left, BASELINE - HEIGHT))
    warnings = []
    if min(bounds[:2]) == 0 or bounds[2] == image.width or bounds[3] == image.height:
        warnings.append("El envase toca un borde de origen; revisar el recorte.")
    if crop.height < HEIGHT:
        warnings.append("Original menor de 800 px: ampliar no recupera detalle.")
    return canvas, {
        "source": {"width": image.width, "height": image.height},
        "bounds": list(bounds),
        "placement": {"left": left, "top": 100, "width": width, "height": HEIGHT,
                      "baseline": BASELINE},
        "warnings": warnings,
    }


def write_new(path, data):
    if path.exists():
        if path.read_bytes() != data:
            raise ValueError(f"El destino existe con otros bytes: {path.name}")
    else:
        with path.open("xb") as output:
            output.write(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--input-root", type=Path,
                        help="Carpeta de trabajo para inputs relativos; por defecto, la del manifiesto.")
    parser.add_argument("--model", default="u2net")
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8-sig"))
    args.output.mkdir(parents=True, exist_ok=True)
    session = new_session(args.model, providers=["CPUExecutionProvider"])
    records = []
    for item in manifest["images"]:
        record = {key: item[key] for key in
                  ("id", "productId", "variantId", "sourcePath", "slug", "flavor", "sku", "notes", "sourceOverride")
                  if key in item}
        try:
            if not re.fullmatch(r"[a-zA-Z0-9_-]{1,100}", item["id"]):
                raise ValueError("ID no válido para un nombre de archivo.")
            source = ((args.input_root or args.manifest.parent) / item["input"]).resolve(strict=True)
            if args.output.resolve() == source.parent:
                raise ValueError("Separar la carpeta de salida de los originales.")
            original = source.read_bytes()
            digest = hashlib.sha256(original).hexdigest()
            matte_mode = item.get("matteMode", "rembg")
            canvas, details = normalize(Image.open(io.BytesIO(original)), session, matte_mode)
            details["warnings"].extend(item.get("warnings", []))
            record.update(details, sourceHash=digest, sourceBytes=len(original),
                          matteMode=matte_mode, outputs={})
            for size in SIZES:
                image = canvas if size == CANVAS else canvas.resize(
                    (size, size), Image.Resampling.LANCZOS)
                data = io.BytesIO()
                image.save(data, "WEBP", quality=90, method=6, exact=True)
                filename = f"{item['id']}-{digest[:12]}-v1-{size}.webp"
                write_new(args.output / filename, data.getvalue())
                record["outputs"][str(size)] = {"filename": filename, "bytes": data.tell()}
            record["status"] = "review" if record["warnings"] else "ready"
        except Exception as error:
            record.update(status="manual-review", warnings=[str(error)])
        records.append(record)
        print(json.dumps({"sku": record.get("sku"), "status": record["status"],
                          "warnings": record["warnings"]}, ensure_ascii=True), flush=True)
    report = {"version": 1, "pipeline": f"rembg/{args.model} + Pillow",
              "tools": {name: version(name) for name in ("rembg", "Pillow", "scipy")},
              "canvas": [CANVAS, CANVAS], "targetHeight": HEIGHT, "baseline": BASELINE,
              "records": records, "review": [r for r in records if r["status"] != "ready"]}
    (args.output / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if any(r["status"] == "manual-review" for r in records):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
