import Panel from "@/components/ui/Panel";

export default function RecommendationPolicyPanel() {
  return (
    <Panel title="추천 정책">
      <ul className="space-y-3 text-sm leading-6 text-[#526052]">
        <li>RAG 문서 근거가 부족하면 확정 표현을 피합니다.</li>
        <li>부상 이력이 있으면 운동 강도를 보수적으로 조정합니다.</li>
        <li>극단적인 칼로리 제한 대신 지속 가능한 식단을 제안합니다.</li>
      </ul>
    </Panel>
  );
}
