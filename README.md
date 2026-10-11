# augie.gg

My personal website.

## Tech Stack

- [Next.js 15](https://nextjs.org)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [MDX](https://mdxjs.com)
- [sugar-high](https://github.com/huozhi/sugar-high)
- [Phosphor Icons](https://phosphoricons.com)
- [JetBrains Mono](https://www.jetbrains.com/lp/mono/)

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
  private: true, // lock icon
  fork: true, // ⑂ marker; name upstream in the blurb
},
```

Everything lands in the archive, grouped by year, unless you mark it:

- `featured: n` moves it into **Selected work** at position `n` (1 is first).
  Add a `highlight`: one line of concrete, verifiable evidence such as the
  stack, a hard problem, or real usage. Don't invent numbers.
- `notable: true` names an upstream contribution in the open source line under
  Selected work. It also stays in the archive.

## Development

```bash
bun install
bun dev
```
