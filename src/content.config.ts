import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const photoSplitSide = z.object({
  title: z.string(),
  body: z.string(),
  caption: z.string(),
  image: z.string().optional(),
});

const photoBreakItem = z.object({
  caption: z.string().optional(),
  image: z.string().optional(),
});

const events = defineCollection({
  loader: glob({ pattern: '*/index.mdx', base: './src/content/events' }),
  schema: () =>
    z.object({
      slug: z.enum(['slovenia', 'germany', 'tuscany']),
      order: z.number(),
      name: z.string(),
      country: z.string(),
      date: z.coerce.date(),
      dateLabel: z.string(),
      distanceKm: z.number(),
      elevationD: z.number(),
      quote: z.string(),
      status: z.enum(['open', 'limited', 'sold']),
      statusLabel: z.string(),
      subBrandColor: z.string(),
      heroImage: z.string().optional(),
      heroImageAlt: z.string().optional(),
      mascotImage: z.string().optional(),
      registrationUrl: z.string().url().optional(),
      brevoListId: z.number().optional(),
      brevoSegment: z.string(),
      tagline: z.string().optional(),
      startFinish: z.string().optional(),
      surface: z.string().optional(),
      philosophyQuote: z.string().optional(),
      places: z
        .array(
          z.object({
            name: z.string(),
            description: z.string(),
            size: z.enum(['sm', 'md', 'lg']).optional(),
            image: z.string().optional(),
          })
        )
        .optional(),
      included: z.array(z.string()).optional(),
      testimonials: z
        .array(
          z.object({
            quote: z.string(),
            author: z.string(),
            event: z.string().optional(),
          })
        )
        .optional(),
      faq: z
        .array(z.object({ q: z.string(), a: z.string() }))
        .optional(),
      photoSplits: z
        .object({
          day: photoSplitSide,
          quiet: photoSplitSide,
        })
        .optional(),
      photoBreaks: z
        .object({
          included: photoBreakItem.optional(),
          testimonials: photoBreakItem.optional(),
          faq: photoBreakItem.optional(),
        })
        .optional(),
    }),
});

const hub = defineCollection({
  loader: glob({ pattern: '*/index.yaml', base: './src/content/hub' }),
  schema: () =>
    z.object({
      manifesto: z.object({
        kicker: z.string(),
        serif: z.string(),
        huge: z.string(),
        cta: z.string(),
        ctaHref: z.string(),
        videoSrc: z.string(),
        posterSrc: z.string(),
      }),
      documentary: z.object({
        label: z.string(),
        title: z.string(),
        subtitle: z.string(),
        youtubeId: z.string(),
      }),
      documentarySecondary: z.object({
        label: z.string(),
        title: z.string(),
        subtitle: z.string(),
        youtubeId: z.string(),
      }),
      testimonials: z.object({
        kicker: z.string(),
        title: z.string(),
        items: z.array(
          z.object({
            quote: z.string(),
            author: z.string(),
            role: z.string().optional(),
            event: z.string().optional(),
          })
        ),
      }),
      signupBottom: z.object({
        kicker: z.string(),
        title: z.string(),
        body: z.string(),
        cta: z.string(),
        legal: z.string(),
      }),
      whatIs: z.object({
        kicker: z.string(),
        title: z.string(),
        body: z.string(),
        statNumber: z.string(),
        statLabel: z.string(),
        since: z.string(),
      }),
      values: z.array(
        z.object({
          number: z.string(),
          title: z.string(),
          body: z.string(),
          caption: z.string(),
          image: z.string().optional(),
        })
      ),
      threeEscapes: z.object({
        title: z.string(),
        subtitle: z.string(),
      }),
      origin: z.object({
        kicker: z.string(),
        imageCaption: z.string(),
        title: z.string(),
        body: z.array(z.string()),
        image: z.string().optional(),
      }),
      signup: z.object({
        kicker: z.string(),
        title: z.string(),
        body: z.string(),
        cta: z.string(),
        legal: z.string(),
      }),
      trust: z.object({
        label: z.string(),
        partners: z.array(
          z.object({
            name: z.string(),
            logo: z.string(),
            isMain: z.boolean().optional(),
          })
        ),
      }),
    }),
});

export const collections = { events, hub };
