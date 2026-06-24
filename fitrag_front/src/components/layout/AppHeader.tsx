import Link from "next/link";

export default function AppHeader() {
  return (
    <header className="border-b border-[#d9dfd1] bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <Link className="text-lg font-semibold text-[#17201a]" href="/">
          FitRAG Coach
        </Link>
        <nav className="flex flex-wrap gap-2 text-sm font-medium">
          <Link className="nav-link" href="/login">
            로그인
          </Link>
          <Link className="nav-link" href="/profile">
            신체 정보
          </Link>
          <Link className="nav-link" href="/goals">
            목표 입력
          </Link>
        </nav>
      </div>
    </header>
  );
}
