const fallbackName = "ContributionPulse";
const fallbackSlug = "contribution-pulse";

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME?.trim() || fallbackName;

export const APP_SLUG =
  process.env.NEXT_PUBLIC_APP_SLUG?.trim() ||
  APP_NAME.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") ||
  fallbackSlug;
