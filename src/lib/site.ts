export type Site = {
  slug: string;
  name: string;
  url: string;
  description: string;
  published: boolean;
  isDefault?: boolean;
  embeddable?: boolean;
  embedCheckedAt?: string;
  embedReason?: string;
};

/** Strict home default: published + isDefault only. No fallback. */
export function getPublishedDefaultSite(sites: Site[]): Site | undefined {
  return sites.find((site) => site.published && site.isDefault);
}
