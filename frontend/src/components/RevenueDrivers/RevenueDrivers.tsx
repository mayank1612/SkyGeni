import { Box, Paper, Typography, Skeleton, Divider } from '@mui/material';
import type { DriversResponse } from '../../types';
import { InfoTooltip, GaugeBar } from '../common';

interface RevenueDriversProps {
  data: DriversResponse | null;
  loading: boolean;
}

export function RevenueDrivers({ data, loading }: RevenueDriversProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  if (loading) {
    return (
      <Paper elevation={1} sx={{ p: 2, height: '100%', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Skeleton variant="text" width={150} height={28} />
          <Skeleton variant="circular" width={24} height={24} />
        </Box>
        {[1, 2, 3, 4].map((i) => (
          <Box key={i} sx={{ mb: 2 }}>
            <Skeleton variant="text" width="100%" height={24} />
            <Skeleton variant="rectangular" width="100%" height={8} sx={{ borderRadius: 1 }} />
            <Skeleton variant="text" width={180} height={16} />
          </Box>
        ))}
      </Paper>
    );
  }

  if (!data) return null;

  const drivers = [
    {
      key: 'pipelineValue',
      label: 'Pipeline Value',
      metric: data.pipelineValue,
      formattedValue: formatCurrency(data.pipelineValue.current),
    },
    {
      key: 'winRate',
      label: 'Win Rate',
      metric: data.winRate,
      formattedValue: `${data.winRate.current.toFixed(1)}%`,
    },
    {
      key: 'avgDealSize',
      label: 'Avg Deal Size',
      metric: data.avgDealSize,
      formattedValue: formatCurrency(data.avgDealSize.current),
    },
    {
      key: 'salesCycle',
      label: 'Sales Cycle',
      metric: data.salesCycle,
      formattedValue: `${data.salesCycle.current} days`,
    },
  ];

  return (
    <Paper elevation={1} sx={{ p: 2, height: '100%', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          Revenue Drivers
        </Typography>
        <InfoTooltip title="Key metrics that drive revenue performance. The gauge shows progress toward benchmark, and the arrow shows change vs previous period." />
      </Box>

      {drivers.map((driver, index) => (
        <Box key={driver.key}>
          <GaugeBar
            value={driver.metric.current}
            benchmark={driver.metric.benchmark}
            percentOfBenchmark={driver.metric.percentOfBenchmark}
            change={driver.metric.change}
            changeType={driver.metric.changeType}
            isPositiveGood={driver.metric.isPositiveGood}
            label={driver.label}
            formattedValue={driver.formattedValue}
            comparisonPeriod={data.comparisonPeriod}
          />
          {index < drivers.length - 1 && <Divider sx={{ my: 1.5 }} />}
        </Box>
      ))}

      {/* Info about tooltips */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, fontStyle: 'italic' }}>
        Hover over bars for benchmark details
      </Typography>
    </Paper>
  );
}

export default RevenueDrivers;
