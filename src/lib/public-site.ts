export const siteName = "UpdateBeam";
export const siteTagline = "Public monitoring digests for tax, regulatory, and compliance teams.";
export const siteDescription =
  "Monitor public tax, regulatory, and government sources with one verified daily digest delivered at your team’s chosen time.";
export const siteBrandColor = "#059669";
export const siteBrandDark = "#020617";
export const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "")
  || process.env.APP_URL?.replace(/\/+$/, "")
  || "http://localhost:3000";

export const siteOgImagePath = "/opengraph-image";

export const publicRoutes = [
  "/",
  "/how-it-works",
  "/sources",
  "/updates",
  "/use-cases",
  "/request-a-source",
  "/feedback",
  "/privacy",
  "/terms",
];

export const publicNavItems = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/sources", label: "Sources" },
  { href: "/request-a-source", label: "Request a source" },
  { href: "/feedback", label: "Feedback" },
];

export const marketingHighlights = [
  {
    title: "One digest, not a tab graveyard",
    description:
      "Track public sources across tax, regulatory, and compliance workflows, then receive one clean daily digest at the time your team actually wants it.",
  },
  {
    title: "Set your own delivery time",
    description:
      "Choose a local delivery time per subscriber. UpdateBeam aligns the digest to your timezone instead of forcing a fixed send window.",
  },
  {
    title: "Expand coverage with source requests",
    description:
      "Teams can request new public sources directly from the product. We review demand, add adapters, and grow coverage deliberately.",
  },
];

export const howItWorksSteps = [
  {
    title: "Pick the sources you care about",
    body: "Subscribe by email, select one or more monitored sources, and choose the local time you want the digest to arrive.",
  },
  {
    title: "Confirm your email",
    body: "We use double opt-in so subscriptions stay compliant and abuse-resistant.",
  },
  {
    title: "Receive one combined team-ready digest",
    body: "Each day you receive a single digest that groups verified changes by source and content type, with secure links to manage your settings later.",
  },
];

export const faqItems = [
  {
    question: "Do I need an account?",
    answer: "No. You subscribe with an email address, confirm it once, and later manage your settings from a secure link sent by email.",
  },
  {
    question: "How often will I get emails?",
    answer: "You receive one daily digest per subscriber profile. If you follow multiple sources, they are combined into the same email.",
  },
  {
    question: "Can I request a new monitored website?",
    answer: "Yes. Submit the website and why it matters. We review demand and add new source adapters manually.",
  },
  {
    question: "Can I change the delivery time later?",
    answer: "Yes. Every subscriber gets a secure management link that can update timezone, delivery time, source selection, or unsubscribe completely.",
  },
];

export const seoKeywordClusters = [
  "public compliance monitoring",
  "tax update alerts for teams",
  "government announcement tracking",
  "regulatory digest for teams",
  "daily compliance email monitoring",
];

export const sourcePageKeywords = [
  "public source monitoring",
  "government website monitoring",
  "tax source digest",
  "regulatory source tracking",
  "compliance source catalog",
];

export const howItWorksKeywords = [
  "how compliance monitoring works",
  "daily digest workflow",
  "public website monitoring process",
  "double opt-in digest subscription",
];

export const requestSourceKeywords = [
  "request monitored source",
  "submit government website monitoring request",
  "ask for new compliance source",
];

export const feedbackPageKeywords = [
  "product feedback for monitoring tool",
  "digest quality feedback",
  "source coverage feedback",
];

export const legalPageKeywords = [
  "monitoring SaaS privacy",
  "email digest privacy policy",
  "monitoring SaaS terms",
];

export const sourceDetailKeywords = [
  "HASiL public updates",
  "e-Invoice events",
  "Malaysia Inland Revenue Board updates",
  "tax authority monitoring",
  "public update digest",
];

export const updatePageKeywords = [
  "verified public update",
  "HASiL webinar notice",
  "e-Invoice webinar",
  "public notice archive",
  "training and webinar update",
];

export const useCasePageKeywords = [
  "tax operations monitoring",
  "compliance monitoring workflow",
  "regional public source tracking",
  "government update digest",
];

export const updatesIndexKeywords = [
  "public update archive",
  "verified public updates",
  "source update archive",
];

export const useCasesIndexKeywords = [
  "public monitoring use cases",
  "tax operations monitoring",
  "compliance operations monitoring",
];

export type PublicUseCasePage = {
  slug: string;
  title: string;
  summary: string;
  audience: string;
  challenge: string;
  workflow: string[];
  recommendedSources: string[];
  proofPoints: string[];
  ctaLabel: string;
};

export const publicUseCasePages: PublicUseCasePage[] = [
  {
    slug: "tax-operations",
    title: "Tax operations monitoring",
    summary: "Keep tax teams ahead of official updates without manually revisiting the same public sites every morning.",
    audience: "Tax teams",
    challenge: "Filing cycles, e-Invoice changes, and taxpayer notices are scattered across public pages.",
    workflow: [
      "Subscribe to the official sources your team revisits most often.",
      "Choose a local delivery time that matches your morning handoff.",
      "Forward one clean digest instead of many raw links.",
    ],
    recommendedSources: ["HASiL Public Updates (EN)"],
    proofPoints: ["One digest per day", "Double opt-in", "No login required"],
    ctaLabel: "Browse sources",
  },
  {
    slug: "compliance-operations",
    title: "Compliance operations monitoring",
    summary: "Combine government and regulatory sources into one digest so daily triage starts from a single inbox summary.",
    audience: "Compliance teams",
    challenge: "Important notices are easy to miss when different departments watch different websites.",
    workflow: [
      "Subscribe to government and regulatory sources together.",
      "Route updates into a team-ready daily summary.",
      "Use the digest as a shared input for triage and escalation.",
    ],
    recommendedSources: ["HASiL Public Updates (EN)"],
    proofPoints: ["Grouped by source and label", "Subscriber-set delivery time", "Selective public updates"],
    ctaLabel: "See source catalog",
  },
  {
    slug: "regional-monitoring",
    title: "Regional monitoring",
    summary: "Let each subscriber set a local delivery time so teams in different markets receive the same workflow at the right hour.",
    audience: "Regional teams",
    challenge: "Cross-market monitoring breaks down when one timezone is forced on every subscriber.",
    workflow: [
      "Use the same public source list across markets.",
      "Let each subscriber choose a local delivery time.",
      "Keep one digest format even when teams work in different regions.",
    ],
    recommendedSources: ["HASiL Public Updates (EN)"],
    proofPoints: ["Local delivery time", "Combined digest delivery", "Secure manage link"],
    ctaLabel: "Start a free subscription",
  },
];

export function getPublicUseCasePage(slug: string): PublicUseCasePage | undefined {
  return publicUseCasePages.find((page) => page.slug === slug);
}

export function publicContentRoutes(): string[] {
  return [
    "/updates",
    "/use-cases",
    ...publicUseCasePages.map((page) => `/use-cases/${page.slug}`),
  ];
}

export function buildSourceDetailStructuredData(input: {
  slug: string;
  title: string;
  summary: string;
  updates: Array<{ title: string; summary: string; slug: string; sourceSlug?: string; date: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: input.title,
        description: input.summary,
        url: `${siteUrl}/sources/${input.slug}`,
        about: {
          "@type": "Organization",
          name: siteName,
          url: siteUrl,
        },
      },
      {
        "@type": "ItemList",
        numberOfItems: input.updates.length,
        itemListElement: input.updates.map((update, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Article",
            name: update.title,
            description: update.summary,
            url: `${siteUrl}/updates/${update.sourceSlug}/${update.slug}`,
            datePublished: update.date,
          },
        })),
      },
    ],
  };
}

export function buildUpdatesIndexStructuredData(
  updates: Array<{ title: string; summary: string; slug: string; sourceSlug: string; date: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${siteName} Selected public updates`,
    description: "Browse selected verified public updates published by UpdateBeam.",
    url: `${siteUrl}/updates`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: updates.length,
      itemListElement: updates.map((update, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Article",
          name: update.title,
          description: update.summary,
          url: `${siteUrl}/updates/${update.sourceSlug}/${update.slug}`,
          datePublished: update.date,
        },
      })),
    },
  };
}

export function buildUpdateStructuredData(page: {
  title: string;
  summary: string;
  date: string;
  sourceSlug: string;
  slug: string;
  sourceName: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.summary,
    datePublished: page.date,
    url: `${siteUrl}/updates/${page.sourceSlug}/${page.slug}`,
    about: {
      "@type": "Organization",
      name: page.sourceName,
    },
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
    },
  };
}

export function buildUseCaseStructuredData(page: PublicUseCasePage) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: page.summary,
    url: `${siteUrl}/use-cases/${page.slug}`,
    about: {
      "@type": "Thing",
      name: page.audience,
    },
  };
}

export function buildUseCasesIndexStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${siteName} Use cases`,
    description: "Explore practical public monitoring workflows for tax, compliance, and regional teams.",
    url: `${siteUrl}/use-cases`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: publicUseCasePages.length,
      itemListElement: publicUseCasePages.map((page, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "WebPage",
          name: page.title,
          description: page.summary,
          url: `${siteUrl}/use-cases/${page.slug}`,
        },
      })),
    },
  };
}

export const homepageStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
      description: siteDescription,
    },
    {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
      description: siteDescription,
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/sources`,
        "query-input": "required name=source",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ],
};

export function buildSourcesStructuredData(input: {
  sourceCount: number;
  sources: Array<{ name: string; url: string; description?: string | null }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${siteName} Sources`,
    description: "Browse public sources monitored by UpdateBeam and subscribe to one daily digest.",
    url: `${siteUrl}/sources`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: input.sourceCount,
      itemListElement: input.sources.map((source, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "WebPage",
          name: source.name,
          url: source.url,
          description: source.description || undefined,
        },
      })),
    },
  };
}

export const howItWorksStructuredData = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How UpdateBeam works",
  description: "Subscribe to monitored public sources, confirm once by email, and receive one verified daily digest.",
  step: howItWorksSteps.map((step, index) => ({
    "@type": "HowToStep",
    position: index + 1,
    name: step.title,
    text: step.body,
  })),
};

export const requestSourceStructuredData = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Request a source",
  description: "Submit a public website your team wants UpdateBeam to monitor next.",
  url: `${siteUrl}/request-a-source`,
};

export const feedbackStructuredData = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Product feedback",
  description: "Share product feedback, source gaps, and digest quality issues with UpdateBeam.",
  url: `${siteUrl}/feedback`,
};
