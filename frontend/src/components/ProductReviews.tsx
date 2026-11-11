import { useEffect, useRef, useState } from 'react';
import { CustomerReview, getProductReviews, WatchlistProduct } from '../api/watchlistApi';
import { getSafeMarketplaceUrl } from '../utils/marketplace';
import styles from './ProductReviews.module.css';

/** Also accepts older cached product-details payloads during migration. */
export function normalizeReview(review: CustomerReview): CustomerReview {
  const raw = review as CustomerReview & Record<string, unknown>;
  const text = (...keys: string[]) => {
    const value = keys.map(key => raw[key]).find(value => typeof value === 'string' && value.trim());
    return typeof value === 'string' ? value : undefined;
  };
  const score = Number.parseFloat(String(raw.rating ?? raw.review_star_rating ?? ''));
  return {
    ...review,
    id: review.id ?? text('review_id'),
    author: text('author', 'reviewer', 'review_author'),
    title: text('title', 'review_title'),
    text: text('text', 'comment', 'body', 'content', 'review_comment'),
    rating: Number.isFinite(score) && score >= 1 && score <= 5 ? score : null,
    date: text('date', 'created_at', 'review_date_iso', 'review_date'),
    verified_purchase: raw.verified_purchase === true || raw.is_verified_purchase === true,
    variant: typeof raw.reviewed_product_variant === 'object' && raw.reviewed_product_variant
      ? Object.entries(raw.reviewed_product_variant).map(([key, value]) => `${key}: ${value}`).join(', ')
      : review.variant,
    images: review.images ?? (Array.isArray(raw.review_images) ? raw.review_images.filter((value): value is string => typeof value === 'string') : []),
    videos: review.videos ?? (Array.isArray(raw.review_videos) ? raw.review_videos : []) as CustomerReview['videos'],
    link: text('link', 'review_link'),
  };
}

export function ProductReviews({ product }: { product: WatchlistProduct }) {
  const initial = (product.reviews?.length ? product.reviews : product.top_reviews ?? []).map(normalizeReview);
  const [reviews, setReviews] = useState<CustomerReview[]>(initial.slice(0, 10));
  const [stars, setStars] = useState<number>();
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [source, setSource] = useState('');
  const generation = useRef(0);
  const busy = useRef(false);

  async function load(nextPage: number, filter: number | undefined, version: number) {
    busy.current = true;
    setLoading(true);
    setError(false);
    try {
      const result = await getProductReviews(product.id, nextPage, filter);
      if (version !== generation.current) return;
      const existingIds = new Set(nextPage > 1 ? reviews.filter(item => item.id != null).map(item => item.id) : []);
      const incoming = result.reviews.map(normalizeReview).filter(item => item.id == null || !existingIds.has(item.id));
      setReviews(previous => {
        if (nextPage === 1) return incoming;
        const ids = new Set(previous.filter(item => item.id != null).map(item => item.id));
        return [...previous, ...incoming.filter(item => item.id == null || !ids.has(item.id))];
      });
      setPage(nextPage);
      setHasMore(result.has_more && incoming.length > 0);
      setSource(result.source);
    } catch {
      if (version === generation.current) setError(true);
    } finally {
      if (version === generation.current) {
        busy.current = false;
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const version = ++generation.current;
    setPage(0);
    setHasMore(false);
    setSource('');
    setReviews(stars == null ? initial.slice(0, 10) : []);
    void load(1, stars, version);
    return () => { generation.current++; };
    // Product identity is handled by the parent's key. Filters start a new request generation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, stars]);

  return <section className={styles.section} data-testid="customer-reviews-section" aria-labelledby="reviews-title">
    <header className={styles.header}>
      <div><h2 id="reviews-title">Đánh giá từ khách hàng</h2><p>Trải nghiệm thực tế từ người mua sản phẩm</p></div>
      <div className={styles.summary} data-testid="reviews-summary">
        {product.product_rating != null && <strong data-testid="reviews-average-rating">{Number(product.product_rating).toFixed(1)} <span>/ 5</span></strong>}
        <span data-testid="reviews-total-ratings">{product.review_count.toLocaleString('en-US')} lượt đánh giá</span>
      </div>
    </header>
    <div className={styles.filters} role="group" aria-label="Lọc theo số sao">
      {[undefined, 5, 4, 3, 2, 1].map(value => <button key={value ?? 'all'} type="button" aria-pressed={stars === value} onClick={() => setStars(value)}>{value == null ? 'Tất cả' : `${value} sao`}</button>)}
    </div>
    {source === 'cached' && <p className={styles.note}>Đang hiển thị các đánh giá đã lưu. Tổng lượt đánh giá có thể bao gồm lượt chấm sao không có nội dung.</p>}
    <div aria-busy={loading} className={styles.list} data-testid="reviews-list">
      {reviews.map((review, index) => {
        const link = getSafeMarketplaceUrl(review.link);
        return <article key={review.id ?? index} className={styles.review} data-testid="review-card">
          <div className={styles.reviewHeader}><strong>{review.author || 'Khách hàng'}</strong>{review.rating != null && <span className={styles.rating} data-testid="review-rating" aria-label={`${review.rating} trên 5 sao`}>★ {review.rating}</span>}</div>
          <div className={styles.meta}>{review.date && <span>{review.date}</span>}{review.verified_purchase && <span className={styles.verified}>Đã mua hàng</span>}</div>
          {review.variant && <p className={styles.note}>{review.variant}</p>}
          {review.title && <h3>{review.title}</h3>}
          {review.text && <p className={styles.body}>{review.text}</p>}
          {!!review.images?.length && <div className={styles.media}>{review.images.filter(url => typeof url === 'string' && getSafeMarketplaceUrl(url)).map(url => <a key={url} href={url} target="_blank" rel="noopener noreferrer"><img loading="lazy" src={url} alt="Ảnh sản phẩm từ khách hàng" /></a>)}</div>}
          {!!review.videos?.length && <div className={styles.media}>{review.videos.map((video, i) => {
            const url = getSafeMarketplaceUrl(typeof video === 'string' ? video : video?.video_url ?? video?.url);
            return url ? <video key={i} controls preload="none" src={url} aria-label="Video sản phẩm từ khách hàng" style={{ maxWidth: '100%', width: 280 }} /> : null;
          })}</div>}
          <div className={styles.meta}>{review.helpful_votes != null && <span>{review.helpful_votes} người thấy hữu ích</span>}{link && <a href={link} target="_blank" rel="noopener noreferrer">Xem đánh giá gốc</a>}</div>
        </article>;
      })}
    </div>
    {loading && <p role="status" className={styles.note}>Đang tải đánh giá...</p>}
    {error && <div role="alert" className={styles.error}>Không thể tải đánh giá. <button type="button" onClick={() => { if (!busy.current) void load(page + 1, stars, generation.current); }}>Thử lại</button></div>}
    {!loading && !error && reviews.length === 0 && <p data-testid="empty-reviews" className={styles.empty}>{stars ? `Chưa có đánh giá ${stars} sao cho sản phẩm này.` : 'Chưa có đánh giá nào từ khách hàng cho sản phẩm này.'}</p>}
    {hasMore && <button type="button" className={styles.more} disabled={loading} onClick={() => { if (!busy.current) void load(page + 1, stars, generation.current); }}>Xem thêm đánh giá</button>}
    {!loading && !error && reviews.length > 0 && <p className={styles.note} aria-live="polite">Đã hiển thị {reviews.length} đánh giá{!hasMore ? ' · Đã hết đánh giá có sẵn' : ''}</p>}
  </section>;
}
