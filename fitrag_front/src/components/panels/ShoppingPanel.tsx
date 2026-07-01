"use client";

import Panel from "@/components/ui/Panel";
import {
  buildNutritionTargets,
  buildShoppingItems,
} from "@/lib/recommendations";
import { useCoachStore } from "@/store/useCoachStore";

const ShoppingPanel = () => {
  const { fullRecommendation, goal, profile } = useCoachStore();
  const nutrition = buildNutritionTargets(profile, goal);
  const fallbackItems = buildShoppingItems(nutrition);
  const shoppingItems =
    fullRecommendation?.meal_plan.shopping_items.map((item) => ({
      name: item.name,
      quantity: item.quantity ?? "1주분",
      keyword: item.search_keyword ?? `${item.name} 식단`,
      url:
        item.search_url ??
        `https://www.coupang.com/np/search?q=${encodeURIComponent(item.name)}`,
    })) ?? fallbackItems;

  return (
    <Panel title="장보기 검색">
      <div className="grid gap-3">
        {shoppingItems.map((item) => (
          <a
            key={item.keyword}
            className="rounded-md border border-[#c9d2c8] bg-white p-3 text-sm transition hover:border-[#3d6d5a] hover:bg-[#f7f8f3] focus:outline-none focus:ring-2 focus:ring-[#3d6d5a]/25"
            href={item.url}
            rel="noreferrer"
            target="_blank"
          >
            <span className="block font-semibold text-[#152018]">{item.name}</span>
            <span className="mt-1 block text-[#526052]">
              {item.quantity} · {item.keyword}
            </span>
          </a>
        ))}
      </div>
    </Panel>
  );
};

export default ShoppingPanel;
