# augie.gg

My personal website.

## Tech Stack

- [Next.js 16](https://nextjs.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Radix UI](https://www.radix-ui.com) primitives
- [MDX](https://mdxjs.com)
- [sugar-high](https://github.com/huozhi/sugar-high)
- [Phosphor Icons](https://phosphoricons.com)
- Inter and Geist Mono, self-hosted with their OFL licenses

## Projects

The home page is generated from [`src/content/projects.ts`](src/content/projects.ts),
the only file to edit.

To add a project, insert an entry in date order (newest first):

```ts
{
  title: "my-project",
  href: "https://github.com/AugusDogus/my-project", // omit for private repos
  date: "2026-10-11", // first authored commit
  blurb: "One sentence. Inline [links](https://example.com) work.",
  labels: ["wip"], // wip | active | archived | oss | pending
  private: true, // shows a private repository note
  fork: true, // name upstream in the blurb
},
```

Everything lands in the expandable Everything else section, grouped by year, unless you mark it:

- `featured: n` moves it into **Selected work** at position `n` (1 is first).
  Add a `highlight`: one line of concrete, verifiable evidence such as the
  stack, a hard problem, or real usage. Don't invent numbers.
- `notable: n` names a merged upstream contribution at position `n` of the OSS
  line under Selected work. Set `contributionName` for its short display label
  and link `href` directly to the merged PR. It also stays in Everything else.

## Development

```bash
bun install
bun dev
```

No environment variables are required. To show the GitHub activity graph, set
`GITHUB_TOKEN` to a classic personal access token with no scopes (see
`.env.example`); without it the panel is hidden and the rest of the page is
unchanged.

```bash
bun run check
bun test
bun run format:check
bun run build
```

## Design and artwork

The interface is dark glass (`.material` in `src/styles/globals.css`) over a
scrim that leaves the painting clear on the right. Inter's display cut sets the
name; Geist Mono only draws keyboard hints.

- ⌘K (or Ctrl K, or /) opens a command menu over actions, selected work, open
  source contributions, and every other project.
- Every project opens in one project view (`ProjectView` in
  `src/components/work/project-view.tsx`): its captures on top, then status,
  title, start date, blurb, evidence, and a link out. Rows, the command menu,
  the archive, and `?p=<title>` links all open it.
- On wide screens with a mouse the view lives on a stage beside the list,
  over the painting. Hovering or focusing a row previews the project there;
  clicking it or pressing Enter pins it, which selects the row, adds previous,
  next, and close buttons, writes `?p=`, and lets ← → step and Esc close.
  While a project is pinned, hovering other rows leaves the stage alone. The
  pointer can cross from a row onto the stage, even diagonally over other
  rows, without losing the preview.
- On phones, tablets, and narrow windows rows carry a thumbnail instead, and
  the same view opens in a draggable bottom sheet.
- Captures share one frame whether they are images or videos, with a phone
  capture set in front of the lead screen as picture-in-picture. Videos play
  only while on screen, and show their poster with reduced motion or
  Save-Data.
- The activity panel prints the last year of GitHub contributions with streaks
  and the busiest day, readable by hover, touch, or arrow keys.
- The dock pauses the painting (or press P), credits it, and shows the time in
  Pensacola.

The résumé remains in `src/app/resume/page.mdx` on the same glass. Print styles
keep it in a single black-on-white column on one US Letter page.

The background uses Kazu Kibuishi's _Flight_ artwork, linked to its
[Gallery Nucleus listing](https://www.gallerynucleus.com/detail/2126/).
The artwork belongs to its artist, not this repository's code license.
Fonts and their licenses live in `src/assets/fonts`.

`src/styles/flight-poster.css` embeds the initial filtered frame (AVIF) and a
small backdrop (WebP) in the render-blocking stylesheet. This makes the first
paint complete without waiting for image requests or animation JavaScript.
The live canvas replaces it only after its first draw; its sizing, shading,
and masks match the poster.

`src/lib/flight` prints everything onto the painting's two-pixel dither:

- Three air currents: twisted ribbons of bead fibers, after React Bits'
  [Ghost Fibers](https://reactbits.dev/backgrounds/ghost-fibers), drawn as GPU
  points into one texel per dither cell. Fibers bunch into bright folds where a
  ribbon turns edge-on. Their ink lightens dark paint and sinks into bright
  sky, and layered masks let them pass behind clouds and the bird's wing.
- A whale pod (a mother and calf, a pale drift whale, and a distant traveller)
  rigged on spines that follow the currents. Tail strokes send a wave down each
  body; whales glide once the current carries them, part its fibers, and leave
  folds in their wake. The drift whale is cued so a whale is always swimming.
- The painting's own whales and bird flocks move: their pixels are re-printed
  from the continuous paint at a displaced position onto the same fixed dither
  cells, so flukes beat without the dots swimming.
- The cursor is an instrument. Sweeping across a current plucks it, resting on
  one parts it, whales turn toward a slow cursor and startle at a fast one,
  painted whales stroke harder nearby, and dragging in open sky draws a ribbon
  that drifts off as a gust. Taps work on touch without blocking scrolling.
- Wind displacement, cursor combing, and drifting specks.

The animation runs at up to 60 fps and stops on the résumé, when the tab is
hidden, when paused, or when reduced motion is requested. Without WebGL, or
while a lost GPU context recovers, a 2D path draws the print, flat whale
silhouettes, and specks. Loading or canvas failure preserves the pre-rendered
background. React cleanup releases listeners, observers, frame callbacks, and
GPU resources. Tests cover routes and their clearance around the UI, whale
kinematics, moods and rigging, painted-subject mattes, input gestures, pod
timing and coverage, frame pacing, and poster freshness. In development,
`flight.captureScript(events, shots)` replays scripted pointer events on the
fixed clock and returns frames, for judging interactions frame by frame.

### Poster

`bun test` fails when the model, shader, or speck inputs of the t=0 frame
change, because the inline poster would no longer match the first live frame.
Changes to the print bake in `texture.ts` or to the speck painter need the same
recapture, by hand:

1. Run `bun dev`, open `/`, and run `await flight.capturePoster()` in the
   browser console. It downloads `flight-poster.png`, the 1200×874 frame before
   viewport scaling and feathering.
2. Run `bun scripts/flight-poster.ts ~/Downloads/flight-poster.png`. It needs
   `avifenc` (libavif) and rewrites the AVIF and `poster-key` in
   `flight-poster.css`.
