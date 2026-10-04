import React, { useState } from 'react';
import { ProductRow } from '../components/ProductRow';
import styles from './WatchlistPage.module.css';

export interface MockProductItem {
  id: string;
  name: string;
  image: string;
  currentPrice: number;
  priceLow?: number;
  priceHigh?: number;
  starRating?: number;
  priceLabel?: string;
  isFakeDiscount?: boolean;
  notEnoughData?: boolean;
}

// Dữ liệu mock tĩnh cho giao diện Watchlist
const initialMockProducts: MockProductItem[] = [
  {
    id: "1",
    name: "Nikon D3200",
    image: "https://picsum.photos/seed/nikon/200/200",
    currentPrice: 8500000,
    priceLow: 8000000,
    priceHigh: 9000000,
    starRating: 4.8,
    priceLabel: "Giá tốt",
  },
  {
    id: "2",
    name: "Macbook Pro 14\" (2023)",
    image: "https://picsum.photos/seed/macbook/200/200",
    currentPrice: 45000000,
    priceLow: 44000000,
    priceHigh: 48000000,
    starRating: 4.9,
    priceLabel: "Trung bình",
  },
  {
    id: "3",
    name: "Tascam DR-40X",
    image: "https://picsum.photos/seed/tascam/200/200",
    currentPrice: 4200000,
    priceLow: 4000000,
    priceHigh: 4500000,
    starRating: 4.5,
    isFakeDiscount: true,
  },
  {
    id: "4",
    name: "Dell UltraSharp U2720Q",
    image: "https://picsum.photos/seed/dell/200/200",
    currentPrice: 12500000,
    priceLow: 12000000,
    priceHigh: 13000000,
    starRating: 4.7,
    priceLabel: "Giá tốt",
  },
  {
    id: "5",
    name: "RED Digital Cinema KOMODO",
    image: "https://picsum.photos/seed/red/200/200",
    currentPrice: 150000000,
    notEnoughData: true,
  },
];

export const WatchlistPage: React.FC = () => {
  const [products, setProducts] = useState(initialMockProducts);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State cho Modal form thêm sản phẩm (Task 79)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [buyWhenGood, setBuyWhenGood] = useState(false);

  // Xóa sản phẩm khỏi danh sách (UI state)
  const handleRemove = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // Thêm sản phẩm mới qua Modal form (UI tĩnh)
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    // Giả lập tên sản phẩm từ URL hoặc tạo mock item
    let productName = "Sản phẩm mới theo dõi";
    try {
      const parsedUrl = new URL(url);
      const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
      if (pathSegments.length > 0 && pathSegments[0] !== 'dp') {
        productName = decodeURIComponent(pathSegments[0].replace(/-/g, ' '));
      }
    } catch {
      productName = "Sản phẩm mới theo dõi";
    }

    const priceValue = targetPrice ? Number(targetPrice) : 2500000;

    const newProduct = {
      id: String(Date.now()),
      name: productName,
      image: "https://picsum.photos/seed/" + Date.now() + "/200/200",
      currentPrice: priceValue,
      priceLow: priceValue * 0.95,
      priceHigh: priceValue * 1.1,
      starRating: 4.8,
      priceLabel: buyWhenGood ? "Giá tốt" : undefined,
    };

    setProducts([newProduct, ...products]);
    setIsAddModalOpen(false);
    setUrl('');
    setTargetPrice('');
    setBuyWhenGood(false);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.headerTitle}>Danh sách theo dõi</h1>
          <p className={styles.headerDescription}>
            Theo dõi biến động giá và tìm thời điểm mua phù hợp.
          </p>
        </div>
        {/* Nút cộng (+) thêm sản phẩm - Task 79 */}
        <button
          className={styles.addButton}
          onClick={() => setIsAddModalOpen(true)}
        >
          <span>+</span> Thêm sản phẩm
        </button>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button className={styles.toolbarBtn}>
            <span className="icon">≡</span> Lọc
          </button>
          <button className={styles.toolbarBtn}>
            <span className="icon">⇅</span> Sắp xếp
          </button>
        </div>
        <div className={styles.toolbarRight}>
          <div className={styles.searchContainer}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm kiếm sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <div>Sản phẩm</div>
          <div>Giá hiện tại</div>
          <div>Khoảng giá</div>
          <div>Đánh giá</div>
          <div>Nhãn giá</div>
          <div style={{ textAlign: 'center' }}>Thao tác</div>
        </div>

        <div className={styles.tableBody}>
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <ProductRow
                key={product.id}
                {...product}
                onRemove={handleRemove}
              />
            ))
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateTitle}>
                {searchQuery
                  ? 'Không tìm thấy sản phẩm'
                  : 'Bạn chưa có sản phẩm nào trong danh sách theo dõi.'}
              </div>
              <p>
                {searchQuery
                  ? 'Vui lòng thử từ khóa khác hoặc xóa bộ lọc.'
                  : 'Bấm nút "+ Thêm sản phẩm" phía trên để bắt đầu theo dõi biến động giá.'}
              </p>
            </div>
          )}
        </div>

        {filteredProducts.length > 0 && (
          <div className={styles.itemCount}>
            Tổng cộng {filteredProducts.length} sản phẩm
          </div>
        )}
      </div>

      {/* Modal Form Thêm Sản Phẩm - Task 79 */}
      {isAddModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAddModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Thêm sản phẩm cần theo dõi</h2>

            <form onSubmit={handleAddSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Đường dẫn sản phẩm (URL) *</label>
                <input
                  type="url"
                  required
                  placeholder="https://www.amazon.com/dp/..."
                  className={styles.formInput}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Giá mục tiêu cảnh báo (tùy chọn)</label>
                <input
                  type="number"
                  placeholder="Ví dụ: 1500000"
                  className={styles.formInput}
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                />
              </div>

              <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="buyWhenGood"
                  checked={buyWhenGood}
                  onChange={(e) => setBuyWhenGood(e.target.checked)}
                />
                <label htmlFor="buyWhenGood" className={styles.formLabel} style={{ margin: 0, cursor: 'pointer' }}>
                  Cảnh báo khi giá ở mức tốt
                </label>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className={styles.btnSubmit}>
                  Thêm vào danh sách
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
