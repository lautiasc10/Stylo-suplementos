"""Regression for a clean transparent pack: keep its white label intact.

python scripts/normalize-product-photos.test.py
"""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

from PIL import Image, ImageDraw

spec = importlib.util.spec_from_file_location(
    "photos", Path(__file__).with_name("normalize-product-photos.py"))
photos = importlib.util.module_from_spec(spec)
spec.loader.exec_module(photos)


class CleanPhotoTest(unittest.TestCase):
    def test_existing_alpha_preserves_complete_white_label_without_segmentation(self):
        image = Image.new("RGBA", (1000, 1000))
        ImageDraw.Draw(image).rectangle((300, 100, 699, 899), fill="white")
        # One almost-transparent speck in the provided image isn't a background.
        image.putpixel((0, 0), (0, 0, 0, 1))
        with patch.object(photos, "remove") as remove:
            canvas, result = photos.normalize(image, None, "existing-alpha")
            remove.assert_not_called()
        self.assertEqual(result["bounds"], [300, 100, 700, 900])
        self.assertEqual(canvas.getchannel("A").getbbox(), (300, 100, 700, 900))
        self.assertEqual(canvas.getpixel((300, 500)), (255, 255, 255, 255))
        self.assertEqual(canvas.getpixel((699, 500)), (255, 255, 255, 255))

    def test_rejects_an_opaque_background_in_existing_alpha_mode(self):
        with self.assertRaisesRegex(ValueError, "transparente"):
            photos.normalize(Image.new("RGBA", (1000, 1000), "white"), None, "existing-alpha")

    def test_default_still_removes_background_with_rembg(self):
        image = Image.new("RGBA", (1000, 1000), "white")
        mask = Image.new("L", image.size)
        ImageDraw.Draw(mask).rectangle((300, 100, 699, 899), fill=255)
        with patch.object(photos, "remove", return_value=mask) as remove:
            canvas, result = photos.normalize(image, None)
            remove.assert_called_once()
        self.assertEqual(result["bounds"], [300, 100, 700, 900])
        self.assertEqual(canvas.getchannel("A").getbbox(), (300, 100, 700, 900))


if __name__ == "__main__":
    unittest.main()
