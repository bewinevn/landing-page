import { defineConfig, squooshImageService } from "astro/config";
// Loads .env into process.env for local dev (astro dev only reads .env into
// import.meta.env by default). On Netlify, real env vars are already in
// process.env at runtime, so this is a harmless no-op there.
import "dotenv/config";

import robots from "astro-robots";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import netlify from "@astrojs/netlify";

// https://astro.build/config
export default defineConfig({
  site: "https://bewinevn.com",
  image: {
    service: squooshImageService(),
  },
  i18n: {
    defaultLocale: "vn",
    locales: ["vn", "en"],
    routing: {
      prefixDefaultLocale: false // No /vn URL
    }
  },
  integrations: [tailwind(), sitemap(), robots()],
  output: "server",
  adapter: netlify(),
});
