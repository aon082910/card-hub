import React from 'react';

// Dependency-free SVG line chart - no charting library needed for two small use cases
// (portfolio value over time, a card's value history). data: [{ label, value }].
export default function LineChart({ data, height = 160 }) {
  if (!data || data.length < 2) return null;

  const width = 600;
  const padX = 8;
  const padY = 16;
  const values = data.map((d) => Number(d.value) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (width - padX * 2) / (data.length - 1);

  const points = data.map((d, i) => {
    const x = padX + i * stepX;
    const y = padY + (height - padY * 2) * (1 - ((Number(d.value) || 0) - min) / range);
    return [x, y];
  });
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(1)},${(height - padY).toFixed(1)} `
    + `L${points[0][0].toFixed(1)},${(height - padY).toFixed(1)} Z`;

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: `${height}px`, display: 'block' }}>
        <path d={areaPath} className="line-chart-area" />
        <path d={linePath} className="line-chart-line" />
      </svg>
      <div className="line-chart-labels">
        <span>{data[0].label}</span>
        <span className="line-chart-minmax">${min.toFixed(2)} – ${max.toFixed(2)}</span>
        <span>{data[data.length - 1].label}</span>
      </div>
    </div>
  );
}
