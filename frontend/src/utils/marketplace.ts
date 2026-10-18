/** Return marketplace links only when they use a safe external web protocol. */
export const getSafeMarketplaceUrl = (value?: string | null): string | undefined => {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};
