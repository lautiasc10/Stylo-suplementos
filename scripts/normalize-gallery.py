"""Non-destructive gallery processing (rembg + Pillow).

python scripts/normalize-gallery.py public-snapshot.json temporary-work-dir
Requires rembg[cpu] and Pillow in a separate Python environment, not the app.
Existing originals/Storage are never overwritten. No Supabase writes.
"""
import hashlib
import io
import json
import os
import sys
import urllib.request
from urllib.parse import urlparse
import re
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "2")
from PIL import Image, ImageChops
from rembg import new_session, remove

snapshot = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8-sig"))
origin = urlparse(snapshot["imageBase"])
if origin.scheme != "https" or not origin.path.endswith("/storage/v1/object/public/product-media"):
    raise ValueError("Use the public product-media bucket")
work = Path(sys.argv[2]).resolve()
originals = work / "originals"
originals.mkdir(parents=True, exist_ok=True)
destination = Path("public/media/products-normalized-v2")
destination.mkdir(parents=True, exist_ok=True)
session = new_session("u2netp", providers=["CPUExecutionProvider"])
records = []
registry = {}
seen = set()
for product in snapshot["catalog"]["products"]:
    for kind in ["images", "turnImages", "informationImages"]:
        for item in product.get(kind, []):
            source = item["path"]
            if not re.fullmatch(r"[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpe?g|webp)", source, re.I) or not re.fullmatch(r"[0-9a-f-]{36}", item["id"], re.I):
                raise ValueError("Invalid image identity or path")
            if source in seen:
                continue
            seen.add(source)
            record = {"id": item["id"], "product": product["name"], "label": item["alt"], "variantId": item.get("variantId"), "kind": kind, "sourcePath": source}
            try:
                original = originals / Path(source).name
                if not original.exists():
                    request = urllib.request.Request(snapshot["imageBase"] + "/" + source)
                    with urllib.request.urlopen(request, timeout=45) as response:
                        original.write_bytes(response.read())
                data = original.read_bytes()
                image = Image.open(io.BytesIO(data)).convert("RGBA")
                alpha = image.getchannel("A")
                has_alpha = alpha.getextrema()[0] < 250
                # Run segmentation on every photograph, retaining an existing
                # author-supplied alpha mask when available (avoids eroding labels).
                proposed = remove(image, session=session, post_process_mask=False)
                framed = False
                if has_alpha:
                    body = image
                    status = "existing-alpha-preserved"
                elif kind == "informationImages":
                    # Documents are not foreground objects: segmentation tends to
                    # remove the print. Keep every glyph; frame this explicit exception.
                    ink = ImageChops.difference(image.convert("RGB"), Image.new("RGB", image.size, "white")).convert("L")
                    text_mask = ink.point(lambda p: 255 if p > 80 else 0)
                    ink_total = sum(text_mask.histogram()[128:])
                    retained = ImageChops.multiply(text_mask, proposed.getchannel("A"))
                    retained_total = sum(retained.histogram()[128:])
                    keep = retained_total / max(1, ink_total)
                    record["printRetention"] = round(keep, 4)
                    framed = True
                    if keep >= .995 and proposed.getchannel("A").getextrema()[0] == 0:
                        body = proposed
                        status = "segmented-document-review"
                    else:
                        # Trim exterior whitespace only. A small paper inside a dark
                        # gold-bordered card is preferable to deleting nutrition text.
                        bounds = ink.point(lambda p: 255 if p > 25 else 0).getbbox()
                        if bounds:
                            x0, y0, x1, y1 = bounds
                            body = image.crop((max(0, x0-12), max(0, y0-12), min(image.width, x1+12), min(image.height, y1+12)))
                        else:
                            body = image
                        status = "framed-segmentation-failed"
                else:
                    body = proposed
                    status = "segmented-review"
                    if body.getchannel("A").getbbox() is None:
                        body = image
                        framed = True
                        status = "framed-segmentation-failed"
                bbox = body.getchannel("A").point(lambda p: 255 if p > 32 else 0).getbbox()
                if not bbox:
                    raise ValueError("No foreground detected")
                crop = body.crop(bbox)
                scale = min(800 / crop.height, 900 / crop.width)
                width, height = round(crop.width * scale), round(crop.height * scale)
                crop = crop.resize((width, height), Image.Resampling.LANCZOS)
                canvas = Image.new("RGBA", (1000, 1000), (0, 0, 0, 0))
                canvas.alpha_composite(crop, ((1000-width)//2, 900-height))
                stem = f'{item["id"]}-{hashlib.sha256(data).hexdigest()[:12]}-v2'
                outputs = {}
                for size in [320, 600, 1000]:
                    output = canvas.resize((size, size), Image.Resampling.LANCZOS)
                    quality = 88 if size == 1000 else 82
                    while True:
                        buffer = io.BytesIO()
                        output.save(buffer, "WEBP", quality=quality, method=6, exact=True)
                        result = buffer.getvalue()
                        if size != 600 or len(result) <= 60_000 or quality <= 55:
                            break
                        quality -= 5
                    filename = f'{stem}-{size}.webp'
                    target = destination / filename
                    if target.exists() and target.read_bytes() != result:
                        raise ValueError("Refusing to overwrite a different derivative: " + filename)
                    target.write_bytes(result)
                    outputs[str(size)] = {"filename": filename, "bytes": len(result), "quality": quality}
                record.update({"status": status, "framed": framed, "originalTransparent": has_alpha, "sourceHash": hashlib.sha256(data).hexdigest(), "bounds": list(bbox), "placement": {"width": width, "height": height, "baseline": 900}, "outputs": outputs})
                registry[source] = {"src": "/media/products-normalized-v2/" + outputs["1000"]["filename"], "framed": framed}
                print(json.dumps({"processed": len(records)+1, "status": status, "label": item["alt"]}, ensure_ascii=True), flush=True)
            except Exception as error:
                record.update({"status": "failed", "error": str(error), "framed": True})
            records.append(record)

report = {"version": 2, "model": "u2netp (segmentation only)", "canvas": [1000, 1000], "baseline": 900, "records": records, "exceptions": [r for r in records if "failed" in r["status"] or "review" in r["status"]]}
(destination / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
Path("src/modules/catalog/normalized-gallery.json").write_text(json.dumps(registry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"total": len(records), "exported": len(registry), "exceptions": len(report["exceptions"])}))
