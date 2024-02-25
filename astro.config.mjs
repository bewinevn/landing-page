import { defineConfig, squooshImageService } from "astro/config";

import robots from "astro-robots";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import netlify from "@astrojs/netlify";

// https://astro.build/config
export default defineConfig({
  site: "https://minimma.vercel.app",
  image: {
    service: squooshImageService(),
  },
  integrations: [tailwind(), sitemap(), robots()],
  output: "server",
  adapter: netlify(),
});
