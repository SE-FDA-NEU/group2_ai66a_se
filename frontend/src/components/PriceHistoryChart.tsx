import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  CartesianGrid,
} from 'recharts';
import { AlertTriangle, TrendingUp, ArrowDown, ArrowUp } from 'lucide-react';
import { getPriceHistory, PriceHistoryResponse } from '../api/watchlistApi';
import { formatVnd, convertToVnd } from '../utils/currency';
import styles from './PriceHistoryChart.module.css';

export interface PriceHistoryChartProps {
  productId: number;
  currency?: string;
  requiredTrackedDaysThreshold?: number;
}

export interface ChartItem {
  chartKey: string;
  timestamp: string;
  displayTime: string;
  fullTime: string;
  price: number | null;
  solidPrice: number | null;
  gapPrice: number | null;
  is_gap: boolean;
  isGapArea: boolean;
  gapTimeRange?: string;
  isMin: boolean;
  isMax: boolean;
}

export interface GapArea {
  startKey: string;
  endKey: string;
  gapTimeRange: string;
}

/**
 * Format tooltip display string for normal data points:
 * "<Price>đ – <DD/MM> HH:MM" (e.g., 239,000đ – 18/09 14:00)
 */
export const formatTooltipDisplay = (
  price: number,
  timestamp: string | Date,
  currency: string = 'VND'
): string => {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  const vndAmount = Math.round(convertToVnd(price, currency));
  const formattedPrice = vndAmount.toLocaleString('en-US');

  return `${formattedPrice}đ – ${day}/${month} ${hours}:${minutes}`;
};

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

  // Xử lý dữ liệu biểu đồ, phát hiện các khoảng trống (gaps) và cấu hình đường đứt đoạn/vùng đổ bóng
  const { chartData, gapAreas, keyToLabelMap } = useMemo(() => {
    if (!data?.data_points || data.data_points.length === 0) {
      return { chartData: [], gapAreas: [], keyToLabelMap: {} };
    }

    const items: ChartItem[] = [];
    const gaps: GapArea[] = [];
    const labelMap: Record<string, string> = {};

    data.data_points.forEach((pt, index) => {
      const date = new Date(pt.timestamp);
      const numPrice = Number(pt.price);

      const displayTime =
        days <= 1
          ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          : `${date.getDate()}/${date.getMonth() + 1}`;

      const fullTime = `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;

      const currentKey = `pt-${index}`;

      // Khi phát hiện có khoảng trống (is_gap === true) so với điểm trước đó
      if (index > 0 && pt.is_gap) {
        const prevItem = items[items.length - 1];
        const prevDate = new Date(prevItem.timestamp);

        const gapStartFormatted = `${String(prevDate.getDate()).padStart(2, '0')}/${String(
          prevDate.getMonth() + 1
        ).padStart(2, '0')} ${String(prevDate.getHours()).padStart(2, '0')}:${String(
          prevDate.getMinutes()
        ).padStart(2, '0')}`;

        const gapEndFormatted = `${String(date.getDate()).padStart(2, '0')}/${String(
          date.getMonth() + 1
        ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
          date.getMinutes()
        ).padStart(2, '0')}`;

        const gapTimeRange = `${gapStartFormatted} – ${gapEndFormatted}`;
        const gapKey = `gap-${index}`;
        const midTimestamp = new Date(
          (prevDate.getTime() + date.getTime()) / 2
        ).toISOString();

        // Điểm trước nối vào đường dashed gap
        prevItem.gapPrice = prevItem.price;

        // Thêm điểm trung gian đại diện cho vùng khoảng trống (Gap Area)
        items.push({
          chartKey: gapKey,
          timestamp: midTimestamp,
          displayTime: '',
          fullTime: `Khoảng trống dữ liệu (${gapTimeRange})`,
          price: null,
          solidPrice: null, // Làm đứt nét đường thẳng đặc thông thường (break line stroke)
          gapPrice: prevItem.price !== null ? (prevItem.price + numPrice) / 2 : numPrice,
          is_gap: true,
          isGapArea: true,
          gapTimeRange,
          isMin: false,
          isMax: false,
        });

        gaps.push({
          startKey: prevItem.chartKey,
          endKey: currentKey,
          gapTimeRange,
        });
      }

      // Thêm điểm dữ liệu thực tế
      items.push({
        chartKey: currentKey,
        timestamp: pt.timestamp,
        displayTime,
        fullTime,
        price: numPrice,
        solidPrice: numPrice,
        gapPrice: index > 0 && pt.is_gap ? numPrice : null,
        is_gap: Boolean(pt.is_gap),
        isGapArea: false,
        isMin: minPrice !== null && numPrice === minPrice,
        isMax: maxPrice !== null && numPrice === maxPrice,
      });

      labelMap[currentKey] = displayTime;
    });

    return { chartData: items, gapAreas: gaps, keyToLabelMap: labelMap };
  }, [data?.data_points, days, minPrice, maxPrice]);

  const latestPrice = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;
    const normalPoints = chartData.filter((item) => !item.isGapArea && item.price !== null);
    if (normalPoints.length === 0) return null;
    return normalPoints[normalPoints.length - 1].price;
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

  // Custom Interactive Tooltip
  const renderCustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item: ChartItem = payload[0].payload;

    // 1. Nếu điểm chạm rơi vào vùng khoảng trống (Gap Area):
    // Hiển thị thông báo "No data recorded during this period" thay vì hiển thị giá
    if (item.isGapArea || item.price === null) {
      return (
        <div className={styles.customTooltip} data-testid="tooltip-gap">
          <div className={styles.tooltipGapAlert}>
            <AlertTriangle size={15} className={styles.gapIcon} aria-hidden="true" />
            <span>No data recorded during this period</span>
          </div>
          {item.gapTimeRange && (
            <div className={styles.tooltipGapTime}>{item.gapTimeRange}</div>
          )}
        </div>
      );
    }

    // 2. Nếu điểm chạm là dữ liệu bình thường:
    // Định dạng hiển thị "đ – <DD/MM> HH:MM" (e.g., 239,000đ – 18/09 14:00)
    return (
      <div className={styles.customTooltip} data-testid="tooltip-normal">
        <div className={styles.tooltipFormattedText} data-testid="tooltip-price-date">
          {formatTooltipDisplay(item.price, item.timestamp, currency)}
        </div>
        {currency.toUpperCase() !== 'VND' && (
          <div className={styles.tooltipOriginalPrice}>
            ({item.price.toLocaleString('en-US', { style: 'currency', currency: currency.toUpperCase() })})
          </div>
        )}
        {item.isMin && (
          <span className={`${styles.tooltipTag} ${styles.tagLowest}`}>Giá thấp nhất</span>
        )}
        {item.isMax && (
          <span className={`${styles.tooltipTag} ${styles.tagHighest}`}>Giá cao nhất</span>
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
              dataKey="chartKey"
              tickFormatter={(key) => keyToLabelMap[key] || ''}
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
            <Tooltip content={renderCustomTooltip} isAnimationActive={false} />

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

            {/* Vùng đổ bóng khi xuất hiện khoảng trống mất dữ liệu (Gap Region Shading) */}
            {gapAreas.map((gap, idx) => (
              <ReferenceArea
                key={`gap-area-${idx}`}
                x1={gap.startKey}
                x2={gap.endKey}
                fill="var(--status-warning-bg)"
                fillOpacity={0.45}
                stroke="var(--status-warning)"
                strokeDasharray="3 3"
              />
            ))}

            {/* Đường nét liền thông thường: đứt nét khi gặp khoảng trống (connectNulls=false) */}
            <Line
              type="monotone"
              dataKey="solidPrice"
              stroke="var(--primary-color)"
              strokeWidth={2}
              connectNulls={false}
              dot={{ r: 2.5, fill: 'var(--primary-color)' }}
              activeDot={{ r: 5, fill: 'var(--primary-color)', stroke: '#fff', strokeWidth: 2 }}
            />

            {/* Đường nét đứt nối qua khoảng trống mất dữ liệu (Dashed gap stroke) */}
            <Line
              type="monotone"
              dataKey="gapPrice"
              stroke="var(--status-warning)"
              strokeWidth={2}
              strokeDasharray="4 4"
              connectNulls={false}
              dot={{ r: 3, fill: 'var(--status-warning)', stroke: '#fff', strokeWidth: 1 }}
              activeDot={{ r: 5, fill: 'var(--status-warning)', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chú thích biểu đồ (Legend) */}
      <div className={styles.chartLegend}>
        <div className={styles.legendItem}>
          <div className={styles.legendLineSolid} />
          <span>Dữ liệu liên tục</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendBoxShaded} />
          <div className={styles.legendLineDashed} />
          <span>Khoảng trống (Gaps)</span>
        </div>
      </div>
    </div>
  );
};

export default PriceHistoryChart;
