import createMDX from "@next/mdx";

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactCompiler: true,
  pageExtensions: ["mdx", "ts", "tsx"],
  experimental: {
    mdxRs: { mdxType: "gfm" },
  },
  // The project cards are drawn at build and served as files. Their route
  // reads each capture by a path it works out, which would otherwise pull
  // every capture and video into its function.
  outputFileTracingExcludes: { "/og/**": ["./public/work/**/*"] },
  // A link to an open project, `/?p=<title>`, is served by the page that
  // carries that project's link preview. The address stays as it is.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "query", key: "p", value: "(?<project>.+)" }],
          destination: "/p/:project",
        },
      ],
    };
  },
  // That page's own address opens nothing, so a visit to it goes to the link it stands for.
  async redirects() {
    return [
      { source: "/p/:title*", destination: "/?p=:title*", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        // KiCad files are text, but go out as octet-stream, which neither
        // `next start` nor Vercel compresses: as text they shrink to a fifth.
        source: "/work/:project/:file(.+\\.kicad_(?:pcb|sch))",
        headers: [{ key: "Content-Type", value: "text/plain; charset=utf-8" }],
      },
      {
        // The résumé opens in the browser's viewer, and saves from there
        // under a name that says whose it is.
        source: "/resume.pdf",
        headers: [
          {
            key: "Content-Disposition",
            value: 'inline; filename="augie-luebbers-resume.pdf"',
          },
        ],
      },
    ];
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
