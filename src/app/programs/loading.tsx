export default function Loading() {
  return (
    <>
      <div className="skeleton-line short" style={{ height: "1.4rem", marginBottom: "1.1rem" }} />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-line medium" />
          <div className="skeleton-line short" />
        </div>
      ))}
    </>
  );
}
