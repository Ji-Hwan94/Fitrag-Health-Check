import Panel from "@/components/ui/Panel";
import Metric from "@/components/ui/Metric";

const nutritionTargets = [
  ["권장 칼로리", "2,100 kcal"],
  ["단백질", "140 g"],
  ["탄수화물", "230 g"],
  ["지방", "60 g"],
];

export default function NutritionTargetsPanel() {
  return (
    <Panel title="영양 목표">
      <div className="grid grid-cols-2 gap-3">
        {nutritionTargets.map(([label, value]) => (
          <Metric key={label} label={label} value={value} />
        ))}
      </div>
    </Panel>
  );
}
