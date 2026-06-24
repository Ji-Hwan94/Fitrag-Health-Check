export default function StatusRow({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#edf0e8] pb-3 text-sm">
      <span className="text-[#6b766c]">{label}</span>
      <span className="font-semibold text-[#17201a]">{value}</span>
    </div>
  );
}
