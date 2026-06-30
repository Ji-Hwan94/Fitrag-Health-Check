import ProfileForm from "@/components/forms/ProfileForm";
import AppHeader from "@/components/layout/AppHeader";

const ProfilePage = () => {
  return (
    <main className="min-h-screen bg-[#f4f6f1] text-[#152018]">
      <AppHeader />
      <section className="mx-auto grid max-w-4xl gap-5 px-5 py-10 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#3d6d5a]">
            FR-001
          </p>
          <h1 className="mt-3 text-3xl font-semibold">건강 프로필 입력</h1>
          <p className="mt-3 text-sm leading-6 text-[#526052]">
            성별, 나이, 키, 현재 체중, 운동 경험 수준을 필수로 입력하고
            부상 이력, 알레르기, 식단 제한 조건은 추천 안전장치에 반영합니다.
          </p>
        </div>
        <ProfileForm />
      </section>
    </main>
  );
};

export default ProfilePage;
