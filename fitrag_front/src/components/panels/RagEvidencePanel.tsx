import Panel from "@/components/ui/Panel";

const evidenceSources = [
  "WHO 신체활동 가이드라인",
  "ACSM 운동 강도 기준",
  "ISSN 스포츠 영양 권장량",
];

export default function RagEvidencePanel() {
  return (
    <Panel title="RAG 근거">
      <div className="grid gap-3 md:grid-cols-3">
        {evidenceSources.map((source) => (
          <div
            key={source}
            className="rounded-md border border-[#d9dfd1] bg-[#fbfcf8] p-4"
          >
            <p className="text-sm font-semibold text-[#344238]">{source}</p>
            <p className="mt-2 text-sm leading-6 text-[#526052]">
              추천 생성 시 검색 근거로 연결될 문서 후보입니다.
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
