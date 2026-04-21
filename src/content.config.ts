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

const signupFormSchema = z.object({
  kicker: z.string(),
  title: z.string(),
  body: z.string().optional(),
  cta: z.string(),
  legal: z.string().optional(),
  benefits: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  consentLabel: z.string().optional(),
  successMessage: z.string().optional(),
  errorMessage: z.string().optional(),
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
      youtubeId: z.string().optional(),
      registrationUrl: z.string().url().optional(),
      eventNumberLabel: z.string(),
      titleFont: z.enum(['germania', 'questrial', 'tuscany']),
      waitlistCtaLabel: z.string(),
      factsBar: z.array(
        z.object({
          icon: z.enum(['calendar', 'pin', 'loop', 'road', 'clock', 'mountain']),
          label: z.string(),
          value: z.string(),
          sub: z.string().optional(),
        })
      ),
      brevoListId: z.number().optional(),
      brevoSegment: z.string(),
      tagline: z.string().optional(),
      startFinish: z.string().optional(),
      surface: z.string().optional(),
      philosophyQuote: z.string().optional(),
      philosophyImage: z.string().optional(),
      registrationOpens: z
        .object({
          date: z.coerce.string(),
          kicker: z.string().optional(),
          title: z.string(),
          body: z.string().optional(),
          ctaLabel: z.string().optional(),
          ctaHref: z.string().optional(),
          openLabel: z.string().optional(),
        })
        .optional(),
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
      routeMap: z
        .object({
          title: z.string().optional(),
          startingPoint: z.string().optional(),
          km: z.number().optional(),
          elev: z.number().optional(),
          mapImage: z.string().optional(),
          mapImageAlt: z.string().optional(),
          elevationImage: z.string().optional(),
          elevationImageAlt: z.string().optional(),
          elevationRange: z.string().optional(),
          mapScale: z.string().optional(),
          tracks: z
            .array(
              z.object({
                key: z.string(),
                label: z.string(),
                km: z.number(),
                elev: z.number(),
                mapImage: z.string().optional(),
                elevationImage: z.string().optional(),
                elevationRange: z.string().optional(),
              })
            )
            .optional(),
        })
        .optional(),
      sectionOrder: z
        .array(
          z.enum([
            'facts',
            'signupTop',
            'countdown',
            'philosophy',
            'documentary',
            'places',
            'routeMap',
            'mdxBody',
            'photoSplitDay',
            'included',
            'photoBreakIncluded',
            'testimonials',
            'photoBreakTestimonials',
            'credo',
            'photoSplitQuiet',
            'signupBottom',
            'photoBreakFaq',
            'faq',
          ])
        )
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
      registrationOpens: z
        .object({
          date: z.coerce.string(),
          kicker: z.string().optional(),
          title: z.string(),
          body: z.string().optional(),
          ctaLabel: z.string().optional(),
          ctaHref: z.string().optional(),
          openLabel: z.string().optional(),
        })
        .optional(),
      signupBottom: signupFormSchema,
      eventSignupTop: signupFormSchema.optional(),
      eventSignupBottom: signupFormSchema.optional(),
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
          caption: z.string().optional(),
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
      signup: signupFormSchema,
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
      featured: z
        .object({
          eventSlug: z.enum(['auto', 'slovenia', 'germany', 'tuscany']).optional(),
          kicker: z.string().optional(),
          heading: z.string().optional(),
          body: z.string().optional(),
          image: z.string().optional(),
          imageAlt: z.string().optional(),
          countdownLabel: z.string().optional(),
          dateLabel: z.string().optional(),
          targetDate: z.coerce.string().optional(),
          ctaLabel: z.string().optional(),
          ctaHref: z.string().optional(),
        })
        .optional(),
      sectionOrder: z
        .array(
          z.enum([
            'signupTop',
            'documentary',
            'whatIs',
            'escapes',
            'documentarySecondary',
            'countdown',
            'testimonials',
            'values',
            'origin',
            'signupBottom',
          ])
        )
        .optional(),
    }),
});

const registrations = defineCollection({
  loader: glob({ pattern: '*/index.yaml', base: './src/content/registrations' }),
  schema: () =>
    z.object({
      basRegisterUrl: z.string().url(),
      basAccountUrl: z.string().url(),
      registrationOpenIso: z.coerce.string(),
      hero: z.object({
        kicker: z.string(),
        title: z.string(),
        lead: z.string(),
        contactHtml: z.string().optional(),
      }),
      countdown: z.object({
        kicker: z.string().optional(),
        title: z.string(),
        body: z.string().optional(),
        ctaLabel: z.string().optional(),
        openLabel: z.string().optional(),
        accentColor: z.string().optional(),
      }),
      account: z.object({
        kicker: z.string(),
        title: z.string(),
        bodyParagraphs: z.array(z.string()),
        ctaAccountLabel: z.string(),
        ctaRegisterLabel: z.string(),
        supportHtml: z.string().optional(),
      }),
      benefits: z.object({
        kicker: z.string(),
        title: z.string(),
        items: z.array(z.string()),
      }),
      pricing: z.object({
        kicker: z.string(),
        title: z.string(),
        cards: z.array(
          z.object({
            label: z.string(),
            value: z.string(),
            dates: z.string(),
            note: z.string().optional(),
            highlighted: z.boolean().optional(),
          })
        ),
        rulesHtml: z.string().optional(),
      }),
      faq: z.object({
        kicker: z.string(),
        title: z.string(),
        accentColor: z.string().optional(),
        items: z.array(z.object({ q: z.string(), a: z.string() })),
      }),
      final: z.object({
        title: z.string(),
        body: z.string().optional(),
        ctaLabel: z.string(),
      }),
    }),
});

export const collections = { events, hub, registrations };
