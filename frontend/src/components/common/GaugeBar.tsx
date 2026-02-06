import { useMemo } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import * as d3 from 'd3';

interface GaugeBarProps {
  value: number;
  benchmark: number;
  percentOfBenchmark: number;
  change: number;
  changeType: 'percent' | 'absolute' | 'days';
  isPositiveGood: boolean;
  label: string;
  formattedValue: string;
  comparisonPeriod: string;
  width?: number;
  height?: number;
}

export function GaugeBar({
  percentOfBenchmark,
  change,
  changeType,
  isPositiveGood,
  label,
  formattedValue,
  benchmark,
  comparisonPeriod,
  width = 200,
  height = 8,
}: GaugeBarProps) {
  // Calculate colors and fill using D3
  const { fillWidth, fillColor, bgColor } = useMemo(() => {
    // Clamp percent to 0-150 for display (can exceed 100%)
    const displayPercent = Math.min(Math.max(percentOfBenchmark, 0), 150);

    // Scale for width calculation
    const scale = d3.scaleLinear().domain([0, 100]).range([0, width]).clamp(true);

    const fillWidth = scale(Math.min(displayPercent, 100));

    // Determine color based on performance
    // For metrics where higher is better (isPositiveGood = true)
    // For metrics where lower is better (isPositiveGood = false), we invert
    let performance = percentOfBenchmark;
    if (!isPositiveGood) {
      // For sales cycle, being at 80% of benchmark is good (faster)
      performance = 200 - percentOfBenchmark; // Invert: 80% becomes 120%, 120% becomes 80%
    }

    // Color scale
    const colorScale = d3
      .scaleLinear<string>()
      .domain([0, 50, 80, 100])
      .range(['#f44336', '#ff9800', '#4caf50', '#4caf50'])
      .clamp(true);

    const fillColor = colorScale(performance);
    const bgColor = '#e0e0e0';

    return { fillWidth, fillColor, bgColor };
  }, [percentOfBenchmark, isPositiveGood, width]);

  // Format change display
  const formatChange = () => {
    const absChange = Math.abs(change);
    let text = '';

    switch (changeType) {
      case 'percent':
        text = `${absChange.toFixed(1)}%`;
        break;
      case 'absolute':
        text = `${absChange.toFixed(1)}%`; // Win rate is shown as absolute but still %
        break;
      case 'days':
        text = `${absChange} days`;
        break;
    }

    return text;
  };

  // Determine if change is positive for display
  const isChangePositive = isPositiveGood ? change > 0 : change < 0;
  const isChangeNeutral = change === 0;

  const changeColor = isChangeNeutral ? 'text.secondary' : isChangePositive ? 'success.main' : 'error.main';

  const ChangeIcon = isChangeNeutral
    ? TrendingFlatIcon
    : isChangePositive
      ? TrendingUpIcon
      : TrendingDownIcon;

  const benchmarkDisplay = isPositiveGood
    ? `Benchmark: ${formatBenchmark(benchmark, changeType)}`
    : `Benchmark: ${formatBenchmark(benchmark, changeType)} (lower is better)`;

  return (
    <Box sx={{ mb: 2 }}>
      {/* Label and Value Row */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h6" fontWeight="bold">
          {formattedValue}
        </Typography>
      </Box>

      {/* Gauge Bar */}
      <Tooltip
        title={`${percentOfBenchmark.toFixed(0)}% of benchmark. ${benchmarkDisplay}`}
        arrow
        placement="top"
      >
        <Box
          sx={{
            width: '100%',
            height,
            bgcolor: bgColor,
            borderRadius: 1,
            overflow: 'hidden',
            cursor: 'pointer',
          }}
        >
          <Box
            sx={{
              width: fillWidth,
              height: '100%',
              bgcolor: fillColor,
              borderRadius: 1,
              transition: 'width 0.3s ease-in-out',
            }}
          />
        </Box>
      </Tooltip>

      {/* Change Indicator Row */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
          {benchmarkDisplay}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ChangeIcon sx={{ fontSize: 14, color: changeColor }} />
          <Typography variant="caption" sx={{ color: changeColor, fontWeight: 500 }}>
            {formatChange()} vs {comparisonPeriod}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

function formatBenchmark(value: number, type: 'percent' | 'absolute' | 'days'): string {
  if (type === 'days') {
    return `${value} days`;
  }
  if (type === 'absolute') {
    return `${value}%`;
  }
  // For percent type (pipeline, deal size), format as currency
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
}

export default GaugeBar;
