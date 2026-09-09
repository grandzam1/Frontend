export type EmbedCheckResult = {
  url: string;
  embeddable: boolean;
  reason: string;
  checkedAt: string;
  xFrameOptions: string | null;
  contentSecurityPolicy: string | null;
};
