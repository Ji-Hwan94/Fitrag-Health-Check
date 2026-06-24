import ProfileForm from "@/components/forms/ProfileForm";
import AppHeader from "@/components/layout/AppHeader";

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-[#f7f8f3] text-[#17201a]">
      <AppHeader />
      <section className="mx-auto grid max-w-3xl gap-5 px-5 py-10 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#52735d]">
            Step 1
          </p>
          <h1 className="mt-3 text-3xl font-semibold">신체 정보 입력</h1>
          <p className="mt-3 text-sm leading-6 text-[#526052]">
            운동 강도와 식단 추천에 필요한 기본 신체 정보를 입력합니다.
          </p>
        </div>
        <ProfileForm />
      </section>
    </main>
  );
}
