/**
 * Encodes a captured t=0 frame into the inline poster.
 * Usage: bun scripts/flight-poster.ts <flight-poster.png>
 */
import { $ } from "bun";
import { posterKey } from "../src/lib/flight/poster";

const STYLESHEET = new URL("../src/styles/flight-poster.css", import.meta.url);
const [png] = process.argv.slice(2);
if (!png)
  throw new Error(
    "Pass the PNG saved by flight.capturePoster(): bun scripts/flight-poster.ts <png>",
  );
const header = new DataView(await Bun.file(png).slice(0, 24).arrayBuffer());
const width = header.getUint32(16),
  height = header.getUint32(20);
if (width !== 1200 || height !== 874)
  throw new Error(
    `The poster must be the 1200x874 art-space frame, but ${png} is ${width}x${height}. The stylesheet was not modified.`,
  );
if (!Bun.which("avifenc"))
  throw new Error(
    "avifenc (libavif) is required to encode the poster. The stylesheet was not modified.",
  );
// Matches the shipped poster: 8-bit 4:2:0, full range, ICC carried from the PNG.
const avif = `${process.env.TMPDIR ?? "/tmp"}/flight-poster-${process.pid}.avif`;
await $`avifenc -d 8 -y 420 -r full -s 4 -q 60 ${png} ${avif}`.quiet();
const encoded = Buffer.from(await Bun.file(avif).arrayBuffer()).toString(
  "base64",
);
await Bun.file(avif).delete();
const css = await Bun.file(STYLESHEET).text();
const key = /poster-key: [0-9a-f]+/;
const image = /data:image\/avif;base64,[A-Za-z0-9+/=]+/;
if (!key.test(css) || !image.test(css))
  throw new Error(
    "flight-poster.css lost its poster-key line or AVIF data URL. Restore them from git; the stylesheet was not modified.",
  );
await Bun.write(
  STYLESHEET,
  css
    .replace(key, `poster-key: ${posterKey()}`)
    .replace(image, `data:image/avif;base64,${encoded}`),
);
console.log(
  `Poster updated: ${Math.round((encoded.length * 3) / 4 / 1024)} KB AVIF, key ${posterKey()}`,
);
