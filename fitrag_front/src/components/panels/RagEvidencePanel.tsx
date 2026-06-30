"use client";

import Panel from "@/components/ui/Panel";
import { buildEvidence } from "@/lib/recommendations";
import { useCoachStore } from "@/store/useCoachStore";

const RagEvidencePanel = () => {
  const { fullRecommendation, goal, profile } = useCoachStore();
  const evidenceSources = buildEvidence(profile, goal);
  const ragEvidence =
    fullRecommendation?.rag_evidence.map((source) => ({
      source: source.source,
      title: source.title,
      summary: source.chunk_text,
      url: source.source_url ?? "#",
    })) ?? evidenceSources;

  return (
    <Panel title="RAG 근거">
      <div className="grid gap-3 md:grid-cols-3">
        {ragEvidence.map((source) => (
          <div
            key={source.title}
            className="rounded-md border border-[#d8ded7] bg-[#fbfcf8] p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#3d6d5a]">
              {source.source}
            </p>
            <p className="mt-2 text-sm font-semibold text-[#344238]">
              {source.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#526052]">
              {source.summary}
            </p>
            {source.url === "#" ? (
              <p className="mt-3 text-xs font-semibold text-[#6b766c]">
                내부 FitRAG 문서
              </p>
            ) : (
              <a
                className="mt-3 inline-flex text-sm font-semibold text-[#2f604e] underline-offset-4 hover:underline"
                href={source.url}
                rel="noreferrer"
                target="_blank"
              >
                참고 자료 링크
              </a>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
};

export default RagEvidencePanel;
