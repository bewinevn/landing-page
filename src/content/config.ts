import { defineCollection, z } from "astro:content";

const settings = defineCollection({
  type: "data",
  schema: ({ image }) =>
    z.object({
      sitename: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      logo: image().optional(),
      keywords: z.array(z.string()).optional(),
      project_tags: z.array(z.string()).optional(),
      socials: z
        .array(
          z.object({
            target: z.string(),
            name: z.string(),
            link: z.string(),
          }),
        )
        .optional(),
    }),
});

const venues = defineCollection({
  type: "data",
  schema: ({ image }) => z.object({
    list: z.array(
      z.object({
        name: z.string(),
        link: z.string(),
        subtitle: z.string().optional(),
        image: image()
      })
    )
  })
})

export const collections = {
  settings,
  venues
};
