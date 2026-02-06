import { Box, Paper, Typography, Skeleton, Chip, List, ListItem } from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import FlagIcon from '@mui/icons-material/Flag';
import type { RecommendationsResponse, Recommendation } from '../../types';
import { InfoTooltip } from '../common';

interface RecommendationsProps {
  data: RecommendationsResponse | null;
  loading: boolean;
}

const priorityColors: Record<Recommendation['priority'], 'error' | 'warning' | 'success'> = {
  high: 'error',
  medium: 'warning',
  low: 'success',
};

const priorityLabels: Record<Recommendation['priority'], string> = {
  high: 'High Priority',
  medium: 'Medium',
  low: 'Low',
};

const categoryIcons: Record<string, string> = {
  pipeline: 'Pipeline',
  coaching: 'Coaching',
  engagement: 'Engagement',
  process: 'Process',
  analysis: 'Analysis',
};

export function Recommendations({ data, loading }: RecommendationsProps) {
  if (loading) {
    return (
      <Paper elevation={1} sx={{ p: 2, height: '100%', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Skeleton variant="text" width={180} height={28} />
          <Skeleton variant="circular" width={24} height={24} />
        </Box>
        {[1, 2, 3, 4].map((i) => (
          <Box key={i} sx={{ mb: 2 }}>
            <Skeleton variant="rectangular" width="100%" height={70} sx={{ borderRadius: 1 }} />
          </Box>
        ))}
      </Paper>
    );
  }

  if (!data) return null;

  return (
    <Paper elevation={1} sx={{ p: 2, height: '100%', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LightbulbIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Recommended Actions
          </Typography>
        </Box>
        <InfoTooltip title="AI-generated recommendations based on your current performance data and identified risk factors. Prioritized by potential revenue impact." />
      </Box>

      {data.recommendations.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            No recommendations at this time. Your metrics are looking good!
          </Typography>
        </Box>
      ) : (
        <List sx={{ p: 0 }}>
          {data.recommendations.map((rec, index) => (
            <ListItem
              key={rec.id}
              sx={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                p: 1.5,
                mb: 1,
                bgcolor: 'grey.50',
                borderRadius: 1,
                borderLeft: 3,
                borderColor: `${priorityColors[rec.priority]}.main`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 20 }}>
                  {index + 1}.
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<FlagIcon />}
                    label={priorityLabels[rec.priority]}
                    size="small"
                    color={priorityColors[rec.priority]}
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                  <Chip
                    label={categoryIcons[rec.category]}
                    size="small"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                </Box>
              </Box>
              <Box sx={{ pl: 3.5 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {rec.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {rec.description}
                </Typography>
                <Typography variant="caption" color="primary.main" fontWeight={500}>
                  Impact: {rec.impact}
                </Typography>
              </Box>
            </ListItem>
          ))}
        </List>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
        Generated at: {new Date(data.generatedAt).toLocaleString()}
      </Typography>
    </Paper>
  );
}

export default Recommendations;
