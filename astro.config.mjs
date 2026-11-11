// Builds the saved-data website as static files with a configurable public origin.
// Keeps previews local and supports a future Vercel or GitHub Pages deployment.
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  site: process.env.BINGO_SITE_URL || "https://mohi-devhub.github.io/buzzword-bingo/",
  base: process.env.BINGO_BASE || "/buzzword-bingo/",
  trailingSlash: "always",
  devToolbar: { enabled: false },
});
