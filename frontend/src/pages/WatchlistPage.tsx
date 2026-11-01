import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertTriangle, ArrowUpDown, Plus, RotateCw, Search } from 'lucide-react';
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
import tokenStyles from './WatchlistPage.tokens.module.css';

const WATCHLIST_SORT_KEY = 'watchlist_sort';
const combinedStyles: Record<string, string> = { ...styles };
Object.entries(tokenStyles).forEach(([key, tokenClass]) => {
  combinedStyles[key] = `${combinedStyles[key] ?? ''} ${tokenClass}`.trim();
});

export const WatchlistPage: React.FC = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState<WatchlistProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
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
    <div className={combinedStyles.pageContainer}>
      <header className={combinedStyles.pageHeader}>
        <div>
          <h1 className={combinedStyles.headerTitle}>Danh sách theo dõi</h1>
          <p className={combinedStyles.headerDescription}>
            Theo dõi biến động giá và nhận thông báo khi có mức giá ưu đãi.
          </p>
        </div>
        <button
          className={combinedStyles.addButton}
          onClick={() => {
            if (products.length >= 10) {
              setLimitMessage('Bạn đã đạt giới hạn tối đa 10 sản phẩm theo dõi.');
              return;
            }
            setLimitMessage(null);
            setIsAddModalOpen(true);
          }}
          data-testid="btn-add-product"
        >
          <Plus size={16} aria-hidden="true" /> Thêm sản phẩm
        </button>
      </header>

      {limitMessage && (
        <div
          style={{
            backgroundColor: 'var(--status-warning-bg)',
            border: '1px solid var(--status-warning)',
            color: 'var(--status-warning)',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '14px',
            fontWeight: 500,
          }}
          role="alert"
          data-testid="limit-message"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{limitMessage}</span>
          </div>
          <button
            onClick={() => setLimitMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              padding: '2px 6px',
              fontSize: '18px',
              lineHeight: 1,
            }}
            aria-label="Đóng cảnh báo giới hạn"
          >
            ×
          </button>
        </div>
      )}

      <div className={combinedStyles.toolbar}>
        <div className={combinedStyles.toolbarLeft}>
          <button className={combinedStyles.toolbarBtn} onClick={fetchProducts}>
            <RotateCw size={16} aria-hidden="true" /> Làm mới
          </button>
        </div>
        <div className={combinedStyles.toolbarRight}>
          <div className={combinedStyles.sortContainer}>
            <ArrowUpDown className={combinedStyles.sortIcon} size={15} aria-hidden="true" />
            <select
              className={combinedStyles.sortSelect}
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
          <div className={combinedStyles.searchContainer}>
            <Search className={combinedStyles.searchIcon} size={16} aria-hidden="true" />
            <input
              type="text"
              className={combinedStyles.searchInput}
              placeholder="Tìm kiếm sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={combinedStyles.tableContainer}>
        <div className={combinedStyles.tableHeader}>
          <div>Sản phẩm</div>
          <div>Giá hiện tại</div>
          <div>Khoảng giá</div>
          <div>Đánh giá</div>
          <div>Nhãn giá</div>
          <div style={{ textAlign: 'center' }}>Thao tác</div>
        </div>

        <div className={combinedStyles.tableBody}>
          {isLoading ? (
            <div className={combinedStyles.emptyState} data-testid="watchlist-loading" style={{ padding: '36px 16px' }}>
              <div className={combinedStyles.spinner} aria-hidden="true" />
              <div className={combinedStyles.emptyStateTitle}>Đang tải danh sách theo dõi...</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 20px' }}>
                Hệ thống đang đồng bộ dữ liệu giá và trạng thái từ máy chủ, vui lòng chờ trong giây lát.
              </p>
              {/* Skeleton Placeholder Rows */}
              <div style={{ width: '100%', maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: '52px',
                      background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite',
                      borderRadius: '8px',
                      opacity: 0.8,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className={combinedStyles.emptyState}>
              <div className={combinedStyles.emptyStateTitle}>{error}</div>
              <button
                className={combinedStyles.toolbarBtn}
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
                shopTrustLabel={product.shop_trust_label ?? null}
                onRemove={handleRemove}
                isRemoving={removingProductId === String(product.id)}
                originalProduct={product}
                shopName={product.shop_name || undefined}
                shopTrustLabel={product.shop_trust_label || undefined}
                shopRating={product.shop_rating != null ? Number(product.shop_rating) : undefined}
                shopReviewCount={product.shop_review_count != null ? Number(product.shop_review_count) : undefined}
              />
            ))
          ) : (
            <div className={combinedStyles.emptyState}>
              <div className={combinedStyles.emptyStateTitle}>
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
          <div className={combinedStyles.itemCount}>
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
