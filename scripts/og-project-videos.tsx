/**
 * Renders public/og-video/<project>.mp4 for every project whose card shows a
 * clip: the card (src/lib/project-card.tsx), with the clip playing where its
 * still sits. A link to that project previews with it where previews play
 * video.
 * Usage: bun run og:projects
 * Needs ffmpeg on the PATH.
 */
import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { Share } from "../src/components/work/share";
import { projects } from "../src/content/projects";
import { ProjectCard } from "../src/lib/project-card";
import { ProjectVideos } from "../src/lib/project-videos";

const ROOT = new URL("../", import.meta.url).pathname;
/** Encodes at a time: each one already spreads over several cores. */
const AT_ONCE = 4;

const ffmpeg = Bun.which("ffmpeg");
if (ffmpeg === null)
  throw new Error(
    "ffmpeg is not on the PATH, and it encodes the videos. Install it and run this again. Nothing was modified.",
  );

const work = await mkdtemp(join(tmpdir(), "og-project-videos-"));
const rendered = new Map<string, string>();

/** One project's card, with its clip laid over the still and cut to the frame's corners. */
const render = async (project: (typeof projects)[number]) => {
  const clip = Share.clip(project);
  const frame = ProjectCard.frame(project);
  if (clip === null || frame === null) return;
  const name = `${Share.slug(project.title)}.mp4`;
  const card = join(work, `${name}.card.png`);
  const corners = join(work, `${name}.corners.png`);
  const video = join(work, name);
  await Bun.write(card, await (await ProjectCard.draw(project)).arrayBuffer());
  await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.width}" height="${frame.height}"><rect width="100%" height="100%" rx="${frame.radius}" fill="#fff"/></svg>`,
    ),
  )
    .flatten({ background: "#000" })
    .png()
    .toFile(corners);
  const filter = [
    `[1:v]scale=${frame.width}:${frame.height}:flags=lanczos,format=rgba[clip]`,
    `[2:v]format=gray[corners]`,
    `[clip][corners]alphamerge[shown]`,
    // Laid over in RGB: in the encoder's own format the clip would snap to
    // even pixels, a pixel off the frame.
    `[0:v][shown]overlay=${frame.left}:${frame.top}:shortest=1:format=rgb,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[out]`,
  ].join(";");
  const run = Bun.spawn(
    [
      ffmpeg,
      ...["-v", "error", "-loop", "1", "-framerate", "30", "-i", card],
      ...["-i", join(ROOT, "public", clip.src), "-i", corners],
      ...["-filter_complex", filter, "-map", "[out]", "-r", "30"],
      // Level 4.0 keeps it within what a phone's decoder takes.
      ...["-c:v", "libx264", "-profile:v", "high", "-level:v", "4.0"],
      ...["-preset", "veryslow", "-crf", "24"],
      // One key frame: the card around the clip never changes, so every
      // later frame carries it on from the first.
      ...["-x264-params", "keyint=infinite"],
      ...["-colorspace", "bt709", "-color_primaries", "bt709"],
      ...["-color_trc", "bt709"],
      // The index first, so a preview can start playing before the file ends.
      ...["-movflags", "+faststart", "-an", video],
    ],
    { stdout: "inherit", stderr: "inherit" },
  );
  if ((await run.exited) !== 0)
    throw new Error(
      `ffmpeg could not render ${project.title}'s video (exit ${run.exitCode}); its own message is above. Nothing was modified.`,
    );
  rendered.set(name, video);
};

try {
  const waiting = projects.filter((project) => Share.clip(project) !== null);
  await Promise.all(
    Array.from({ length: AT_ONCE }, async () => {
      for (;;) {
        const project = waiting.shift();
        if (project === undefined) return;
        await render(project);
      }
    }),
  );

  const directory = join(ROOT, ProjectVideos.DIR);
  await mkdir(directory, { recursive: true });
  for (const name of await readdir(directory))
    if (!rendered.has(name)) await rm(join(directory, name));
  let bytes = 0;
  for (const [name, video] of rendered) {
    bytes += await Bun.write(join(directory, name), Bun.file(video));
  }
  await Bun.write(
    join(ROOT, ProjectVideos.STAMP),
    `${await ProjectVideos.current(ROOT)}\n`,
  );
  console.log(
    `Rendered ${rendered.size} videos into ${ProjectVideos.DIR}, ${(bytes / 1024 / 1024).toFixed(1)} MB in all.`,
  );
} finally {
  await rm(work, { recursive: true, force: true });
}
