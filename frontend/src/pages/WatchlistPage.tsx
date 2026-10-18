import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductRow } from '../components/ProductRow';
import { AddProductModal } from '../components/AddProductModal';
import {
  getWatchlist,
  removeProductFromWatchlist,
  WatchlistProduct,
} from '../api/watchlistApi';
import styles from './WatchlistPage.module.css';
import { convertToVnd } from '../utils/currency';

export type SortOption = 'default' | 'price_asc' | 'price_desc';

const WATCHLIST_SORT_KEY = 'watchlist_sort';

export const WatchlistPage: React.FC = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState<WatchlistProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_SORT_KEY) as SortOption | null;
      if (saved === 'price_asc' || saved === 'price_desc' || saved === 'default') {
        return saved;
      }
    } catch {
      // In case localStorage is disabled
    }
    return 'default';
  });
  const [isLoading, setIsLoading] = useState(true);
  const [removingProductId, setRemovingProductId] = useState<string | null>(null);

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    try {
      localStorage.setItem(WATCHLIST_SORT_KEY, newSort);
    } catch {
      // In case localStorage is disabled
    }
  };
  const [error, setError] = useState<string | null>(null);

  // State cho Modal thêm sản phẩm
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getWatchlist();
      setProducts(data.products || []);
    } catch (err: any) {
      console.error('Fetch watchlist error:', err);
      if (err.status === 401 || err.detail === 'Could not validate credentials') {
        navigate('/login', { replace: true });
        return;
      }
      setError(err.message || err.detail || 'Không thể tải danh sách theo dõi từ máy chủ.');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleRemove = async (id: string) => {
    if (removingProductId !== null) return;

    const product = products.find((item) => String(item.id) === id);
    const productName = product?.name ?? 'sản phẩm này';
    if (!window.confirm(`Bạn có chắc muốn ngừng theo dõi "${productName}"?`)) return;

    setRemovingProductId(id);
    try {
      await removeProductFromWatchlist(Number(id));
      setProducts((prev) => prev.filter((p) => String(p.id) !== id));
    } catch (err: any) {
      console.error('Remove product error:', err);
      alert(err.message || 'Không thể xóa sản phẩm. Vui lòng thử lại.');
    } finally {
      setRemovingProductId(null);
    }
  };

  const displayedProducts = useMemo(() => {
    let result = products.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortBy === 'price_asc') {
      result = [...result].sort((a, b) => {
        const priceA = convertToVnd(Number(a.current_price) || 0, a.currency || 'VND');
        const priceB = convertToVnd(Number(b.current_price) || 0, b.currency || 'VND');
        return priceA - priceB;
      });
    } else if (sortBy === 'price_desc') {
      result = [...result].sort((a, b) => {
        const priceA = convertToVnd(Number(a.current_price) || 0, a.currency || 'VND');
        const priceB = convertToVnd(Number(b.current_price) || 0, b.currency || 'VND');
        return priceB - priceA;
      });
    }

    return result;
  }, [products, searchQuery, sortBy]);

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.headerTitle}>Danh sách theo dõi</h1>
          <p className={styles.headerDescription}>
            Theo dõi biến động giá và nhận thông báo khi có mức giá ưu đãi.
          </p>
        </div>
        <button
          className={styles.addButton}
          disabled={products.length >= 10}
          onClick={() => setIsAddModalOpen(true)}
        >
          <span>+</span> Thêm sản phẩm
        </button>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button className={styles.toolbarBtn} onClick={fetchProducts}>
            <span className="icon">↻</span> Làm mới
          </button>
        </div>
        <div className={styles.toolbarRight}>
          <div className={styles.sortContainer}>
            <span className={styles.sortIcon}>⇅</span>
            <select
              className={styles.sortSelect}
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as SortOption)}
              aria-label="Sắp xếp sản phẩm"
              data-testid="sort-select"
            >
              <option value="default">Sắp xếp: Mặc định</option>
              <option value="price_asc">Giá: Thấp đến cao</option>
              <option value="price_desc">Giá: Cao đến thấp</option>
            </select>
          </div>
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
          {isLoading ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateTitle}>Đang tải dữ liệu từ máy chủ...</div>
            </div>
          ) : error ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateTitle}>{error}</div>
              <button
                className={styles.toolbarBtn}
                style={{ margin: '12px auto' }}
                onClick={fetchProducts}
              >
                Thử lại
              </button>
            </div>
          ) : displayedProducts.length > 0 ? (
            displayedProducts.map((product) => (
              <ProductRow
                key={product.id}
                id={String(product.id)}
                name={product.name}
                image={product.image_url}
                currentPrice={Number(product.current_price)}
                currency={product.currency}
                priceLow={product.price_low ? Number(product.price_low) : undefined}
                priceHigh={product.price_high ? Number(product.price_high) : undefined}
                starRating={product.product_rating ? Number(product.product_rating) : undefined}
                targetPrice={product.target_price != null ? Number(product.target_price) : null}
                priceLabel={product.price_label || undefined}
                isFakeDiscount={product.fake_discount}
                notEnoughData={product.price_label === 'Not enough data to assess'}
                onRemove={handleRemove}
                isRemoving={removingProductId === String(product.id)}
                originalProduct={product}
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
                  ? 'Vui lòng thử từ khóa khác hoặc xóa bộ lọc tìm kiếm.'
                  : 'Bấm nút "+ Thêm sản phẩm" phía trên để bắt đầu theo dõi biến động giá.'}
              </p>
            </div>
          )}
        </div>

        {!isLoading && !error && displayedProducts.length > 0 && (
          <div className={styles.itemCount}>
            Tổng cộng {displayedProducts.length} sản phẩm
          </div>
        )}
      </div>

      {/* Modal thêm sản phẩm mới */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(newProd) => setProducts((prev) => [newProd, ...prev])}
      />
    </div>
  );
};
