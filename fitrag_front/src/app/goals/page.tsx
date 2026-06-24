import GoalForm from "@/components/forms/GoalForm";
import AppHeader from "@/components/layout/AppHeader";

export default function GoalsPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f3] text-[#17201a]">
      <AppHeader />
      <section className="mx-auto grid max-w-3xl gap-5 px-5 py-10 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#52735d]">
            Step 2
          </p>
          <h1 className="mt-3 text-3xl font-semibold">목표 입력</h1>
          <p className="mt-3 text-sm leading-6 text-[#526052]">
            목표 유형, 목표 체중, 운동 가능 시간을 분리해서 관리합니다.
          </p>
        </div>
        <GoalForm />
      </section>
    </main>
  );
}
