import Link from "next/link";
import Panel from "@/components/ui/Panel";

export default function LoginForm() {
  return (
    <Panel title="로그인">
      <form className="grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-[#344238]">
          이메일
          <input
            className="h-11 rounded-md border border-[#cbd4c4] bg-white px-3 text-sm outline-none transition focus:border-[#52735d] focus:ring-2 focus:ring-[#52735d]/20"
            placeholder="user@example.com"
            type="email"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#344238]">
          비밀번호
          <input
            className="h-11 rounded-md border border-[#cbd4c4] bg-white px-3 text-sm outline-none transition focus:border-[#52735d] focus:ring-2 focus:ring-[#52735d]/20"
            placeholder="인증 기능은 추후 연결"
            type="password"
          />
        </label>
        <Link
          className="grid h-11 place-items-center rounded-md bg-[#17201a] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3a31]"
          href="/profile"
        >
          임시로 시작하기
        </Link>
      </form>
    </Panel>
  );
}
