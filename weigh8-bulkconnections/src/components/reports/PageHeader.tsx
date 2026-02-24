interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="font-sans font-bold text-3xl text-gray-900">
        {title}
      </h1>
      {subtitle && (
        <p className="font-sans text-sm text-gray-700 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
