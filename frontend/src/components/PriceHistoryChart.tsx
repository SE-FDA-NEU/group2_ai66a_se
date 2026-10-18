import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { AlertTriangle, TrendingUp, ArrowDown, ArrowUp } from 'lucide-react';
import { getPriceHistory, PriceHistoryResponse } from '../api/watchlistApi';
import { formatVnd } from '../utils/currency';
import styles from './PriceHistoryChart.module.css';

export interface PriceHistoryChartProps {
  productId: number;
  currency?: string;
  requiredTrackedDaysThreshold?: number;
}

interface ChartItem {
  timestamp: string;
  displayTime: string;
  fullTime: string;
  price: number;
  is_gap: boolean;
  isMin: boolean;
  isMax: boolean;
}

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  productId,
  currency = 'VND',
  requiredTrackedDaysThreshold = 7,
}) => {
  const [days, setDays] = useState<number>(7);
  const [data, setData] = useState<PriceHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getPriceHistory(productId, days);
      setData(response);
    } catch (err: any) {
      console.error('Failed to fetch price history', err);
      setError(err?.detail || err?.message || 'Không thể tải lịch sử giá');
    } finally {
      setIsLoading(false);
    }
  }, [productId, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const minPrice = useMemo(() => {
    if (data?.min_price == null) return null;
    return Number(data.min_price);
  }, [data?.min_price]);

  const maxPrice = useMemo(() => {
    if (data?.max_price == null) return null;
    return Number(data.max_price);
  }, [data?.max_price]);

  const chartData: ChartItem[] = useMemo(() => {
    if (!data?.data_points || data.data_points.length === 0) return [];

    return data.data_points.map((pt) => {
      const date = new Date(pt.timestamp);
      const numPrice = Number(pt.price);

      // Định dạng ngày/giờ hiển thị trục X
      const displayTime =
        days <= 1
          ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          : `${date.getDate()}/${date.getMonth() + 1}`;

      const fullTime = `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;

      return {
        timestamp: pt.timestamp,
        displayTime,
        fullTime,
        price: numPrice,
        is_gap: Boolean(pt.is_gap),
        isMin: minPrice !== null && numPrice === minPrice,
        isMax: maxPrice !== null && numPrice === maxPrice,
      };
    });
  }, [data?.data_points, days, minPrice, maxPrice]);

  const latestPrice = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;
    return chartData[chartData.length - 1].price;
  }, [chartData]);

  // Y-axis tick formatter: rút gọn số để tránh tràn màn hình mobile (375px)
  const formatYAxisTick = (val: number): string => {
    if (currency.toUpperCase() === 'VND') {
      if (val >= 1_000_000) {
        return `${(val / 1_000_000).toFixed(val % 1_000_000 === 0 ? 0 : 1)}tr`;
      }
      if (val >= 1_000) {
        return `${(val / 1_000).toFixed(0)}k`;
      }
      return String(val);
    }
    return `$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`;
  };

  // Custom Tooltip
  const renderCustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item: ChartItem = payload[0].payload;

    return (
      <div className={styles.customTooltip}>
        <div className={styles.tooltipTime}>{item.fullTime}</div>
        <div className={styles.tooltipPrice}>{formatVnd(item.price, currency)}</div>
        {item.isMin && (
          <span className={`${styles.tooltipTag} ${styles.tagLowest}`}>Giá thấp nhất</span>
        )}
        {item.isMax && (
          <span className={`${styles.tooltipTag} ${styles.tagHighest}`}>Giá cao nhất</span>
        )}
        {item.is_gap && (
          <div className={styles.tooltipGap}>
            <AlertTriangle size={12} /> Khoảng cách dữ liệu &gt; 30 phút
          </div>
        )}
      </div>
    );
  };

  // 1. Trạng thái Đang tải (Loading)
  if (isLoading) {
    return (
      <div className={styles.chartCard} data-testid="chart-loading">
        <div className={styles.stateContainer}>
          <div className={styles.spinner} aria-hidden="true" />
          <span>Đang tải lịch sử giá...</span>
        </div>
      </div>
    );
  }

  // 2. Trạng thái Lỗi (Error)
  if (error) {
    return (
      <div className={styles.chartCard} data-testid="chart-error">
        <div className={styles.stateContainer}>
          <AlertTriangle size={28} color="var(--status-error)" aria-hidden="true" />
          <span className={styles.errorText}>{error}</span>
          <button className={styles.btnRetry} onClick={fetchData}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // 3. Trạng thái Không có dữ liệu (Empty State)
  if (!chartData || chartData.length === 0) {
    return (
      <div className={styles.chartCard} data-testid="chart-empty">
        <div className={styles.header}>
          <h3 className={styles.chartTitle}>
            <TrendingUp size={18} aria-hidden="true" /> Lịch sử biến động giá
          </h3>
        </div>
        {data && data.tracked_days < requiredTrackedDaysThreshold && (
          <div className={styles.warningBanner} data-testid="warning-banner">
            <AlertTriangle size={16} className={styles.warningIcon} aria-hidden="true" />
            <div className={styles.warningText}>
              <strong>Chỉ mới có {data.tracked_days} ngày dữ liệu theo dõi.</strong> Cần ít nhất{' '}
              {requiredTrackedDaysThreshold} ngày để biểu đồ hiển thị xu hướng đầy đủ.
            </div>
          </div>
        )}
        <div className={styles.stateContainer}>
          <div className={styles.emptyTitle}>Chưa có dữ liệu biến động giá</div>
          <span>Hệ thống đang tiếp tục ghi nhận giá của sản phẩm này.</span>
        </div>
      </div>
    );
  }

  const showWarning = data ? data.tracked_days < requiredTrackedDaysThreshold : false;

  // Tính miền Y-axis để biểu đồ có khoảng thở (padding) phía trên và dưới
  const yDomainMin = minPrice !== null ? Math.floor(minPrice * 0.98) : 'auto';
  const yDomainMax = maxPrice !== null ? Math.ceil(maxPrice * 1.02) : 'auto';

  return (
    <div className={styles.chartCard} data-testid="price-history-chart">
      {/* Header và Nút chuyển đổi khoảng thời gian */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 className={styles.chartTitle}>
            <TrendingUp size={18} aria-hidden="true" /> Lịch sử biến động giá
          </h3>
        </div>
        <div className={styles.rangeButtons} role="group" aria-label="Khoảng thời gian">
          <button
            type="button"
            className={`${styles.rangeButton} ${days === 7 ? styles.rangeButtonActive : ''}`}
            onClick={() => setDays(7)}
          >
            7 ngày
          </button>
          <button
            type="button"
            className={`${styles.rangeButton} ${days === 14 ? styles.rangeButtonActive : ''}`}
            onClick={() => setDays(14)}
          >
            14 ngày
          </button>
          <button
            type="button"
            className={`${styles.rangeButton} ${days === 30 ? styles.rangeButtonActive : ''}`}
            onClick={() => setDays(30)}
          >
            30 ngày
          </button>
        </div>
      </div>

      {/* Cảnh báo khi tracked_days < 7 */}
      {showWarning && data && (
        <div className={styles.warningBanner} data-testid="warning-banner">
          <AlertTriangle size={16} className={styles.warningIcon} aria-hidden="true" />
          <div className={styles.warningText}>
            <strong>Chỉ mới có {data.tracked_days} ngày dữ liệu theo dõi.</strong> Cần ít nhất{' '}
            {requiredTrackedDaysThreshold} ngày để biểu đồ hiển thị xu hướng đầy đủ.
          </div>
        </div>
      )}

      {/* Tóm tắt Milestones: Thấp nhất, Cao nhất, Hiện tại */}
      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>
            <ArrowDown size={14} color="var(--status-success)" aria-hidden="true" /> Thấp nhất
          </span>
          <span
            className={`${styles.statValue} ${styles.statValueLowest}`}
            data-testid="stat-min-price"
          >
            {minPrice !== null ? formatVnd(minPrice, currency) : '--'}
          </span>
        </div>

        <div className={styles.statItem}>
          <span className={styles.statLabel}>
            <ArrowUp size={14} color="var(--status-error)" aria-hidden="true" /> Cao nhất
          </span>
          <span
            className={`${styles.statValue} ${styles.statValueHighest}`}
            data-testid="stat-max-price"
          >
            {maxPrice !== null ? formatVnd(maxPrice, currency) : '--'}
          </span>
        </div>

        <div className={styles.statItem}>
          <span className={styles.statLabel}>Hiện tại</span>
          <span className={styles.statValue} data-testid="stat-latest-price">
            {latestPrice !== null ? formatVnd(latestPrice, currency) : '--'}
          </span>
        </div>
      </div>

      {/* Biểu đồ Recharts */}
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
          <LineChart data={chartData} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
            <XAxis
              dataKey="displayTime"
              tickLine={false}
              axisLine={{ stroke: 'var(--border-color)' }}
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            />
            <YAxis
              domain={[yDomainMin, yDomainMax]}
              tickFormatter={formatYAxisTick}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              width={50}
            />
            <Tooltip content={renderCustomTooltip} />

            {/* Mốc giá thấp nhất */}
            {minPrice !== null && (
              <ReferenceLine
                y={minPrice}
                stroke="var(--status-success)"
                strokeDasharray="4 4"
                label={{
                  value: 'Thấp nhất',
                  position: 'insideBottomRight',
                  fill: 'var(--status-success)',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            )}

            {/* Mốc giá cao nhất */}
            {maxPrice !== null && (
              <ReferenceLine
                y={maxPrice}
                stroke="var(--status-error)"
                strokeDasharray="4 4"
                label={{
                  value: 'Cao nhất',
                  position: 'insideTopRight',
                  fill: 'var(--status-error)',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            )}

            <Line
              type="monotone"
              dataKey="price"
              stroke="var(--primary-color)"
              strokeWidth={2}
              dot={{ r: 2.5, fill: 'var(--primary-color)' }}
              activeDot={{ r: 5, fill: 'var(--primary-color)', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PriceHistoryChart;
