import { FormControl, InputLabel, Select, MenuItem, Box, Typography } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';

interface QuarterSelectorProps {
  quarters: string[];
  selectedQuarter: string;
  onQuarterChange: (quarter: string) => void;
  comparisonQuarter?: string;
  onComparisonChange?: (quarter: string) => void;
  showComparison?: boolean;
}

export function QuarterSelector({
  quarters,
  selectedQuarter,
  onQuarterChange,
  comparisonQuarter,
  onComparisonChange,
  showComparison = true,
}: QuarterSelectorProps) {
  const handleQuarterChange = (event: SelectChangeEvent) => {
    onQuarterChange(event.target.value);
  };

  const handleComparisonChange = (event: SelectChangeEvent) => {
    if (onComparisonChange) {
      onComparisonChange(event.target.value);
    }
  };

  // Filter out the selected quarter from comparison options
  const comparisonOptions = quarters.filter((q) => q !== selectedQuarter);

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="quarter-select-label">Quarter</InputLabel>
        <Select
          labelId="quarter-select-label"
          value={selectedQuarter}
          label="Quarter"
          onChange={handleQuarterChange}
          sx={{ bgcolor: 'white' }}
        >
          {quarters.map((q) => (
            <MenuItem key={q} value={q}>
              {q}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {showComparison && onComparisonChange && (
        <>
          <Typography variant="body2" color="text.secondary">
            vs
          </Typography>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="comparison-select-label">Compare with</InputLabel>
            <Select
              labelId="comparison-select-label"
              value={comparisonQuarter || ''}
              label="Compare with"
              onChange={handleComparisonChange}
              sx={{ bgcolor: 'white' }}
            >
              <MenuItem value="">
                <em>Previous Quarter</em>
              </MenuItem>
              {comparisonOptions.map((q) => (
                <MenuItem key={q} value={q}>
                  {q}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </>
      )}
    </Box>
  );
}

export default QuarterSelector;
