import GoalForm from "@/components/forms/GoalForm";
import AppHeader from "@/components/layout/AppHeader";

const GoalsPage = () => {
  return (
    <main className="min-h-screen bg-[#f4f6f1] text-[#152018]">
      <AppHeader />
      <section className="mx-auto grid max-w-3xl gap-5 px-5 py-10 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#3d6d5a]">
            FR-002
          </p>
          <h1 className="mt-3 text-3xl font-semibold">목표 입력</h1>
          <p className="mt-3 text-sm leading-6 text-[#526052]">
            감량, 증량, 근육 증가, 체지방 감소, 체력 향상 중 목표를 고르고
            목표 수치와 운동 가능 시간을 입력합니다.
          </p>
        </div>
        <GoalForm />
      </section>
    </main>
  );
};

export default GoalsPage;
