import { Box, Paper, Typography, Skeleton } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import type { SummaryResponse } from '../../types';
import { InfoTooltip } from '../common';

interface KPISummaryBarProps {
  data: SummaryResponse | null;
  loading: boolean;
}

export function KPISummaryBar({ data, loading }: KPISummaryBarProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          bgcolor: 'primary.main',
          color: 'white',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 2 }}>
          {[1, 2, 3, 4].map((i) => (
            <Box key={i} sx={{ textAlign: 'center', minWidth: 150 }}>
              <Skeleton variant="text" width={100} height={20} sx={{ bgcolor: 'rgba(255,255,255,0.2)', mx: 'auto' }} />
              <Skeleton variant="text" width={120} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.2)', mx: 'auto' }} />
            </Box>
          ))}
        </Box>
      </Paper>
    );
  }

  if (!data) return null;

  const kpis = [
    {
      label: 'QTD Revenue',
      value: formatCurrency(data.revenue),
      tooltip: 'Total revenue from deals closed as Won in the selected quarter. Deals with missing close dates use their creation date.',
    },
    {
      label: 'Target',
      value: data.target > 0 ? formatCurrency(data.target) : 'No target set',
      tooltip: 'Sum of monthly revenue targets for the selected quarter.',
    },
    {
      label: 'Gap',
      value: data.target > 0 ? `${data.gapPercent > 0 ? '+' : ''}${data.gapPercent.toFixed(1)}%` : 'N/A',
      color: data.gapPercent >= 0 ? '#4caf50' : data.gapPercent > -15 ? '#ff9800' : '#f44336',
      tooltip: 'Percentage difference between actual revenue and target. Negative means below target.',
    },
    {
      label: `vs ${data.comparisonPeriod}`,
      value: `${data.changePercent > 0 ? '+' : ''}${data.changePercent.toFixed(1)}%`,
      icon: data.changePercent > 0 ? TrendingUpIcon : TrendingDownIcon,
      color: data.changePercent >= 0 ? '#4caf50' : '#f44336',
      tooltip: `Revenue change compared to ${data.comparisonPeriod}. Positive indicates growth.`,
    },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        bgcolor: 'primary.main',
        color: 'white',
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-around',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Box key={kpi.label} sx={{ textAlign: 'center', minWidth: 150 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {kpi.label}
                </Typography>
                <InfoTooltip title={kpi.tooltip} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                {Icon && <Icon sx={{ color: kpi.color, fontSize: 28 }} />}
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{ color: kpi.color || 'white' }}
                >
                  {kpi.value}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

export default KPISummaryBar;
