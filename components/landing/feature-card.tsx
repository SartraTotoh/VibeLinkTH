type FeatureCardProps = {
  title: string;
  description: string;
  icon?: string;
  badge?: string;
};

export function FeatureCard({ title, description, icon = "auto_awesome", badge }: FeatureCardProps) {
  return (
    <article className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "radial-gradient(circle at 50% 0%, rgba(185, 255, 44, 0.22), rgba(185, 255, 44, 0.05))",
            display: "grid",
            placeItems: "center",
            boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.2)",
          }}
        >
          <span className="ms" style={{ fontSize: 24, color: "var(--primary)" }}>{icon}</span>
        </div>
        {badge ? (
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: "radial-gradient(120% 120% at 50% 0%, rgba(255, 79, 216, 0.2), rgba(255, 79, 216, 0.05))",
              color: "var(--secondary)",
              fontSize: 15,
              fontWeight: 800,
              boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.2)",
            }}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <div>
        <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#fff" }}>{title}</h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 15, lineHeight: 1.6 }}>{description}</p>
      </div>
    </article>
  );
}
