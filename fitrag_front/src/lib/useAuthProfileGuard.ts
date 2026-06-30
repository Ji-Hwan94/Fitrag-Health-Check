"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProfile, loadSession } from "@/lib/api";
import { useCoachStore } from "@/store/useCoachStore";

export const useAuthProfileGuard = (requireProfile: boolean) => {
  const router = useRouter();
  const updateAccount = useCoachStore((state) => state.updateAccount);

  useEffect(() => {
    let cancelled = false;

    const runGuard = async () => {
      const session = loadSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      updateAccount({
        email: session.email,
        userId: session.userId,
        accessToken: session.accessToken,
        created: true,
      });

      if (!requireProfile) return;

      try {
        await getProfile(session.accessToken);
      } catch {
        if (cancelled) return;
        window.confirm("아직 건강 프로필을 입력하지 않으셨습니다. 입력하시겠습니까?");
        router.replace("/profile");
      }
    };

    void runGuard();

    return () => {
      cancelled = true;
    };
  }, [requireProfile, router, updateAccount]);
};
