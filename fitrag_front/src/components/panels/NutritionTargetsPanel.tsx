"use client";

import Panel from "@/components/ui/Panel";
import Metric from "@/components/ui/Metric";
import { buildNutritionTargets } from "@/lib/recommendations";
import { useCoachStore } from "@/store/useCoachStore";

const NutritionTargetsPanel = () => {
  const { fullRecommendation, goal, profile } = useCoachStore();
  const nutrition = buildNutritionTargets(profile, goal);
  const mealPlan = fullRecommendation?.meal_plan;
  const meals = mealPlan?.meals ?? nutrition.meals;

  return (
    <Panel title="식단과 영양 목표">
      <div className="grid grid-cols-2 gap-3">
        <Metric
          label="권장 칼로리"
          value={`${mealPlan?.daily_calories ?? nutrition.dailyCalories} kcal`}
        />
        <Metric label="단백질" value={`${mealPlan?.protein_g ?? nutrition.proteinG} g`} />
        <Metric label="탄수화물" value={`${mealPlan?.carbs_g ?? nutrition.carbsG} g`} />
        <Metric label="지방" value={`${mealPlan?.fat_g ?? nutrition.fatG} g`} />
      </div>
      <div className="mt-5 grid gap-3">
        {meals.map((meal) => (
          <div
            key={meal.type}
            className="rounded-md border border-[#d8ded7] bg-[#fbfcf8] p-4"
          >
            <p className="text-sm font-semibold text-[#344238]">{meal.type}</p>
            <p className="mt-1 text-sm font-medium text-[#152018]">{meal.menu}</p>
            <p className="mt-2 text-sm leading-6 text-[#526052]">{meal.notes}</p>
          </div>
        ))}
      </div>
      {mealPlan?.nutrition_notes.length ? (
        <ul className="mt-4 grid gap-2">
          {mealPlan.nutrition_notes.map((note) => (
            <li
              key={note}
              className="rounded-md bg-[#e8f2eb] px-3 py-2 text-sm leading-6 text-[#405143]"
            >
              {note}
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
};

export default NutritionTargetsPanel;
