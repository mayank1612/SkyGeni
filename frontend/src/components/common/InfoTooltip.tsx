import { Tooltip, IconButton } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

interface InfoTooltipProps {
  title: string;
  size?: "small" | "medium";
  color?: string;
}

export function InfoTooltip({ title, size = "small", color }: InfoTooltipProps) {
  return (
    <Tooltip
      title={title}
      arrow
      placement="top"
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: "rgba(0, 0, 0, 0.87)",
            fontSize: "0.75rem",
            maxWidth: 300,
            padding: "8px 12px",
          },
        },
      }}
    >
      <IconButton size={size} sx={{ opacity: 0.6, "&:hover": { opacity: 1 }, color: color || "inherit" }}>
        <InfoOutlinedIcon fontSize={size} />
      </IconButton>
    </Tooltip>
  );
}

export default InfoTooltip;
