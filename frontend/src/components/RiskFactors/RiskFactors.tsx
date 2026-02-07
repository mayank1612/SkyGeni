import { Box, Paper, Typography, Skeleton, List, ListItem, ListItemText, Collapse } from '@mui/material';
import { useState } from 'react';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import type { RiskFactorsResponse } from '../../types';
import { InfoTooltip } from '../common';

interface RiskFactorsProps {
  data: RiskFactorsResponse | null;
  loading: boolean;
}

export function RiskFactors({ data, loading }: RiskFactorsProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('staleDeals');

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading) {
    return (
      <Paper elevation={1} sx={{ p: 2, height: '100%', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Skeleton variant="text" width={150} height={28} />
          <Skeleton variant="circular" width={24} height={24} />
        </Box>
        {[1, 2, 3].map((i) => (
          <Box key={i} sx={{ mb: 2 }}>
            <Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
          </Box>
        ))}
      </Paper>
    );
  }

  if (!data) return null;

  const riskSections = [
    {
      id: 'staleDeals',
      icon: <AccessTimeIcon color="warning" />,
      title: 'Stale Deals',
      subtitle: `${data.staleDeals.totalCount} deals with no activity in ${data.staleDeals.thresholdDays}+ days`,
      value: formatCurrency(data.staleDeals.totalValueAtRisk),
      valueLabel: 'at risk',
      tooltip: `Deals are considered stale when there has been no activity (calls, emails, demos) for ${data.staleDeals.thresholdDays} or more days. Stale deals are at higher risk of being lost.`,
      content: (
        <List dense>
          {data.staleDeals.bySegment.map((segment) => (
            <ListItem key={segment.segment} sx={{ py: 0.5 }}>
              <ListItemText
                primary={segment.segment}
                secondary={`${segment.count} deals, ${formatCurrency(segment.valueAtRisk)} at risk`}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ))}
        </List>
      ),
    },
    {
      id: 'underperformingReps',
      icon: <PersonIcon color="error" />,
      title: 'Underperforming Reps',
      subtitle: `${data.underperformingReps.count} reps below team average (${data.underperformingReps.teamAvgWinRate.toFixed(1)}%)`,
      tooltip: `Reps whose win rate is below the team average for this quarter. Only includes reps with at least 3 closed deals to ensure statistical significance.`,
      content: (
        <List dense>
          {data.underperformingReps.reps.slice(0, 5).map((rep) => (
            <ListItem key={rep.repId} sx={{ py: 0.5 }}>
              <ListItemText
                primary={rep.name}
                secondary={`${rep.winRate.toFixed(1)}% win rate (${rep.gapFromAverage.toFixed(1)}% below avg)`}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                secondaryTypographyProps={{
                  variant: 'caption',
                  color: 'error.main',
                }}
              />
            </ListItem>
          ))}
        </List>
      ),
    },
    {
      id: 'lowActivityAccounts',
      icon: <BusinessIcon color="info" />,
      title: 'Low Activity Accounts',
      subtitle: `${data.lowActivityAccounts.totalCount} accounts need attention`,
      value: formatCurrency(data.lowActivityAccounts.totalValueAtRisk),
      valueLabel: 'at risk',
      tooltip: `Accounts that have open deals in the pipeline but haven't been contacted in ${data.lowActivityAccounts.thresholdDays} or more days. Regular engagement is critical to move deals forward.`,
      content: (
        <List dense>
          {data.lowActivityAccounts.accounts.slice(0, 5).map((account) => (
            <ListItem key={account.accountId} sx={{ py: 0.5 }}>
              <ListItemText
                primary={account.name}
                secondary={`${formatCurrency(account.pipelineValue)} pipeline, ${account.daysSinceActivity} days since contact`}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ))}
        </List>
      ),
    },
  ];

  return (
    <Paper elevation={1} sx={{ p: 2, height: '100%', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="warning" />
          <Typography variant="h6" fontWeight="bold">
            Top Risk Factors
          </Typography>
        </Box>
        <InfoTooltip title="Issues that need immediate attention to protect revenue. Click each section to see details." />
      </Box>

      {riskSections.map((section) => (
        <Box key={section.id} sx={{ mb: 1.5 }}>
          <Box
            onClick={() => toggleSection(section.id)}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              p: 1.5,
              bgcolor: 'grey.50',
              borderRadius: 1,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'grey.100' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flex: 1 }}>
              {section.icon}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {section.title}
                  </Typography>
                  <InfoTooltip title={section.tooltip} size="small" />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {section.subtitle}
                </Typography>
                {section.value && (
                  <Typography variant="body2" color="error.main" fontWeight={500}>
                    {section.value} {section.valueLabel}
                  </Typography>
                )}
              </Box>
            </Box>
            {expandedSection === section.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Box>
          <Collapse in={expandedSection === section.id}>
            <Box sx={{ pl: 5, pr: 1 }}>{section.content}</Box>
          </Collapse>
        </Box>
      ))}
    </Paper>
  );
}

export default RiskFactors;
