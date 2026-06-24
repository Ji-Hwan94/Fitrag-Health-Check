export default function NumberInput({
  label,
  value,
  suffix,
  min,
  max,
  onChange,
}: Readonly<{
  label: string;
  value: number;
  suffix: string;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}>) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[#344238]">
      {label}
      <div className="flex h-11 overflow-hidden rounded-md border border-[#cbd4c4] bg-white focus-within:border-[#52735d] focus-within:ring-2 focus-within:ring-[#52735d]/20">
        <input
          className="w-full px-3 text-sm outline-none"
          max={max}
          min={min}
          type="number"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="grid min-w-12 place-items-center border-l border-[#cbd4c4] bg-[#f7f8f3] px-3 text-sm text-[#6b766c]">
          {suffix}
        </span>
      </div>
    </label>
  );
}
