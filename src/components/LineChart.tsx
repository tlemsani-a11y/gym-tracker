export function LineChart({ dataPoints }: { dataPoints: { label: string; value: number }[] }) {
  if (dataPoints.length < 2) {
    return <p className="no-chart-data">Log a couple more sessions to see a trend.</p>;
  }

  const width = 300;
  const height = 90;
  const padding = 18;
  const values = dataPoints.map((d) => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const stepX = (width - 2 * padding) / (dataPoints.length - 1);

  const points = dataPoints.map((d, i) => ({
    x: padding + i * stepX,
    y: height - padding - ((d.value - minV) / range) * (height - 2 * padding),
    value: d.value,
  }));

  const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `M${points[0].x.toFixed(1)},${height - padding} L${polyline.split(" ").join(" L")} L${points[
    points.length - 1
  ].x.toFixed(1)},${height - padding} Z`;
  const gradId = `chartGrad${dataPoints.length}-${Math.round(minV)}-${Math.round(maxV)}`;

  return (
    <>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-hover)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent-hover)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <polyline
          points={polyline}
          style={{
            fill: "none",
            stroke: "var(--accent-hover)",
            strokeWidth: 1.75,
            strokeLinecap: "round",
            strokeLinejoin: "round",
          }}
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x.toFixed(1)}
            cy={p.y.toFixed(1)}
            r="2.25"
            style={{ fill: "var(--surface)", stroke: "var(--accent-hover)", strokeWidth: 1.5 }}
          />
        ))}
      </svg>
      <div className="muted" style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{dataPoints[0].label}</span>
        <span>{dataPoints[dataPoints.length - 1].label}</span>
      </div>
    </>
  );
}
