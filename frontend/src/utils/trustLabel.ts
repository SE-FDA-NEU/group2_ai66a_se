export type ShopTrustLabel = 'Trusted' | 'Risky: few ratings' | 'Needs caution';

export interface TrustLabelInput {
  shop_trust_label?: string | null;
  shop_rating?: number | string | null;
  shop_review_count?: number | string | null;
  product_rating?: number | string | null;
  review_count?: number | string | null;
}

/**
 * Computes shop trust label according to BR10:
 * - "Trusted" when >= 4.7★ and >= 500 ratings
 * - "Risky: few ratings" when < 4.3★ or < 50 ratings
 * - "Needs caution" in all other cases
 */
export function computeShopTrustLabel(
  rating?: number | string | null,
  reviewCount?: number | string | null,
  explicitLabel?: string | null
): ShopTrustLabel | null {
  if (explicitLabel) {
    const trimmed = explicitLabel.trim();
    if (trimmed === 'Trusted') return 'Trusted';
    if (trimmed === 'Risky: few ratings' || trimmed.toLowerCase().includes('risk')) {
      return 'Risky: few ratings';
    }
    if (trimmed === 'Needs caution' || trimmed.toLowerCase().includes('caution')) {
      return 'Needs caution';
    }
    return trimmed as ShopTrustLabel;
  }

  if (rating == null && reviewCount == null) {
    return null;
  }

  const numRating = rating != null ? parseFloat(String(rating)) : null;
  const numReviews = reviewCount != null ? parseInt(String(reviewCount), 10) : null;

  if (numRating === null || isNaN(numRating) || numReviews === null || isNaN(numReviews)) {
    if (numReviews !== null && !isNaN(numReviews) && numReviews < 50) {
      return 'Risky: few ratings';
    }
    if (numRating !== null && !isNaN(numRating) && numRating < 4.3) {
      return 'Risky: few ratings';
    }
    return null;
  }

  // BR10: Trusted when >= 4.7★ and >= 500 ratings
  if (numRating >= 4.7 && numReviews >= 500) {
    return 'Trusted';
  }

  // BR10: Risky when < 4.3★ or < 50 ratings
  if (numRating < 4.3 || numReviews < 50) {
    return 'Risky: few ratings';
  }

  // All other cases: Needs caution
  return 'Needs caution';
}

export function getProductTrustLabel(product?: TrustLabelInput | null): ShopTrustLabel | null {
  if (!product) return null;

  if (product.shop_trust_label) {
    return computeShopTrustLabel(null, null, product.shop_trust_label);
  }

  const rating = product.shop_rating ?? product.product_rating;
  const reviewCount = product.shop_review_count ?? product.review_count;

  return computeShopTrustLabel(rating, reviewCount);
}
