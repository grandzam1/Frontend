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
