export default function Loading() {
  return (
    <>
      <div className="skeleton-line short" style={{ height: "1.4rem", marginBottom: "1.1rem" }} />
      <div className="skeleton-card">
        <div className="skeleton-line short" />
        <div className="skeleton-line wide" style={{ marginTop: "0.75rem" }} />
      </div>
      <div className="grid">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-line medium" />
            <div className="skeleton-line short" />
            <div className="skeleton-line button" />
          </div>
        ))}
      </div>
    </>
  );
}
