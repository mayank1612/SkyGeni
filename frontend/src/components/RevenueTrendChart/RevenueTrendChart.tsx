import { useRef, useEffect, useState } from 'react';
import { Box, Paper, Typography, Skeleton, useTheme } from '@mui/material';
import * as d3 from 'd3';
import type { TrendDataPoint } from '../../types';
import { InfoTooltip } from '../common';

interface RevenueTrendChartProps {
  data: TrendDataPoint[] | null;
  loading: boolean;
}

export function RevenueTrendChart({ data, loading }: RevenueTrendChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 300 });
  const theme = useTheme();

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 300,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Draw chart
  useEffect(() => {
    if (!data || !svgRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.monthLabel))
      .range([0, width])
      .padding(0.3);

    const maxValue = Math.max(...data.map((d) => Math.max(d.actual, d.target))) * 1.1;
    const y = d3.scaleLinear().domain([0, maxValue]).nice().range([height, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(y)
          .tickSize(-width)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .style('stroke', '#e0e0e0')
      .style('stroke-dasharray', '3,3');

    g.selectAll('.grid .domain').remove();

    // Area for actual revenue
    const area = d3
      .area<TrendDataPoint>()
      .x((d) => (x(d.monthLabel) || 0) + x.bandwidth() / 2)
      .y0(height)
      .y1((d) => y(d.actual))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', theme.palette.primary.light)
      .attr('fill-opacity', 0.3)
      .attr('d', area);

    // Line for actual revenue
    const actualLine = d3
      .line<TrendDataPoint>()
      .x((d) => (x(d.monthLabel) || 0) + x.bandwidth() / 2)
      .y((d) => y(d.actual))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', theme.palette.primary.main)
      .attr('stroke-width', 3)
      .attr('d', actualLine);

    // Line for target
    const targetLine = d3
      .line<TrendDataPoint>()
      .x((d) => (x(d.monthLabel) || 0) + x.bandwidth() / 2)
      .y((d) => y(d.target))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', theme.palette.grey[500])
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('d', targetLine);

    // Bars for monthly comparison
    const barWidth = x.bandwidth() * 0.6;

    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d) => (x(d.monthLabel) || 0) + (x.bandwidth() - barWidth) / 2)
      .attr('y', (d) => y(d.actual))
      .attr('width', barWidth)
      .attr('height', (d) => height - y(d.actual))
      .attr('fill', (d) => (d.actual >= d.target ? theme.palette.success.main : theme.palette.error.light))
      .attr('fill-opacity', 0.6)
      .attr('rx', 2);

    // Data points for actual
    g.selectAll('.actual-point')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'actual-point')
      .attr('cx', (d) => (x(d.monthLabel) || 0) + x.bandwidth() / 2)
      .attr('cy', (d) => y(d.actual))
      .attr('r', 5)
      .attr('fill', theme.palette.primary.main)
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    // Data points for target
    g.selectAll('.target-point')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'target-point')
      .attr('cx', (d) => (x(d.monthLabel) || 0) + x.bandwidth() / 2)
      .attr('cy', (d) => y(d.target))
      .attr('r', 4)
      .attr('fill', theme.palette.grey[500])
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('font-size', '12px');

    // Y axis
    g.append('g')
      .call(
        d3.axisLeft(y).tickFormat((d) => {
          const value = d as number;
          if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
          if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
          return `$${value}`;
        })
      )
      .selectAll('text')
      .style('font-size', '11px');

    // Tooltip
    const tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'rgba(0,0,0,0.8)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

    // Hover areas
    g.selectAll('.hover-area')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'hover-area')
      .attr('x', (d) => x(d.monthLabel) || 0)
      .attr('y', 0)
      .attr('width', x.bandwidth())
      .attr('height', height)
      .attr('fill', 'transparent')
      .on('mouseover', function (_event, d) {
        tooltip.style('visibility', 'visible').html(`
          <strong>${d.monthLabel} ${d.year}</strong><br/>
          Actual: $${d.actual.toLocaleString()}<br/>
          Target: $${d.target.toLocaleString()}<br/>
          Gap: ${d.gapPercent > 0 ? '+' : ''}${d.gapPercent.toFixed(1)}%
        `);
      })
      .on('mousemove', function (event) {
        tooltip.style('top', event.pageY - 10 + 'px').style('left', event.pageX + 10 + 'px');
      })
      .on('mouseout', function () {
        tooltip.style('visibility', 'hidden');
      });

    // Cleanup tooltip on unmount
    return () => {
      d3.select('.chart-tooltip').remove();
    };
  }, [data, dimensions, theme]);

  if (loading) {
    return (
      <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Skeleton variant="text" width={200} height={28} />
          <Skeleton variant="circular" width={24} height={24} />
        </Box>
        <Skeleton variant="rectangular" width="100%" height={300} sx={{ borderRadius: 1 }} />
      </Paper>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Revenue Trend
        </Typography>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">No trend data available</Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          Revenue Trend (Last 6 Months)
        </Typography>
        <InfoTooltip title="Monthly revenue trend showing actual closed revenue versus targets. The shaded area and bars represent actual revenue (green = above target, red = below). The dashed line represents targets." />
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 3, mb: 2, justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 3, bgcolor: 'primary.main', borderRadius: 1 }} />
          <Typography variant="caption">Actual Revenue</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 2, bgcolor: 'grey.500', borderRadius: 1, borderStyle: 'dashed', borderWidth: 1 }} />
          <Typography variant="caption">Target</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, bgcolor: 'success.main', borderRadius: 0.5, opacity: 0.6 }} />
          <Typography variant="caption">Above Target</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, bgcolor: 'error.light', borderRadius: 0.5, opacity: 0.6 }} />
          <Typography variant="caption">Below Target</Typography>
        </Box>
      </Box>

      {/* Chart */}
      <Box ref={containerRef} sx={{ width: '100%' }}>
        <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
        Hover over the chart for details
      </Typography>
    </Paper>
  );
}

export default RevenueTrendChart;
