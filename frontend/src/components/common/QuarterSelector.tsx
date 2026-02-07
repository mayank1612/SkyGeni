import { FormControl, Select, MenuItem, Box, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { useEffect } from "react";

interface QuarterSelectorProps {
  quarters: string[];
  selectedQuarter: string;
  onQuarterChange: (quarter: string) => void;
  comparisonQuarter?: string;
  onComparisonChange?: (quarter: string) => void;
  showComparison?: boolean;
}

// Helper to get previous quarter
function getPreviousQuarter(
  quarter: string,
  availableQuarters: string[],
): string {
  const match = quarter.match(/Q(\d)\s+(\d{4})/);
  if (!match) return availableQuarters[1] || "";

  const quarterNum = parseInt(match[1]);
  const year = parseInt(match[2]);

  let prevQuarter: string;
  if (quarterNum === 1) {
    prevQuarter = `Q4 ${year - 1}`;
  } else {
    prevQuarter = `Q${quarterNum - 1} ${year}`;
  }

  if (availableQuarters.includes(prevQuarter)) {
    return prevQuarter;
  }

  const filtered = availableQuarters.filter((q) => q !== quarter);
  return filtered[0] || "";
}

export function QuarterSelector({
  quarters,
  selectedQuarter,
  onQuarterChange,
  comparisonQuarter,
  onComparisonChange,
  showComparison = true,
}: QuarterSelectorProps) {
  // Set default comparison quarter when selected quarter changes
  useEffect(() => {
    if (onComparisonChange && quarters.length > 0 && !comparisonQuarter) {
      const defaultComparison = getPreviousQuarter(selectedQuarter, quarters);
      if (defaultComparison) {
        onComparisonChange(defaultComparison);
      }
    }
  }, [selectedQuarter, quarters, comparisonQuarter, onComparisonChange]);

  // Update comparison if it becomes same as selected
  useEffect(() => {
    if (onComparisonChange && comparisonQuarter === selectedQuarter) {
      const newComparison = getPreviousQuarter(selectedQuarter, quarters);
      if (newComparison) {
        onComparisonChange(newComparison);
      }
    }
  }, [selectedQuarter, comparisonQuarter, quarters, onComparisonChange]);

  const handleQuarterChange = (event: SelectChangeEvent) => {
    onQuarterChange(event.target.value);
  };

  const handleComparisonChange = (event: SelectChangeEvent) => {
    if (onComparisonChange) {
      onComparisonChange(event.target.value);
    }
  };

  const comparisonOptions = quarters.filter((q) => q !== selectedQuarter);

  const selectStyles = {
    bgcolor: "white",
    borderRadius: 1,
    minWidth: 120,
    "& .MuiSelect-select": {
      py: 1,
      px: 1.5,
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "transparent",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "rgba(0, 0, 0, 0.2)",
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "primary.main",
    },
  };

  return (
    <Box
      sx={{ display: "flex", gap: 2, alignItems: "center", margin: "10px 0px" }}
    >
      <Box>
        <Typography
          variant="caption"
          sx={{ color: "rgba(255, 255, 255, 0.7)", display: "block", mb: 0.5 }}
        >
          Quarter
        </Typography>
        <FormControl size="small">
          <Select
            value={selectedQuarter}
            onChange={handleQuarterChange}
            sx={selectStyles}
          >
            {quarters.map((q) => (
              <MenuItem key={q} value={q}>
                {q}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {showComparison && onComparisonChange && comparisonOptions.length > 0 && (
        <>
          <Typography
            variant="body2"
            sx={{ color: "rgba(255, 255, 255, 0.9)", mt: 2.5 }}
          >
            vs
          </Typography>
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                display: "block",
                mb: 0.5,
              }}
            >
              Compare with
            </Typography>
            <FormControl size="small">
              <Select
                value={comparisonQuarter || ""}
                onChange={handleComparisonChange}
                sx={selectStyles}
              >
                {comparisonOptions.map((q) => (
                  <MenuItem key={q} value={q}>
                    {q}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </>
      )}
    </Box>
  );
}

export default QuarterSelector;
