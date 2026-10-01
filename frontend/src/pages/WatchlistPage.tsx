import React, { useState, useEffect } from 'react';
import { ProductRow } from '../components/ProductRow';
import styles from './WatchlistPage.module.css';

// Mock data (có thể được thay thế bằng dữ liệu lấy từ API sau này)
const mockProducts = [
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
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Giả lập gọi API
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        // Tạm thời dùng mockProducts
        setTimeout(() => {
          setProducts(mockProducts);
          setIsLoading(false);
        }, 500);
      } catch (err) {
        setError('Đã xảy ra lỗi. Vui lòng thử lại.');
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleRemove = (id: string) => {
    // Gọi API DELETE /watchlist/{product_id} ở đây
    setProducts(products.filter(p => p.id !== id));
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.headerTitle}>Danh sách theo dõi</h1>
          <p className={styles.headerDescription}>Theo dõi biến động giá và tìm thời điểm mua phù hợp.</p>
        </div>
        <button className={styles.addButton}>
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
            <span className={styles.searchIcon}>[]</span>
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
          {isLoading ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateTitle}>Đang tải dữ liệu...</div>
            </div>
          ) : error ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateTitle}>{error}</div>
              <button
                className={styles.toolbarBtn}
                style={{ margin: '12px auto' }}
                onClick={() => window.location.reload()}
              >
                Thử lại
              </button>
            </div>
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map(product => (
              <ProductRow
                key={product.id}
                {...product}
                onRemove={handleRemove}
              />
            ))
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateTitle}>
                {searchQuery ? 'Không tìm thấy sản phẩm' : 'Bạn chưa có sản phẩm nào trong danh sách theo dõi.'}
              </div>
              <p>
                {searchQuery ? 'Vui lòng thử từ khóa khác hoặc xóa bộ lọc.' : 'Thêm sản phẩm để bắt đầu theo dõi biến động giá.'}
              </p>
            </div>
          )}
        </div>

        {!isLoading && !error && filteredProducts.length > 0 && (
          <div className={styles.itemCount}>
            Tổng cộng {filteredProducts.length} sản phẩm
          </div>
        )}
      </div>
    </div>
  );
};
