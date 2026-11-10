import { useState } from 'react';
import { DetailedProduct, ProductValue, WatchlistProduct } from '../api/watchlistApi';
import { getSafeMarketplaceUrl } from '../utils/marketplace';
import styles from './ProductInformation.module.css';

/** Parse provider HTML in an inert document; render only text through React. */
export function productText(value: string): string {
  const doc = new DOMParser().parseFromString(value, 'text/html');
  doc.querySelectorAll('script, style, iframe, object').forEach(node => node.remove());
  doc.querySelectorAll('br').forEach(node => node.replaceWith('\n'));
  doc.querySelectorAll('p, div, li, h1, h2, h3').forEach(node => node.append('\n'));
  return doc.body.textContent?.trim() ?? '';
}

const labels: Record<string, string> = {
  asin: 'ASIN', country: 'Thị trường', currency: 'Đơn vị tiền tệ gốc',
  product_description: 'Mô tả sản phẩm', about_product: 'Điểm nổi bật',
  product_details: 'Thông số kỹ thuật', product_information: 'Thông tin sản phẩm',
  product_variations: 'Các phiên bản', product_variation: 'Phiên bản hiện tại',
  product_availability: 'Tình trạng trên sàn', main_buy_box: 'Thông tin mua hàng',
  important_information: 'Thông tin quan trọng', delivery: 'Giao hàng',
  product_delivery: 'Giao hàng', delivery_price: 'Phí giao hàng',
  seller: 'Người bán', seller_link: 'Trang người bán', ships_from: 'Đơn vị gửi hàng',
  return_policy: 'Chính sách đổi trả', price: 'Giá trên sàn',
  product_byline: 'Thương hiệu trên sàn', product_byline_link: 'Trang thương hiệu',
  product_byline_links: 'Liên kết thương hiệu', sales_volume: 'Lượt mua',
  is_prime: 'Prime', is_best_seller: 'Bán chạy', is_amazon_choice: 'Amazon’s Choice',
  rating_distribution: 'Phân bố đánh giá (%)', customers_say: 'Tổng hợp ý kiến khách hàng',
  best_sellers_rank: 'Xếp hạng bán chạy', product_num_offers: 'Số ưu đãi',
  product_offers_link: 'Các ưu đãi', product_minimum_offer_price: 'Giá ưu đãi thấp nhất',
  maximum_order_quantity: 'Số lượng đặt tối đa', product_dimensions: 'Kích thước',
};
const label = (key: string) => labels[key] ?? key.replace(/_/g, ' ').replace(/^./, char => char.toUpperCase());
const hasValue = (value: ProductValue | undefined): value is ProductValue => value !== undefined && value !== null && value !== '' && (typeof value !== 'object' || Object.keys(value).length > 0);

function Value({ value }: { value: ProductValue }) {
  if (value === null) return null;
  if (typeof value === 'boolean') return <span>{value ? 'Có' : 'Không'}</span>;
  if (typeof value === 'number') return <span>{value.toLocaleString('vi-VN')}</span>;
  if (typeof value === 'string') {
    const url = /^https?:\/\//i.test(value.trim()) ? getSafeMarketplaceUrl(value.trim()) : undefined;
    return url ? <a href={url} target="_blank" rel="noopener noreferrer">{value}</a> : <span className={styles.text}>{productText(value)}</span>;
  }
  if (Array.isArray(value)) return <ul className={styles.items}>{value.filter(hasValue).map((item, i) => <li key={i}><Value value={item} /></li>)}</ul>;
  return <dl className={styles.facts}>{Object.entries(value).filter(([, item]) => hasValue(item)).map(([key, item]) => <div key={key}><dt>{label(key)}</dt><dd><Value value={item} /></dd></div>)}</dl>;
}

interface GalleryProps { product: WatchlistProduct; detail?: DetailedProduct }
export function ProductGallery({ product, detail }: GalleryProps) {
  const [selected, setSelected] = useState(0);
  const rawPhotos = detail?.details.product_photos;
  const labeled = detail?.details.product_photos_labeled;
  const photos = [...new Set([product.image_url,
    ...(Array.isArray(rawPhotos) ? rawPhotos.filter((item): item is string => typeof item === 'string') : []),
    ...(Array.isArray(labeled) ? labeled.map(item => item && typeof item === 'object' && !Array.isArray(item) ? item.url : null).filter((item): item is string => typeof item === 'string') : []),
  ].filter(url => getSafeMarketplaceUrl(url)))];
  const current = photos[selected] ?? photos[0];
  return <div className={styles.gallery}>
    {current ? <a href={current} target="_blank" rel="noopener noreferrer" aria-label="Mở ảnh sản phẩm kích thước đầy đủ"><img className={styles.mainImage} src={current} alt={product.name} /></a> : <p className={styles.note}>Chưa có ảnh sản phẩm.</p>}
    {photos.length > 1 && <div className={styles.thumbnails} role="group" aria-label="Ảnh sản phẩm">{photos.map((url, i) => <button key={url} type="button" aria-label={`Xem ảnh ${i + 1}`} aria-pressed={current === url} onClick={() => setSelected(i)}><img src={url} alt={`Ảnh sản phẩm ${i + 1}`} loading="lazy" /></button>)}</div>}
  </div>;
}

interface InformationProps { detail?: DetailedProduct; loading: boolean; error: string | null; onRefresh: () => void }
export function ProductInformation({ detail, loading, error, onRefresh }: InformationProps) {
  const data = detail?.details ?? {};
  const groups = ['about_product', 'product_description', 'product_details', 'product_information', 'product_variations', 'product_variation', 'main_buy_box', 'important_information'];
  const handled = new Set([...groups, 'product_photos', 'product_photos_labeled', 'product_videos']);
  const remaining = Object.fromEntries(Object.entries(data).filter(([key, value]) => !handled.has(key) && hasValue(value)));
  const videos = Array.isArray(data.product_videos) ? data.product_videos : [];
  const updatedAt = detail?.details_updated_at ? new Date(detail.details_updated_at) : null;
  return <section className={styles.section} aria-labelledby="product-information-title" aria-busy={loading}>
    <header className={styles.header}>
      <div><h2 id="product-information-title">Chi tiết sản phẩm</h2>{updatedAt && !Number.isNaN(updatedAt.getTime()) && <p className={styles.note}>Cập nhật: {updatedAt.toLocaleString('vi-VN')}</p>}</div>
      <button type="button" disabled={loading} onClick={onRefresh}>{loading ? 'Đang tải...' : 'Cập nhật thông tin'}</button>
    </header>
    {loading && <p role="status" className={styles.note}>Đang tải thông tin chi tiết...</p>}
    {(error || detail?.details_refresh_failed) && <div role="alert" className={styles.error}>Không thể cập nhật thông tin chi tiết. Thông tin đã lưu vẫn được hiển thị. Vui lòng thử cập nhật lại.</div>}
    {detail?.is_demo && <p className={styles.notice}>Dữ liệu minh họa dùng cho phát triển, không phải thông tin trực tiếp từ nhà bán hàng.</p>}
    {!loading && !error && Object.keys(data).length === 0 && <p className={styles.note}>Chưa có thông tin chi tiết từ nhà bán hàng. Bạn có thể thử cập nhật hoặc xem trang bán hàng.</p>}
    {hasValue(data.currency) && <p className={styles.note}>Các giá trị trong thông tin nhà bán hàng giữ nguyên đơn vị tiền tệ gốc: <Value value={data.currency} />.</p>}
    {groups.filter(key => hasValue(data[key])).map(key => <section key={key} className={styles.group}><h3>{label(key)}</h3><Value value={data[key]} /></section>)}
    {videos.length > 0 && <section className={styles.group}><h3>Video sản phẩm</h3><div className={styles.videos}>{videos.map((item, i) => {
      const record = item && typeof item === 'object' && !Array.isArray(item) ? item : {};
      const rawUrl = typeof item === 'string' ? item : record.video_url ?? record.url;
      const url = typeof rawUrl === 'string' ? getSafeMarketplaceUrl(rawUrl) : undefined;
      const title = typeof record.title === 'string' ? productText(record.title) : `Video sản phẩm ${i + 1}`;
      return url ? <figure key={i}><video controls preload="none" src={url} aria-label={title} /><figcaption>{title}</figcaption></figure> : <Value key={i} value={item} />;
    })}</div></section>}
    {Object.keys(remaining).length > 0 && <section className={styles.group}><h3>Thông tin bổ sung từ nhà bán hàng</h3><Value value={remaining} /></section>}
  </section>;
}
