/**
 * Encodes a captured t=0 frame into the poster and its inline placeholder.
 * Usage: bun scripts/flight-poster.ts <flight-poster.png>
 */
import { $ } from "bun";
import { posterKey } from "../src/lib/flight/poster";

const POSTER = new URL("../src/assets/flight-poster.avif", import.meta.url);
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
    `The poster must be the 1200x874 art-space frame, but ${png} is ${width}x${height}. Nothing was modified.`,
  );
for (const [tool, pkg] of [
  ["avifenc", "libavif"],
  ["magick", "ImageMagick"],
] as const)
  if (!Bun.which(tool))
    throw new Error(
      `${tool} (${pkg}) is required to encode the poster. Nothing was modified.`,
    );
const css = await Bun.file(STYLESHEET).text();
const key = /poster-key: [0-9a-f]+/;
// The placeholder is the stylesheet's first image; the backdrops follow it.
const placeholder = /data:image\/webp;base64,[A-Za-z0-9+/=]+/;
if (!key.test(css) || !placeholder.test(css))
  throw new Error(
    "flight-poster.css lost its poster-key line or the placeholder's WebP data URL. Restore them from git; nothing was modified.",
  );
const temp = `${process.env.TMPDIR ?? "/tmp"}/flight-poster-${process.pid}`;
// Matches the shipped poster: 8-bit 4:2:0, full range, ICC carried from the PNG.
await $`avifenc -d 8 -y 420 -r full -s 4 -q 60 ${png} ${temp}.avif`.quiet();
// The poster at 96 px wide under a light blur: about 1 KB, smooth when stretched.
await $`magick ${png} -filter Box -resize 96x -gaussian-blur 0x1.6 -define webp:method=6 -quality 85 ${temp}.webp`.quiet();
const poster = await Bun.file(`${temp}.avif`).arrayBuffer();
const small = Buffer.from(
  await Bun.file(`${temp}.webp`).arrayBuffer(),
).toString("base64");
await Bun.file(`${temp}.avif`).delete();
await Bun.file(`${temp}.webp`).delete();
await Bun.write(POSTER, poster);
await Bun.write(
  STYLESHEET,
  css
    .replace(key, `poster-key: ${posterKey()}`)
    .replace(placeholder, `data:image/webp;base64,${small}`),
);
console.log(
  `Poster updated: ${Math.round(poster.byteLength / 1024)} KB AVIF, ${Math.round((small.length * 3) / 4)} B placeholder, key ${posterKey()}`,
);
