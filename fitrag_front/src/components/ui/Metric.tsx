export default function Metric({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-md bg-[#eef3e9] p-4">
      <p className="text-xs font-medium text-[#6b766c]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[#17201a]">{value}</p>
    </div>
  );
}
