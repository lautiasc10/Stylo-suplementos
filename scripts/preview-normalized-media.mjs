import { readFile } from "node:fs/promises";
import sharp from "sharp";
const work = process.argv[2];
const report = JSON.parse(
  await readFile(`${work}/normalized/report.json`, "utf8"),
);
const layers = [];
for (const [i, r] of report.records.entries()) {
  const x = (i % 6) * 200,
    y = Math.floor(i / 6) * 220;
  layers.push({
    input: await sharp(`${work}/normalized/${r.outputs[600].filename}`)
      .resize(200, 200)
      .png()
      .toBuffer(),
    left: x,
    top: y,
  });
  layers.push({
    input: Buffer.from(
      `<svg width="200" height="220"><path d="M0 180H200" stroke="#b69a53"/><text x="10" y="215" font-size="14" fill="white">${r.sku}</text></svg>`,
    ),
    left: x,
    top: y,
  });
}
await sharp({
  create: {
    width: 1200,
    height: Math.ceil(report.records.length / 6) * 220,
    channels: 4,
    background: "#282522",
  },
})
  .composite(layers)
  .png()
  .toFile(`${work}/normalized-contact.png`);
