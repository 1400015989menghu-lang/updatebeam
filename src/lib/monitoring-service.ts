import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import {
  createSecureToken,
  feedbackSubmissionSchema,
  manageLookupSchema,
  manageSubscriptionSchema,
  normalizeEmail,
  sourceSubmissionSchema,
  subscribeSchema,
  unsubscribeSchema,
} from "@/lib/monitoring";

const CONFIRM_TOKEN_HOURS = 48;
const UNSUBSCRIBE_TOKEN_DAYS = 30;
const MANAGE_TOKEN_DAYS = 30;

type JsonList = string[] | null;
type SourceTier = "official" | "professional" | "vendor" | "competitor" | "social";
type ReviewMode = "automatic" | "hybrid" | "review-only";
type SourceCtaMode = "subscribe" | "coming-soon" | "request-review";

interface PublicTrackedSourceCounts {
  subscriptions: number;
  updates: number;
}

interface PublicTrackedSourceRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  organizationName: string | null;
  rootUrl: string;
  category: string;
  timezone: string;
  adapterType: string;
  sourceType: string;
  automationMode: string;
  trustTier: string;
  includeKeywordsJson: string | null;
  seedUrlsJson: string | null;
  updatedAt: Date;
  _count: PublicTrackedSourceCounts;
}

interface SourceRegistryMeta {
  reviewMode: ReviewMode;
  reviewModeLabel: string;
  isReviewOnly: boolean;
}

interface SourcePublicState {
  reviewMode: ReviewMode;
  reviewModeLabel: string;
  isReviewOnly: boolean;
  isLive: boolean;
  isSubscribable: boolean;
  publicUpdateCount: number;
  readinessLabel: string;
  readinessDescription: string;
  ctaMode: SourceCtaMode;
}

let sourceRegistryIndexPromise: Promise<Map<string, SourceRegistryMeta>> | null = null;

function parseJsonList(value: string | null | undefined): JsonList {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return null;
    }
    return parsed
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  } catch {
    return null;
  }
}

function uniqueList(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => (value || "").trim()).filter(Boolean))];
}

function titleCase(value: string | null | undefined): string {
  return (value || "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function sourceTierFor(sourceType: string): SourceTier {
  if (sourceType.startsWith("official-")) {
    return "official";
  }
  if (sourceType === "professional-body") {
    return "professional";
  }
  if (sourceType === "software-vendor") {
    return "vendor";
  }
  if (sourceType === "competitor-firm") {
    return "competitor";
  }
  if (sourceType === "social-channel" || sourceType === "video-channel") {
    return "social";
  }
  return "vendor";
}

function sourceTierLabel(tier: SourceTier): string {
  switch (tier) {
    case "official":
      return "Official / legislation";
    case "professional":
      return "Professional bodies";
    case "vendor":
      return "Vendor / software";
    case "competitor":
      return "Competitor / commentary";
    case "social":
      return "Social / video";
  }
}

function sourceTypeLabel(sourceType: string): string {
  switch (sourceType) {
    case "official-website":
      return "Official website";
    case "official-legislation":
      return "Legislation portal";
    case "official-portal":
      return "Official portal";
    case "professional-body":
      return "Professional body";
    case "software-vendor":
      return "Software vendor";
    case "competitor-firm":
      return "Competitor commentary";
    case "social-channel":
      return "Social channel";
    case "video-channel":
      return "Video channel";
    default:
      return titleCase(sourceType) || "Public source";
  }
}

function trustLabel(trustTier: string): string {
  switch (trustTier) {
    case "official":
      return "Official source";
    case "professional":
      return "Professional body";
    case "vendor":
      return "Vendor source";
    case "vendor-social":
      return "Vendor social channel";
    case "competitor":
      return "Competitor commentary";
    case "social":
      return "Social channel";
    default:
      return titleCase(trustTier) || "Public source";
  }
}

function normalizeReviewMode(value: string | null | undefined): ReviewMode {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "review-only") {
    return "review-only";
  }
  if (normalized === "hybrid") {
    return "hybrid";
  }
  return "automatic";
}

function reviewModeLabel(reviewMode: ReviewMode): string {
  switch (reviewMode) {
    case "automatic":
      return "Automatic monitoring";
    case "hybrid":
      return "Hybrid monitoring";
    case "review-only":
      return "Manual review only";
  }
}

async function getSourceRegistryIndex() {
  if (!sourceRegistryIndexPromise) {
    sourceRegistryIndexPromise = (async () => {
      const registryPath = path.join(process.cwd(), "data", "source-manifest.json");
      const index = new Map<string, SourceRegistryMeta>();

      try {
        const payload = JSON.parse(await readFile(registryPath, "utf-8"));
        if (!Array.isArray(payload)) {
          return index;
        }

        for (const entry of payload) {
          if (!entry || typeof entry !== "object") {
            continue;
          }

          const slug = typeof entry.slug === "string" ? entry.slug.trim() : "";
          if (!slug) {
            continue;
          }

          const reviewMode = normalizeReviewMode(
            typeof entry.reviewMode === "string" ? entry.reviewMode : undefined,
          );
          index.set(slug, {
            reviewMode,
            reviewModeLabel: reviewModeLabel(reviewMode),
            isReviewOnly: reviewMode === "review-only",
          });
        }
      } catch {
        return index;
      }

      return index;
    })();
  }

  return sourceRegistryIndexPromise;
}

async function getSourceRegistryMeta(slug: string): Promise<SourceRegistryMeta> {
  const index = await getSourceRegistryIndex();
  return index.get(slug) || {
    reviewMode: "automatic",
    reviewModeLabel: reviewModeLabel("automatic"),
    isReviewOnly: false,
  };
}

function derivePublicState(publicUpdateCount: number, registryMeta: SourceRegistryMeta): SourcePublicState {
  const isLive = publicUpdateCount > 0 && !registryMeta.isReviewOnly;
  const isSubscribable = isLive;

  if (registryMeta.isReviewOnly) {
    return {
      ...registryMeta,
      isLive: false,
      isSubscribable: false,
      publicUpdateCount: 0,
      readinessLabel: "Manual review only",
      readinessDescription:
        "This source is already in the monitoring workflow, but current delivery still depends on manual review. It is visible for source planning and trust review, not for automatic digest subscription.",
      ctaMode: "request-review",
    };
  }

  if (isLive) {
    return {
      ...registryMeta,
      isLive,
      isSubscribable,
      publicUpdateCount,
      readinessLabel: "Live for subscription",
      readinessDescription:
        "This source already has public updates available and can be included in a subscriber digest today.",
      ctaMode: "subscribe",
    };
  }

  return {
    ...registryMeta,
    isLive: false,
    isSubscribable: false,
    publicUpdateCount,
    readinessLabel: "Coming soon",
    readinessDescription:
      "This source is already in the automated monitoring workflow. Subscriber delivery opens after the first public updates have been captured and published.",
    ctaMode: "coming-soon",
  };
}

function mapPublicTrackedSource(source: PublicTrackedSourceRecord, registryMeta: SourceRegistryMeta) {
  const subscriberCount = source._count.subscriptions;
  const sourceTier = sourceTierFor(source.sourceType);
  const publicState = derivePublicState(source._count.updates, registryMeta);

  return {
    id: source.id,
    slug: source.slug,
    name: source.name,
    description: source.description,
    organizationName: source.organizationName,
    rootUrl: source.rootUrl,
    category: source.category,
    timezone: source.timezone,
    adapterType: source.adapterType,
    sourceType: source.sourceType,
    sourceTypeLabel: sourceTypeLabel(source.sourceType),
    sourceTier,
    sourceTierLabel: sourceTierLabel(sourceTier),
    automationMode: source.automationMode,
    trustTier: source.trustTier,
    trustLabel: trustLabel(source.trustTier),
    includeKeywords: parseJsonList(source.includeKeywordsJson) || [],
    seedUrls: parseJsonList(source.seedUrlsJson) || [],
    updatedAt: source.updatedAt,
    reviewMode: publicState.reviewMode,
    reviewModeLabel: publicState.reviewModeLabel,
    subscriberCount,
    publicUpdateCount: publicState.publicUpdateCount,
    isLive: publicState.isLive,
    isSubscribable: publicState.isSubscribable,
    readinessLabel: publicState.readinessLabel,
    readinessDescription: publicState.readinessDescription,
    ctaMode: publicState.ctaMode,
  };
}

function buildSourceCoverage(source: {
  includeKeywordsJson?: string | null;
  adapterType?: string;
  sourceType?: string;
}) {
  const keywords = parseJsonList(source.includeKeywordsJson);
  if (keywords?.length) {
    return keywords.slice(0, 6);
  }

  return uniqueList([
    source.adapterType === "rss" ? "Feed updates" : null,
    source.sourceType === "social-channel" ? "Social posts" : null,
    source.sourceType === "video-channel" ? "Video uploads" : null,
    "Keyword-matched public updates",
    "Prior-day changes only",
  ]);
}

function sourceAudience(source: { category: string; sourceType?: string | null }) {
  const base = source.category === "tax"
    ? ["Tax operations", "Compliance teams"]
    : source.category === "government"
      ? ["Policy monitoring", "Regional teams"]
      : source.category === "regulatory"
        ? ["Compliance teams", "Monitoring ops"]
        : ["Research teams", "Monitoring workflows"];

  if (source.sourceType === "software-vendor") {
    base.unshift("Implementation teams");
  }
  if (source.sourceType === "social-channel" || source.sourceType === "video-channel") {
    base.push("Comms monitoring");
  }
  return [...new Set(base)];
}

function sourceDigestHighlights(source: {
  includeKeywordsJson?: string | null;
  automationMode?: string | null;
  trustTier?: string | null;
}) {
  const keywords = parseJsonList(source.includeKeywordsJson);
  return uniqueList([
    source.trustTier ? `${source.trustTier[0].toUpperCase()}${source.trustTier.slice(1)}-tier source` : null,
    keywords?.length ? `Keyword filtered (${Math.min(keywords.length, 6)} tracked terms)` : "Keyword filtered",
    source.automationMode === "social" ? "Nonstandard source automation" : null,
    "Prior-day changes only",
    "Grouped by source and label",
  ]);
}

function sourceSummary(source: {
  description: string | null;
  organizationName: string | null;
  name: string;
  sourceType: string;
  includeKeywordsJson?: string | null;
}) {
  if (source.description?.trim()) {
    return source.description.trim();
  }

  const keywords = parseJsonList(source.includeKeywordsJson);
  const keywordSnippet = keywords?.slice(0, 4).join(", ");
  const owner = source.organizationName || source.name;

  if (keywordSnippet) {
    return `Track prior-day public updates from ${owner}, with keyword matching around ${keywordSnippet}.`;
  }

  return `Track prior-day public updates from ${owner} with one daily digest-ready source profile.`;
}

async function filterSubscriptionEligibleSources<T extends { slug: string }>(sources: T[]) {
  const registry = await getSourceRegistryIndex();
  return sources.filter((source) => !(registry.get(source.slug)?.isReviewOnly));
}

export async function listPublicTrackedSources() {
  const sources = await prisma.trackedSource.findMany({
    where: {
      isActive: true,
      isPublic: true,
    },
    orderBy: [
      { category: "asc" },
      { name: "asc" },
    ],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      organizationName: true,
      rootUrl: true,
      category: true,
      timezone: true,
      adapterType: true,
      sourceType: true,
      automationMode: true,
      trustTier: true,
      includeKeywordsJson: true,
      seedUrlsJson: true,
      updatedAt: true,
      _count: {
        select: {
          subscriptions: {
            where: { status: "active" },
          },
          updates: {
            where: { isPublic: true },
          },
        },
      },
    },
  });

  return Promise.all(
    sources.map(async (source) => mapPublicTrackedSource(source, await getSourceRegistryMeta(source.slug))),
  );
}

export async function getPublicTrackedSourceBySlug(slug: string) {
  const source = await prisma.trackedSource.findFirst({
    where: {
      slug,
      isActive: true,
      isPublic: true,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      organizationName: true,
      rootUrl: true,
      category: true,
      timezone: true,
      adapterType: true,
      sourceType: true,
      automationMode: true,
      trustTier: true,
      includeKeywordsJson: true,
      seedUrlsJson: true,
      updatedAt: true,
      _count: {
        select: {
          subscriptions: {
            where: { status: "active" },
          },
          updates: {
            where: { isPublic: true },
          },
        },
      },
    },
  });

  return source ? mapPublicTrackedSource(source, await getSourceRegistryMeta(source.slug)) : null;
}

export async function createPendingSubscription(input: unknown) {
  const parsed = subscribeSchema.parse(input);
  const email = normalizeEmail(parsed.email);
  const existingSubscriber = await prisma.emailSubscriber.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      status: true,
      locale: true,
      timezone: true,
      preferredSendHour: true,
      preferredSendMinute: true,
      createdAt: true,
      updatedAt: true,
      activatedAt: true,
      bouncedAt: true,
    },
  });

  const sources = await prisma.trackedSource.findMany({
    where: {
      id: { in: parsed.sourceIds },
      isActive: true,
      isPublic: true,
      updates: {
        some: { isPublic: true },
      },
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });
  const eligibleSources = await filterSubscriptionEligibleSources(sources);

  if (!eligibleSources.length) {
    throw new Error("No live sources were selected.");
  }

  const subscriber = await prisma.emailSubscriber.upsert({
    where: { email },
    update: {
      status: existingSubscriber?.status === "active" ? "active" : "pending",
      timezone: parsed.timezone,
      preferredSendHour: parsed.preferredSendHour,
      preferredSendMinute: parsed.preferredSendMinute,
    },
    create: {
      email,
      status: "pending",
      locale: "en",
      timezone: parsed.timezone,
      preferredSendHour: parsed.preferredSendHour,
      preferredSendMinute: parsed.preferredSendMinute,
    },
  });

  const existingSubscriptions = await prisma.subscriberSourceSubscription.findMany({
    where: { subscriberId: subscriber.id },
    select: {
      id: true,
      sourceId: true,
      status: true,
      confirmedAt: true,
    },
  });
  const existingBySourceId = new Map(
    existingSubscriptions.map((subscription) => [subscription.sourceId, subscription]),
  );

  const subscriptions = await Promise.all(
    eligibleSources.map((source) =>
      prisma.subscriberSourceSubscription.upsert({
        where: {
          subscriberId_sourceId: {
            subscriberId: subscriber.id,
            sourceId: source.id,
          },
        },
        update: {
          status: existingBySourceId.get(source.id)?.status === "active" ? "active" : "pending",
          confirmedAt:
            existingBySourceId.get(source.id)?.status === "active"
              ? existingBySourceId.get(source.id)?.confirmedAt
              : null,
          unsubscribedAt: null,
        },
        create: {
          subscriberId: subscriber.id,
          sourceId: source.id,
          status: existingBySourceId.get(source.id)?.status === "active" ? "active" : "pending",
          confirmedAt:
            existingBySourceId.get(source.id)?.status === "active"
              ? existingBySourceId.get(source.id)?.confirmedAt
              : null,
        },
      }),
    ),
  );

  await prisma.subscriptionToken.updateMany({
    where: {
      subscriberId: subscriber.id,
      type: "confirm",
      consumedAt: null,
    },
    data: {
      consumedAt: new Date(),
    },
  });

  const token = await prisma.subscriptionToken.create({
    data: {
      token: createSecureToken(),
      subscriberId: subscriber.id,
      type: "confirm",
      expiresAt: new Date(Date.now() + CONFIRM_TOKEN_HOURS * 60 * 60 * 1000),
    },
  });

  return {
    subscriber,
    subscriptions,
    sources: eligibleSources,
    token: token.token,
  };
}

async function ensureSubscriptionToken(params: {
  subscriberId: string;
  type: string;
  subscriptionId?: string | null;
  expiresInDays?: number;
}) {
  const existing = await prisma.subscriptionToken.findFirst({
    where: {
      subscriberId: params.subscriberId,
      type: params.type,
      subscriptionId: params.subscriptionId ?? null,
      consumedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.subscriptionToken.create({
    data: {
      token: createSecureToken(),
      subscriberId: params.subscriberId,
      subscriptionId: params.subscriptionId ?? null,
      type: params.type,
      expiresAt: new Date(
        Date.now() + (params.expiresInDays ?? UNSUBSCRIBE_TOKEN_DAYS) * 24 * 60 * 60 * 1000,
      ),
    },
  });
}

export async function confirmSubscriptionToken(tokenValue: string) {
  const token = await prisma.subscriptionToken.findUnique({
    where: { token: tokenValue },
    include: {
      subscriber: true,
    },
  });

  if (!token || token.type !== "confirm") {
    return { status: "invalid" as const };
  }

  if (token.consumedAt) {
    return { status: "already-confirmed" as const, subscriber: token.subscriber };
  }

  if (token.expiresAt < new Date()) {
    return { status: "expired" as const };
  }

  const activatedAt = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const subscriber = await tx.emailSubscriber.update({
      where: { id: token.subscriberId },
      data: {
        status: "active",
        activatedAt,
      },
    });

    await tx.subscriberSourceSubscription.updateMany({
      where: {
        subscriberId: token.subscriberId,
        status: "pending",
      },
      data: {
        status: "active",
        confirmedAt: activatedAt,
        unsubscribedAt: null,
      },
    });

    await tx.subscriptionToken.update({
      where: { id: token.id },
      data: {
        consumedAt: activatedAt,
      },
    });

    const activeSubscriptions = await tx.subscriberSourceSubscription.findMany({
      where: {
        subscriberId: token.subscriberId,
        status: "active",
      },
      include: {
        source: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const manageToken = await tx.subscriptionToken.findFirst({
      where: {
        subscriberId: token.subscriberId,
        subscriptionId: null,
        type: "manage",
        consumedAt: null,
        expiresAt: { gt: activatedAt },
      },
      orderBy: { createdAt: "desc" },
    }) ?? await tx.subscriptionToken.create({
      data: {
        token: createSecureToken(),
        subscriberId: token.subscriberId,
        type: "manage",
        expiresAt: new Date(Date.now() + MANAGE_TOKEN_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    const unsubscribeToken = await tx.subscriptionToken.findFirst({
      where: {
        subscriberId: token.subscriberId,
        subscriptionId: null,
        type: "unsubscribe",
        consumedAt: null,
        expiresAt: { gt: activatedAt },
      },
      orderBy: { createdAt: "desc" },
    }) ?? await tx.subscriptionToken.create({
      data: {
        token: createSecureToken(),
        subscriberId: token.subscriberId,
        type: "unsubscribe",
        expiresAt: new Date(Date.now() + UNSUBSCRIBE_TOKEN_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    return {
      subscriber,
      sourceNames: activeSubscriptions.map((subscription) => subscription.source.name),
      manageToken: manageToken.token,
      unsubscribeToken: unsubscribeToken.token,
    };
  });

  return { status: "success" as const, ...result };
}

export async function unsubscribeByToken(input: unknown) {
  const parsed = unsubscribeSchema.parse(input);
  const token = await prisma.subscriptionToken.findUnique({
    where: { token: parsed.token },
  });

  if (!token || token.type !== "unsubscribe" || token.consumedAt || token.expiresAt < new Date()) {
    return { status: "invalid" as const };
  }

  const timestamp = new Date();

  await prisma.$transaction(async (tx) => {
    if (token.subscriptionId) {
      await tx.subscriberSourceSubscription.update({
        where: { id: token.subscriptionId },
        data: {
          status: "unsubscribed",
          unsubscribedAt: timestamp,
        },
      });
      const remainingActive = await tx.subscriberSourceSubscription.count({
        where: {
          subscriberId: token.subscriberId,
          status: "active",
        },
      });

      await tx.emailSubscriber.update({
        where: { id: token.subscriberId },
        data: {
          status: remainingActive > 0 ? "active" : "unsubscribed",
        },
      });
    } else {
      await tx.subscriberSourceSubscription.updateMany({
        where: { subscriberId: token.subscriberId },
        data: {
          status: "unsubscribed",
          unsubscribedAt: timestamp,
        },
      });
      await tx.emailSubscriber.update({
        where: { id: token.subscriberId },
        data: {
          status: "unsubscribed",
        },
      });
    }

    await tx.subscriptionToken.update({
      where: { id: token.id },
      data: {
        consumedAt: timestamp,
      },
    });
  });

  return { status: "success" as const };
}

export async function getManageSession(input: unknown) {
  const parsed = manageLookupSchema.parse(input);
  const token = await prisma.subscriptionToken.findUnique({
    where: { token: parsed.token },
    include: {
      subscriber: {
        include: {
          subscriptions: {
            where: {
              source: {
                isPublic: true,
              },
            },
            include: {
              source: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  description: true,
                  rootUrl: true,
                  category: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!token || token.type !== "manage" || token.consumedAt || token.expiresAt < new Date()) {
    return { status: "invalid" as const };
  }

  const sources = await listPublicTrackedSources();
  const subscriber = token.subscriber;
  const activeSourceIds = subscriber.subscriptions
    .filter((subscription) => subscription.status === "active")
    .map((subscription) => subscription.sourceId);

  const unsubscribeToken = await ensureSubscriptionToken({
    subscriberId: token.subscriberId,
    type: "unsubscribe",
    expiresInDays: UNSUBSCRIBE_TOKEN_DAYS,
  });

  return {
    status: "success" as const,
    token: token.token,
    unsubscribeToken: unsubscribeToken.token,
    subscriber: {
      id: subscriber.id,
      email: subscriber.email,
      status: subscriber.status,
      timezone: subscriber.timezone,
      preferredSendHour: subscriber.preferredSendHour,
      preferredSendMinute: subscriber.preferredSendMinute,
      activeSourceIds,
    },
    sources,
  };
}

export async function listRecentPublicUpdates(limit = 24) {
  const registry = await getSourceRegistryIndex();
  const updates = await prisma.sourceUpdate.findMany({
    where: {
      isPublic: true,
      source: {
        isActive: true,
        isPublic: true,
      },
    },
    orderBy: [
      { targetDate: "desc" },
      { publishedDate: "desc" },
      { createdAt: "desc" },
    ],
    take: Math.max(limit * 4, 48),
    include: {
      source: {
        select: {
          id: true,
          slug: true,
          name: true,
          category: true,
          timezone: true,
          rootUrl: true,
        },
      },
    },
  });

  return updates
    .filter((update) => !(registry.get(update.source.slug)?.isReviewOnly))
    .slice(0, limit)
    .map((update) => ({
      id: update.id,
      sourceId: update.sourceId,
      sourceSlug: update.source.slug,
      sourceName: update.source.name,
      sourceCategory: update.source.category,
      sourceTimezone: update.source.timezone,
      sourceRootUrl: update.source.rootUrl,
      slug: update.slug,
      title: update.title,
      label: update.label,
      date: (update.publishedDate || update.updatedDate || update.targetDate).toISOString().slice(0, 10),
      summary: update.summary || "",
      bodyText: update.bodyText || "",
      officialUrl: update.sourceUrl,
      matchedKeywords: parseJsonList(update.matchedKeywordsJson) || [],
    }));
}

export async function listPublicSourceRouteEntries() {
  const sources = await listPublicTrackedSources();

  return sources.map((source) => ({
    slug: source.slug,
    lastModified: source.updatedAt,
  }));
}

export async function listPublicUpdateRouteEntries() {
  const registry = await getSourceRegistryIndex();
  const updates = await prisma.sourceUpdate.findMany({
    where: {
      isPublic: true,
      source: {
        isActive: true,
        isPublic: true,
      },
    },
    orderBy: [
      { targetDate: "desc" },
      { publishedDate: "desc" },
      { createdAt: "desc" },
    ],
    select: {
      slug: true,
      targetDate: true,
      publishedDate: true,
      updatedDate: true,
      createdAt: true,
      source: {
        select: {
          slug: true,
        },
      },
    },
  });

  return updates
    .filter((update) => !(registry.get(update.source.slug)?.isReviewOnly))
    .map((update) => ({
      sourceSlug: update.source.slug,
      slug: update.slug,
      lastModified:
        update.updatedDate ||
        update.publishedDate ||
        update.targetDate ||
        update.createdAt,
    }));
}

export async function getPublicSourcePageData(slug: string) {
  const registryMeta = await getSourceRegistryMeta(slug);
  const source = await prisma.trackedSource.findFirst({
    where: {
      slug,
      isActive: true,
      isPublic: true,
    },
    include: {
      _count: {
        select: {
          subscriptions: {
            where: { status: "active" },
          },
          updates: {
            where: { isPublic: true },
          },
        },
      },
      updates: {
        where: { isPublic: true },
        orderBy: [
          { targetDate: "desc" },
          { publishedDate: "desc" },
          { createdAt: "desc" },
        ],
        take: 6,
      },
    },
  });

  if (!source) {
    return null;
  }

  const publicState = derivePublicState(source._count.updates, registryMeta);
  const updates = registryMeta.isReviewOnly
    ? []
    : source.updates.map((update) => ({
      id: update.id,
      slug: update.slug,
      title: update.title,
      label: update.label,
      date: (update.publishedDate || update.updatedDate || update.targetDate).toISOString().slice(0, 10),
      summary: update.summary || "",
      officialUrl: update.sourceUrl,
    }));

  return {
    id: source.id,
    slug: source.slug,
    title: source.name,
    summary: sourceSummary(source),
    description: source.description,
    officialUrl: source.rootUrl,
    rootUrl: source.rootUrl,
    category: source.category,
    timezone: source.timezone,
    adapterType: source.adapterType,
    sourceTypeLabel: sourceTypeLabel(source.sourceType),
    sourceTier: sourceTierFor(source.sourceType),
    sourceTierLabel: sourceTierLabel(sourceTierFor(source.sourceType)),
    sourceType: source.sourceType,
    automationMode: source.automationMode,
    reviewMode: publicState.reviewMode,
    reviewModeLabel: publicState.reviewModeLabel,
    trustTier: source.trustTier,
    trustLabel: trustLabel(source.trustTier),
    organizationName: source.organizationName,
    audience: sourceAudience(source),
    coverage: buildSourceCoverage(source),
    digestHighlights: sourceDigestHighlights(source),
    isLive: publicState.isLive,
    isSubscribable: publicState.isSubscribable,
    readinessLabel: publicState.readinessLabel,
    readinessDescription: publicState.readinessDescription,
    ctaMode: publicState.ctaMode,
    sampleUpdates: updates,
    includeKeywords: parseJsonList(source.includeKeywordsJson) || [],
    seedUrls: parseJsonList(source.seedUrlsJson) || [],
    activeSubscriberCount: source._count.subscriptions,
    publicUpdateCount: publicState.publicUpdateCount,
  };
}

export async function getPublicUpdatePageData(sourceSlug: string, updateSlug: string) {
  const registryMeta = await getSourceRegistryMeta(sourceSlug);
  if (registryMeta.isReviewOnly) {
    return null;
  }

  const update = await prisma.sourceUpdate.findFirst({
    where: {
      slug: updateSlug,
      isPublic: true,
      source: {
        slug: sourceSlug,
        isActive: true,
        isPublic: true,
      },
    },
    include: {
      source: {
        select: {
          slug: true,
          name: true,
          category: true,
          timezone: true,
          rootUrl: true,
          includeKeywordsJson: true,
        },
      },
    },
  });

  if (!update) {
    return null;
  }

  const related = await prisma.sourceUpdate.findMany({
    where: {
      sourceId: update.sourceId,
      isPublic: true,
      id: { not: update.id },
    },
    orderBy: [
      { targetDate: "desc" },
      { publishedDate: "desc" },
      { createdAt: "desc" },
    ],
    take: 3,
    select: {
      slug: true,
      title: true,
      label: true,
    },
  });

  const firstBodyLine = (update.bodyText || "")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)[0];

  const bodyPoints = uniqueList([
    update.summary,
    firstBodyLine,
    (parseJsonList(update.matchedKeywordsJson) || []).length
      ? `Matched keywords: ${(parseJsonList(update.matchedKeywordsJson) || []).slice(0, 6).join(", ")}.`
      : null,
    "This page is published selectively rather than mirroring every private daily digest.",
  ]);

  return {
    id: update.id,
    slug: update.slug,
    sourceSlug: update.source.slug,
    sourceName: update.source.name,
    sourceCategory: update.source.category,
    sourceTimezone: update.source.timezone,
    sourceRootUrl: update.source.rootUrl,
    title: update.title,
    label: update.label,
    date: (update.publishedDate || update.updatedDate || update.targetDate).toISOString().slice(0, 10),
    summary: update.summary || "",
    officialUrl: update.sourceUrl,
    bodyPoints,
    matchedKeywords: parseJsonList(update.matchedKeywordsJson) || [],
    relatedUpdates: related.map((item) => ({
      slug: item.slug,
      title: item.title,
      label: item.label,
    })),
  };
}

export async function updateManagedSubscription(input: unknown) {
  const parsed = manageSubscriptionSchema.parse(input);
  const token = await prisma.subscriptionToken.findUnique({
    where: { token: parsed.token },
  });

  if (!token || token.type !== "manage" || token.consumedAt || token.expiresAt < new Date()) {
    return { status: "invalid" as const };
  }

  const sources = await prisma.trackedSource.findMany({
    where: {
      id: { in: parsed.sourceIds },
      isActive: true,
      isPublic: true,
      updates: {
        some: { isPublic: true },
      },
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });
  const eligibleSources = await filterSubscriptionEligibleSources(sources);

  if (!eligibleSources.length) {
    throw new Error("No live sources were selected.");
  }

  const sourceIds = eligibleSources.map((source) => source.id);
  const timestamp = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.emailSubscriber.update({
      where: { id: token.subscriberId },
      data: {
        status: "active",
        timezone: parsed.timezone,
        preferredSendHour: parsed.preferredSendHour,
        preferredSendMinute: parsed.preferredSendMinute,
        lastManagedAt: timestamp,
      },
    });

    const existing = await tx.subscriberSourceSubscription.findMany({
      where: {
        subscriberId: token.subscriberId,
      },
      select: {
        id: true,
        sourceId: true,
      },
    });

    const existingIds = new Set(existing.map((item) => item.sourceId));

    for (const sourceId of sourceIds) {
      if (existingIds.has(sourceId)) {
        await tx.subscriberSourceSubscription.update({
          where: {
            subscriberId_sourceId: {
              subscriberId: token.subscriberId,
              sourceId,
            },
          },
          data: {
            status: "active",
            confirmedAt: timestamp,
            unsubscribedAt: null,
          },
        });
      } else {
        await tx.subscriberSourceSubscription.create({
          data: {
            subscriberId: token.subscriberId,
            sourceId,
            status: "active",
            confirmedAt: timestamp,
          },
        });
      }
    }

    await tx.subscriberSourceSubscription.updateMany({
      where: {
        subscriberId: token.subscriberId,
        sourceId: { notIn: sourceIds },
        status: { in: ["active", "pending"] },
      },
      data: {
        status: "unsubscribed",
        unsubscribedAt: timestamp,
      },
    });
  });

  const refreshedManageToken = await ensureSubscriptionToken({
    subscriberId: token.subscriberId,
    type: "manage",
    expiresInDays: MANAGE_TOKEN_DAYS,
  });
  const unsubscribeToken = await ensureSubscriptionToken({
    subscriberId: token.subscriberId,
    type: "unsubscribe",
    expiresInDays: UNSUBSCRIBE_TOKEN_DAYS,
  });

  return {
    status: "success" as const,
    sourceNames: sources.map((source) => source.name),
    manageToken: refreshedManageToken.token,
    unsubscribeToken: unsubscribeToken.token,
  };
}

export async function createSourceSubmission(input: unknown) {
  const parsed = sourceSubmissionSchema.parse(input);
  return prisma.sourceSubmission.create({
    data: {
      siteName: parsed.siteName,
      siteUrl: parsed.siteUrl,
      description: parsed.description,
      contactEmail: parsed.contactEmail || null,
      requestedCategory: parsed.requestedCategory || null,
      status: "new",
    },
  });
}

export async function createFeedbackSubmission(input: unknown) {
  const parsed = feedbackSubmissionSchema.parse(input);
  return prisma.feedbackSubmission.create({
    data: {
      type: parsed.type,
      message: parsed.message,
      email: parsed.email || null,
      page: parsed.page || null,
      status: "new",
    },
  });
}
