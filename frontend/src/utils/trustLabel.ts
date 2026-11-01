export type ShopTrustLabel = 'Trusted' | 'Risky: few ratings' | 'Needs caution';

export interface TrustLabelInput {
  shop_trust_label?: string | null;
  shop_rating?: number | string | null;
  shop_review_count?: number | string | null;
  product_rating?: number | string | null;
  review_count?: number | string | null;
}

/**
 * Format price label to Vietnamese
 */
export function formatPriceLabel(label?: string | null): string {
  if (!label) return 'Chưa đủ dữ liệu đánh giá';
  const trimmed = label.trim().toLowerCase();
  if (trimmed === 'good price' || trimmed === 'giá tốt') return 'Giá tốt';
  if (
    trimmed === 'expensive - wait' ||
    trimmed === 'expensive' ||
    trimmed === 'giá cao' ||
    trimmed === 'giá đắt - nên chờ' ||
    trimmed === 'giá cao - nên chờ'
  ) {
    return 'Giá cao - nên chờ';
  }
  if (trimmed === 'normal' || trimmed === 'bình thường') return 'Bình thường';
  if (trimmed === 'not enough data to assess' || trimmed === 'chưa đủ dữ liệu đánh giá') {
    return 'Chưa đủ dữ liệu đánh giá';
  }
  return label;
}

/**
 * Format shop trust label to Vietnamese
 */
export function formatShopTrustDisplay(label?: string | null): string {
  if (!label) return '';
  const trimmed = label.trim();
  const lower = trimmed.toLowerCase();
  if (lower.includes('trusted') || lower.includes('đáng tin cậy')) return 'Đáng tin cậy';
  if (lower.includes('risk') || lower.includes('rủi ro')) return 'Rủi ro: ít đánh giá';
  if (lower.includes('caution') || lower.includes('thận trọng')) return 'Cần thận trọng';
  return trimmed;
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
    if (trimmed === 'Trusted' || trimmed === 'Đáng tin cậy') return 'Trusted';
    if (
      trimmed === 'Risky: few ratings' ||
      trimmed === 'Rủi ro: ít đánh giá' ||
      trimmed.toLowerCase().includes('risk') ||
      trimmed.toLowerCase().includes('rủi ro')
    ) {
      return 'Risky: few ratings';
    }
    if (
      trimmed === 'Needs caution' ||
      trimmed === 'Cần thận trọng' ||
      trimmed.toLowerCase().includes('caution') ||
      trimmed.toLowerCase().includes('thận trọng')
    ) {
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
