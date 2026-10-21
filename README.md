# augie.gg

My personal website.

## Tech Stack

- [Next.js 16](https://nextjs.org)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [MDX](https://mdxjs.com)
- [sugar-high](https://github.com/huozhi/sugar-high)
- [Phosphor Icons](https://phosphoricons.com)
- Newsreader and Instrument Sans, self-hosted with their OFL licenses

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

No environment variables or GitHub token are required.

```bash
bun run check
bun test
bun run format:check
bun run build
```

## Design and artwork

The home page uses customized shadcn/ui buttons, cards, accordions, and
collapsibles with Tailwind layout utilities and a shared textured surface.
The résumé remains in `src/app/resume/page.mdx`. Print styles keep the full
résumé in a single column on one US Letter page using the browser print button.

The background uses Kazu Kibuishi's _Flight_ artwork, linked to its
[Gallery Nucleus listing](https://www.gallerynucleus.com/detail/2126/).
The artwork belongs to its artist, not this repository's code license.
Fonts and their licenses live in `src/assets/fonts`.

`src/lib/flight` contains the two-pixel dither, GPU filter displacement,
particle whales, and sparse cursor trails. The animation stops on the résumé,
when the tab is hidden, when paused, or when reduced motion is requested.
WebGL failure falls back to the 2D artwork; loading or canvas failure preserves
the CSS image. React cleanup releases listeners, observers, frame callbacks,
and GPU resources. Physics tests cover tail strokes, continuous crossings,
offscreen re-entry, fixed-step springs, cursor falloff, and particle lifetime.
