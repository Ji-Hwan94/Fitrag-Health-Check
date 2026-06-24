export default function Panel({
  title,
  children,
  action,
}: Readonly<{
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}>) {
  return (
    <section className="rounded-md border border-[#d9dfd1] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-[#17201a]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
