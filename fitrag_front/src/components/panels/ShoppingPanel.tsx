import Panel from "@/components/ui/Panel";

const shoppingItems = ["닭가슴살", "현미밥", "그릭요거트", "계란", "고구마"];

function coupangSearchUrl(item: string) {
  return `https://www.coupang.com/np/search?q=${encodeURIComponent(item)}`;
}

export default function ShoppingPanel() {
  return (
    <Panel title="장보기">
      <div className="flex flex-wrap gap-2">
        {shoppingItems.map((item) => (
          <a
            key={item}
            className="rounded-md border border-[#cbd4c4] bg-white px-3 py-2 text-sm font-medium text-[#344238] transition hover:border-[#52735d] hover:bg-[#eef3e9] focus:outline-none focus:ring-2 focus:ring-[#52735d]/25"
            href={coupangSearchUrl(item)}
            rel="noreferrer"
            target="_blank"
          >
            {item}
          </a>
        ))}
      </div>
    </Panel>
  );
}
