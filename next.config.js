import createMDX from "@next/mdx";

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactCompiler: true,
  pageExtensions: ["mdx", "ts", "tsx"],
  experimental: {
    mdxRs: { mdxType: "gfm" },
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
