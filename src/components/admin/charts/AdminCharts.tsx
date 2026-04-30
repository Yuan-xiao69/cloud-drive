// Admin Dashboard Chart Components
// 使用纯 SVG 实现的轻量级图表组件

'use client';

import React from 'react';

// ============ 折线图组件 ============
interface LineChartProps {
  data: { label: string; value: number }[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
  showPoints?: boolean;
  formatValue?: (value: number) => string;
}

export function LineChart({
  data,
  width = 400,
  height = 200,
  color = '#0969da',
  showArea = true,
  showPoints = true,
  formatValue = (v) => v.toLocaleString(),
}: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty" style={{ width, height }}>
        暂无数据
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const valueRange = maxValue - minValue || 1;

  const getX = (index: number) => padding.left + (index / (data.length - 1 || 1)) * chartWidth;
  const getY = (value: number) => padding.top + (1 - (value - minValue) / valueRange) * chartHeight;

  const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');
  const areaPath = `
    M ${getX(0)},${getY(data[0].value)}
    ${data.slice(1).map((d, i) => `L ${getX(i + 1)},${getY(d.value)}`).join(' ')}
    L ${getX(data.length - 1)},${padding.top + chartHeight}
    L ${getX(0)},${padding.top + chartHeight}
    Z
  `;

  // Y 轴刻度
  const yTicks = [minValue, (minValue + maxValue) / 2, maxValue].map(v => ({
    value: Math.round(v),
    y: getY(v),
  }));

  return (
    <svg width={width} height={height} className="admin-chart">
      {/* Y 轴网格线和刻度 */}
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={tick.y}
            x2={width - padding.right}
            y2={tick.y}
            stroke="var(--color-border-muted)"
            strokeDasharray="4,4"
          />
          <text
            x={padding.left - 8}
            y={tick.y}
            textAnchor="end"
            dominantBaseline="middle"
            fill="var(--color-fg-muted)"
            fontSize="11"
          >
            {formatValue(tick.value)}
          </text>
        </g>
      ))}

      {/* 面积填充 */}
      {showArea && (
        <path
          d={areaPath}
          fill={color}
          fillOpacity={0.1}
        />
      )}

      {/* 线条 */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* 数据点 */}
      {showPoints && data.map((d, i) => (
        <g key={i}>
          <circle
            cx={getX(i)}
            cy={getY(d.value)}
            r={4}
            fill="var(--color-bg-default)"
            stroke={color}
            strokeWidth={2}
          />
          {/* Tooltip on hover */}
          <title>{`${d.label}: ${formatValue(d.value)}`}</title>
        </g>
      ))}

      {/* X 轴标签 */}
      {data.map((d, i) => (
        <text
          key={i}
          x={getX(i)}
          y={height - 8}
          textAnchor="middle"
          fill="var(--color-fg-muted)"
          fontSize="11"
        >
          {d.label}
        </text>
      ))}
    </svg>
  );
}

// ============ 柱状图组件 ============
interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  width?: number;
  height?: number;
  maxValue?: number;
  formatValue?: (value: number) => string;
}

export function BarChart({
  data,
  width = 400,
  height = 200,
  maxValue: customMax,
  formatValue = (v) => v.toLocaleString(),
}: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty" style={{ width, height }}>
        暂无数据
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = customMax || Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.min(40, (chartWidth / data.length) * 0.7);
  const barGap = (chartWidth - barWidth * data.length) / (data.length + 1);

  const getBarHeight = (value: number) => (value / maxValue) * chartHeight;
  const getX = (index: number) => padding.left + barGap * (index + 1) + barWidth * index;
  const getY = (value: number) => padding.top + chartHeight - getBarHeight(value);

  // Y 轴刻度
  const yTicks = [0, maxValue / 2, maxValue].map(v => ({
    value: Math.round(v),
    y: padding.top + chartHeight - (v / maxValue) * chartHeight,
  }));

  return (
    <svg width={width} height={height} className="admin-chart">
      {/* Y 轴网格线和刻度 */}
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={tick.y}
            x2={width - padding.right}
            y2={tick.y}
            stroke="var(--color-border-muted)"
            strokeDasharray="4,4"
          />
          <text
            x={padding.left - 8}
            y={tick.y}
            textAnchor="end"
            dominantBaseline="middle"
            fill="var(--color-fg-muted)"
            fontSize="11"
          >
            {formatValue(tick.value)}
          </text>
        </g>
      ))}

      {/* 柱子 */}
      {data.map((d, i) => {
        const barHeight = getBarHeight(d.value);
        const x = getX(i);
        const y = padding.top + chartHeight - barHeight;
        const barColor = d.color || 'var(--color-accent-fg)';

        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={barColor}
              rx={4}
              ry={4}
            />
            {/* 顶部数值 */}
            <text
              x={x + barWidth / 2}
              y={y - 6}
              textAnchor="middle"
              fill="var(--color-fg-default)"
              fontSize="11"
              fontWeight="500"
            >
              {formatValue(d.value)}
            </text>
            {/* X 轴标签 */}
            <text
              x={x + barWidth / 2}
              y={height - 10}
              textAnchor="middle"
              fill="var(--color-fg-muted)"
              fontSize="10"
            >
              {d.label.length > 8 ? d.label.slice(0, 8) + '...' : d.label}
            </text>
            {/* Tooltip */}
            <title>{`${d.label}: ${formatValue(d.value)}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

// ============ 饼图组件 ============
interface PieChartProps {
  data: { label: string; value: number; color?: string }[];
  size?: number;
  formatValue?: (value: number) => string;
}

const DEFAULT_COLORS = [
  '#0969da', // 蓝色
  '#1a7f37', // 绿色
  '#bf8700', // 黄色
  '#cf222e', // 红色
  '#8250df', // 紫色
  '#fd8c73', // 橙色
  '#0969da', // 蓝色
  '#656d76', // 灰色
];

export function PieChart({
  data,
  size = 200,
  formatValue = (v) => v.toLocaleString(),
}: PieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty" style={{ width: size, height: size }}>
        暂无数据
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = size / 2 - 10;
  const centerX = size / 2;
  const centerY = size / 2;

  let currentAngle = -90; // 从顶部开始

  const slices = data.map((d, i) => {
    const percentage = d.value / total;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    const color = d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];

    return { ...d, path, color, percentage };
  });

  return (
    <div className="pie-chart-container">
      <svg width={size} height={size} className="admin-chart">
        {slices.map((slice, i) => (
          <path
            key={i}
            d={slice.path}
            fill={slice.color}
            stroke="var(--color-bg-default)"
            strokeWidth={2}
          >
            <title>{`${slice.label}: ${formatValue(slice.value)} (${(slice.percentage * 100).toFixed(1)}%)`}</title>
          </path>
        ))}
        {/* 中心孔洞（环形图效果） */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius * 0.6}
          fill="var(--color-bg-default)"
        />
        {/* 中心文字 */}
        <text
          x={centerX}
          y={centerY - 5}
          textAnchor="middle"
          fill="var(--color-fg-default)"
          fontSize="16"
          fontWeight="600"
        >
          {total.toLocaleString()}
        </text>
        <text
          x={centerX}
          y={centerY + 12}
          textAnchor="middle"
          fill="var(--color-fg-muted)"
          fontSize="11"
        >
          总计
        </text>
      </svg>

      {/* 图例 */}
      <div className="pie-chart-legend">
        {slices.map((slice, i) => (
          <div key={i} className="legend-item">
            <span
              className="legend-color"
              style={{ backgroundColor: slice.color }}
            />
            <span className="legend-label">{slice.label}</span>
            <span className="legend-value">{formatValue(slice.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ 环形进度组件 ============
interface RingProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

export function RingProgress({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  color = 'var(--color-success-fg)',
  label,
  sublabel,
}: RingProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min(value / max, 1);
  const offset = circumference - percentage * circumference;

  return (
    <div className="ring-progress" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border-muted)"
          strokeWidth={strokeWidth}
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-progress-content">
        {label !== undefined ? (
          <>
            <span className="ring-progress-label">{label}</span>
            {sublabel && <span className="ring-progress-sublabel">{sublabel}</span>}
          </>
        ) : (
          <span className="ring-progress-value">{Math.round(percentage * 100)}%</span>
        )}
      </div>
    </div>
  );
}

// ============ 迷你趋势图（用于统计卡片） ============
interface MiniTrendProps {
  data: number[];
  trend: 'up' | 'down' | 'neutral';
  color?: string;
}

export function MiniTrend({
  data,
  trend,
  color,
}: MiniTrendProps) {
  if (!data || data.length < 2) return null;

  const width = 60;
  const height = 20;
  const padding = 2;

  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - minVal) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const trendColor = color || (trend === 'up' ? 'var(--color-success-fg)' : trend === 'down' ? 'var(--color-danger-fg)' : 'var(--color-fg-muted)');

  return (
    <svg width={width} height={height} className="mini-trend">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={trendColor}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ============ 图表样式 ============
const Styles = () => (
  <style jsx>{`
    .chart-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-fg-muted);
      font-size: 13px;
      background: var(--color-canvas-subtle);
      border: 1px dashed var(--color-border-default);
      border-radius: 6px;
    }
    .admin-chart {
      display: block;
      overflow: visible;
    }
    .pie-chart-container {
      display: flex;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    .pie-chart-legend {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 120px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    .legend-color {
      width: 10px;
      height: 10px;
      border-radius: 2px;
      flex-shrink: 0;
    }
    .legend-label {
      flex: 1;
      color: var(--color-fg-default);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 80px;
    }
    .legend-value {
      font-weight: 500;
      color: var(--color-fg-default);
      font-size: 11px;
      min-width: 40px;
      text-align: right;
    }
    .ring-progress {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .ring-progress-content {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .ring-progress-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--color-fg-default);
      line-height: 1.2;
    }
    .ring-progress-sublabel {
      font-size: 9px;
      color: var(--color-fg-muted);
    }
    .ring-progress-value {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-fg-default);
    }
    .mini-trend {
      display: block;
      overflow: visible;
    }
  `}</style>
);

export { Styles as AdminChartsStyles };
