import LoginForm from "@/components/forms/LoginForm";
import AppHeader from "@/components/layout/AppHeader";

const LoginPage = () => {
  return (
    <main className="min-h-screen bg-[#f4f6f1] text-[#152018]">
      <AppHeader />
      <section className="mx-auto grid max-w-xl gap-5 px-5 py-10 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#3d6d5a]">
            FR-001
          </p>
          <h1 className="mt-3 text-3xl font-semibold">회원 계정</h1>
          <p className="mt-3 text-sm leading-6 text-[#526052]">
            이메일 기반 계정을 만든 뒤 건강 프로필과 목표를 연결합니다.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
};

export default LoginPage;
