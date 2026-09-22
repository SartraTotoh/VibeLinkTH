type FeatureCardProps = {
  title: string;
  description: string;
};

export function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <article className="card">
      <h2>{title}</h2>
      <p>{description}</p>
    </article>
  );
}
