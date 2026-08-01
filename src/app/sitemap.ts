const SITE_URL = "https://augie.gg";

export default function sitemap() {
  return ["", "/resume"].map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date().toISOString(),
  }));
}
