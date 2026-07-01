"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Panel from "@/components/ui/Panel";
import { getProfile, listGoals, login, saveSession, signup } from "@/lib/api";
import { useCoachStore } from "@/store/useCoachStore";

type AuthMode = "signup" | "login";

const LoginForm = () => {
  const router = useRouter();
  const { account, updateAccount } = useCoachStore();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState(account.email);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    const passwordReady = password.length >= 8;
    const emailReady = email.includes("@") && email.includes(".");
    const nameReady = mode === "login" || name.trim().length > 0;
    const confirmReady = mode === "login" || password === confirmPassword;

    return emailReady && passwordReady && nameReady && confirmReady;
  }, [confirmPassword, email, mode, name, password]);

  const resolveNextRoute = async (accessToken: string) => {
    if (mode === "signup") return "/profile";

    try {
      await getProfile(accessToken);
    } catch {
      return "/profile";
    }

    try {
      const goals = await listGoals(accessToken);
      return goals.length > 0 ? "/" : "/goals";
    } catch {
      return "/goals";
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      setStatus("이메일, 이름, 8자 이상 비밀번호를 확인해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setStatus("");

    try {
      const result =
        mode === "signup"
          ? await signup({ email, password, name: name.trim() })
          : await login({ email, password });
      const session = {
        email,
        userId: result.user_id,
        accessToken: result.access_token,
      };

      saveSession(session);
      updateAccount({ ...session, created: true });
      router.push(await resolveNextRoute(result.access_token));
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "인증 요청 중 오류가 발생했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Panel title={mode === "signup" ? "이메일 계정 만들기" : "이메일 로그인"}>
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-2 rounded-md border border-[#c9d2c8] bg-[#f4f6f1] p-1">
          {(["signup", "login"] as const).map((value) => (
            <button
              key={value}
              className={`h-9 rounded text-sm font-semibold transition ${
                mode === value
                  ? "bg-white text-[#152018] shadow-sm"
                  : "text-[#526052] hover:text-[#152018]"
              }`}
              type="button"
              onClick={() => {
                setMode(value);
                setStatus("");
              }}
            >
              {value === "signup" ? "계정 생성" : "로그인"}
            </button>
          ))}
        </div>
        <label className="grid gap-2 text-sm font-medium text-[#344238]">
          이메일
          <input
            className="form-field"
            placeholder="user@example.com"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        {mode === "signup" ? (
          <label className="grid gap-2 text-sm font-medium text-[#344238]">
            이름
            <input
              className="form-field"
              placeholder="홍길동"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        ) : null}
        <label className="grid gap-2 text-sm font-medium text-[#344238]">
          비밀번호
          <input
            className="form-field"
            minLength={8}
            placeholder="8자 이상 입력"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {mode === "signup" ? (
          <label className="grid gap-2 text-sm font-medium text-[#344238]">
            비밀번호 확인
            <input
              className="form-field"
              minLength={8}
              placeholder="같은 비밀번호 입력"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
        ) : null}
        {status ? <p className="text-sm text-[#526052]">{status}</p> : null}
        <button
          className="primary-button"
          disabled={!canSubmit || isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? "처리 중"
            : mode === "signup"
              ? "계정 생성 후 프로필 입력"
              : "로그인"}
        </button>
      </form>
    </Panel>
  );
};

export default LoginForm;
