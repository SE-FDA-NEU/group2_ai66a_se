import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductRow } from '../components/ProductRow';
import {
  getWatchlist,
  addProductToWatchlist,
  removeProductFromWatchlist,
  WatchlistProduct,
} from '../api/watchlistApi';
import styles from './WatchlistPage.module.css';
import { convertToVnd, convertFromVnd, USD_TO_VND_RATE } from '../utils/currency';

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

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    try {
      localStorage.setItem(WATCHLIST_SORT_KEY, newSort);
    } catch {
      // In case localStorage is disabled
    }
  };
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // State cho Modal thêm sản phẩm
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [buyWhenGood, setBuyWhenGood] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsUnauthorized(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsUnauthorized(false);

    try {
      const data = await getWatchlist();
      setProducts(data.products || []);
    } catch (err: any) {
      console.error('Fetch watchlist error:', err);
      if (err.status === 401 || err.detail === 'Could not validate credentials') {
        setIsUnauthorized(true);
      } else {
        setError(err.message || err.detail || 'Không thể tải danh sách theo dõi từ máy chủ.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleRemove = async (id: string) => {
    try {
      await removeProductFromWatchlist(Number(id));
      setProducts((prev) => prev.filter((p) => String(p.id) !== id));
    } catch (err: any) {
      console.error('Remove product error:', err);
      alert(err.message || 'Không thể xóa sản phẩm. Vui lòng thử lại.');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setAddError('Vui lòng nhập đường dẫn (URL) sản phẩm.');
      return;
    }

    try {
      setIsSubmitting(true);
      setAddError(null);
      const newProd = await addProductToWatchlist({
        url: url.trim(),
        target_price: targetPrice
          ? convertFromVnd(Number(targetPrice), 'USD')
          : null,
        buy_when_good: buyWhenGood,
      });

      setProducts((prev) => [newProd, ...prev]);
      setIsAddModalOpen(false);
      setUrl('');
      setTargetPrice('');
      setBuyWhenGood(false);
    } catch (err: any) {
      console.error('Add product error:', err);
      setAddError(err.message || err.detail || 'Không thể thêm sản phẩm. Vui lòng kiểm tra đường dẫn.');
    } finally {
      setIsSubmitting(false);
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
          disabled={!isUnauthorized && products.length >= 10}
          onClick={() => {
            if (isUnauthorized) {
              navigate('/login');
            } else {
              setIsAddModalOpen(true);
            }
          }}
        >
          <span>+</span> Thêm sản phẩm
        </button>
      </header>

      {/* Thông báo nếu chưa đăng nhập */}
      {isUnauthorized && (
        <div className={styles.authNotice}>
          <span>
            ⚠️ Bạn chưa đăng nhập. Vui lòng đăng nhập để đồng bộ và quản lý danh sách sản phẩm thực tế từ hệ thống.
          </span>
          <button className={styles.authNoticeLink} onClick={() => navigate('/login')}>
            Đăng nhập ngay →
          </button>
        </div>
      )}

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
          ) : isUnauthorized ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateTitle}>Yêu cầu đăng nhập</div>
              <p>Hãy đăng nhập vào tài khoản của bạn để xem và quản lý danh sách theo dõi giá.</p>
              <button
                className={styles.addButton}
                style={{ margin: '16px auto' }}
                onClick={() => navigate('/login')}
              >
                Đăng nhập tài khoản
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
                priceLabel={product.price_label || undefined}
                isFakeDiscount={product.fake_discount}
                notEnoughData={!product.price_low || product.price_low === product.price_high}
                onRemove={handleRemove}
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

        {!isLoading && !error && !isUnauthorized && displayedProducts.length > 0 && (
          <div className={styles.itemCount}>
            Tổng cộng {displayedProducts.length} sản phẩm
          </div>
        )}
      </div>

      {/* Modal thêm sản phẩm mới */}
      {isAddModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAddModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Thêm sản phẩm cần theo dõi</h2>

            {addError && <div className={styles.errorMessage} role="alert">{addError}</div>}

            <form onSubmit={handleAddSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Đường dẫn sản phẩm (Amazon URL) *</label>
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
                <label className={styles.formLabel}>
                  Giá mục tiêu cảnh báo (VND, tùy chọn; 1 USD ≈ {USD_TO_VND_RATE.toLocaleString('vi-VN')} VND)
                </label>
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
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
                <button type="submit" className={styles.btnSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Đang thêm...' : 'Thêm vào danh sách'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
