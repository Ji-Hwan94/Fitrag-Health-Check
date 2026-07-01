import Panel from "@/components/ui/Panel";

const RecommendationPolicyPanel = () => {
  return (
    <Panel title="추천 정책">
      <ul className="space-y-3 text-sm leading-6 text-[#526052]">
        <li>의료 진단이나 치료 목적의 표현은 제공하지 않습니다.</li>
        <li>부상, 질환, 임신, 섭식장애 등 고위험 조건은 전문가 상담을 안내합니다.</li>
        <li>운동 강도는 경험 수준과 회복 가능성을 기준으로 보수적으로 조정합니다.</li>
        <li>RAG 근거가 부족한 경우 확정적으로 표현하지 않습니다.</li>
      </ul>
    </Panel>
  );
};

export default RecommendationPolicyPanel;
