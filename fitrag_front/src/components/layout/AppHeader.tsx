"use client";

import Link from "next/link";
import { clearSession } from "@/lib/api";
import { useCoachStore } from "@/store/useCoachStore";

const AppHeader = () => {
  const updateAccount = useCoachStore((state) => state.updateAccount);

  const handleLogout = () => {
    clearSession();
    updateAccount({
      email: "",
      userId: "",
      accessToken: "",
      created: false,
    });
  };

  return (
    <header className="border-b border-[#d8ded7] bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
        <div className="text-lg font-semibold text-[#152018]">FitRAG Coach</div>
        <Link className="nav-link" href="/login" onClick={handleLogout}>
          로그아웃
        </Link>
      </div>
    </header>
  );
};

export default AppHeader;
