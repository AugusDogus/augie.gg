import createMDX from "@next/mdx";

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactCompiler: true,
  pageExtensions: ["mdx", "ts", "tsx"],
  experimental: {
    mdxRs: { mdxType: "gfm" },
  },
  async headers() {
    return [
      {
        // KiCad files are text, but go out as octet-stream, which neither
        // `next start` nor Vercel compresses: as text they shrink to a fifth.
        source: "/work/:project/:file(.+\\.kicad_(?:pcb|sch))",
        headers: [{ key: "Content-Type", value: "text/plain; charset=utf-8" }],
      },
    ];
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
