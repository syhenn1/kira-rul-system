interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
      <p className="text-gray-500 font-medium">
        {title}
      </p>

      <h2 className="text-4xl font-bold text-gray-900 mt-4">
        {value}
      </h2>

      <p className="text-gray-400 text-sm mt-2">
        {subtitle}
      </p>
    </div>
  );
}