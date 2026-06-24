import LoginForm from "@/components/forms/LoginForm";
import AppHeader from "@/components/layout/AppHeader";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f3] text-[#17201a]">
      <AppHeader />
      <section className="mx-auto grid max-w-xl gap-5 px-5 py-10 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#52735d]">
            Account
          </p>
          <h1 className="mt-3 text-3xl font-semibold">로그인</h1>
          <p className="mt-3 text-sm leading-6 text-[#526052]">
            실제 로그인 인증은 추후 구현하고, 지금은 입력 흐름 확인용
            화면입니다.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
