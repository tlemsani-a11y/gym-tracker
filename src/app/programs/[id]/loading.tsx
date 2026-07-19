export default function Loading() {
  return (
    <>
      <div className="skeleton-line short" style={{ height: "1.4rem", marginBottom: "1.1rem" }} />
      <div className="skeleton-card">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton-line wide" style={{ marginTop: i ? "0.9rem" : 0 }} />
        ))}
      </div>
    </>
  );
}
