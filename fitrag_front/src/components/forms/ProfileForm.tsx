"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NumberInput from "@/components/ui/NumberInput";
import Panel from "@/components/ui/Panel";
import {
  getProfile,
  HealthProfileResponse,
  loadSession,
  upsertProfile,
} from "@/lib/api";
import { useAuthProfileGuard } from "@/lib/useAuthProfileGuard";
import {
  experienceLabels,
  ExperienceLevel,
  Gender,
  genderLabels,
  useCoachStore,
} from "@/store/useCoachStore";

const injuryOptions = ["무릎", "허리", "어깨", "손목", "발목"];
const allergyOptions = ["없음", "유제품", "견과류", "해산물", "달걀"];
const restrictionOptions = ["채식", "비건", "저탄수", "저염", "당 제한", "글루텐 제한"];

const toggleValue = (values: string[], value: string) => {
  if (value === "없음") return values.includes(value) ? [] : ["없음"];
  const next = values.filter((item) => item !== "없음");
  return next.includes(value)
    ? next.filter((item) => item !== value)
    : [...next, value];
};

const splitList = (value: string | null | undefined) =>
  value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];

const joinList = (values: string[]) =>
  values.length ? values.join(", ") : undefined;

const toNumber = (
  value: string | number | null | undefined,
  fallback: number,
) => {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toOptionalNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const CheckboxGroup = ({
  label,
  options,
  values,
  onChange,
}: Readonly<{
  label: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}>) => (
  <fieldset className="grid gap-3 md:col-span-2">
    <legend className="text-sm font-medium text-[#344238]">{label}</legend>
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const checked = values.includes(option);

        return (
          <label
            key={option}
            className={`flex h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium transition ${
              checked
                ? "border-[#3d6d5a] bg-[#e8f2eb] text-[#152018]"
                : "border-[#c9d2c8] bg-white text-[#526052] hover:border-[#3d6d5a]"
            }`}
          >
            <input
              checked={checked}
              className="h-4 w-4 accent-[#3d6d5a]"
              type="checkbox"
              onChange={() => onChange(toggleValue(values, option))}
            />
            {option}
          </label>
        );
      })}
    </div>
  </fieldset>
);

const ProfileForm = () => {
  useAuthProfileGuard(false);

  const router = useRouter();
  const { account, profile, updateAccount, updateGoal, updateProfile } =
    useCoachStore();
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const applyProfile = (savedProfile: HealthProfileResponse) => {
    const experienceLevel =
      (savedProfile.activity_level as ExperienceLevel | null) ?? "beginner";

    updateProfile({
      gender: (savedProfile.gender as Gender | null) ?? "none",
      age: savedProfile.age ?? profile.age,
      heightCm: toNumber(savedProfile.height_cm, profile.heightCm),
      weightKg: toNumber(savedProfile.weight_kg, profile.weightKg),
      muscleMassKg: toOptionalNumber(savedProfile.muscle_mass_kg),
      fatMassKg: toOptionalNumber(savedProfile.fat_mass_kg),
      bodyFatPercentage: toOptionalNumber(savedProfile.body_fat_percentage),
      experienceLevel,
      injuries: splitList(savedProfile.injuries),
      allergies: splitList(savedProfile.allergies),
      dietaryRestrictions: splitList(savedProfile.dietary_restrictions),
      foodPreferences: savedProfile.food_preferences ?? "",
      medicalNotes: savedProfile.medical_notes ?? "",
    });
    updateGoal({ experienceLevel });
  };

  useEffect(() => {
    let cancelled = false;

    const syncProfile = async () => {
      const session = loadSession();
      await Promise.resolve();

      if (cancelled || !session) return;

      updateAccount({
        email: session.email,
        userId: session.userId,
        accessToken: session.accessToken,
        created: true,
      });

      try {
        const savedProfile = await getProfile(session.accessToken);
        if (cancelled) return;
        applyProfile(savedProfile);
        setStatus("저장된 프로필을 불러왔습니다.");
      } catch {
        if (cancelled) return;
        setStatus("새 프로필을 입력해 저장할 수 있습니다.");
      }
    };

    void syncProfile();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExperienceChange = (experienceLevel: ExperienceLevel) => {
    updateProfile({ experienceLevel });
    updateGoal({ experienceLevel });
  };

  const handleSave = async () => {
    const token = account.accessToken || loadSession()?.accessToken;
    if (!token) {
      router.replace("/login");
      return;
    }

    setIsSaving(true);
    setStatus("");

    if (profile.gender === "none") {
      setIsSaving(false);
      setStatus("성별은 필수 입력 요소입니다.");
      return;
    }

    if (
      !profile.experienceLevel ||
      profile.age < 10 ||
      profile.heightCm < 120 ||
      profile.weightKg < 30
    ) {
      setIsSaving(false);
      setStatus("운동 경험 수준, 나이, 키, 현재 체중을 확인해주세요.");
      return;
    }

    try {
      const savedProfile = await upsertProfile(token, {
        gender: profile.gender,
        age: profile.age,
        height_cm: profile.heightCm,
        weight_kg: profile.weightKg,
        muscle_mass_kg: profile.muscleMassKg,
        fat_mass_kg: profile.fatMassKg,
        body_fat_percentage: profile.bodyFatPercentage,
        activity_level: profile.experienceLevel,
        injuries: joinList(profile.injuries),
        allergies: joinList(profile.allergies),
        dietary_restrictions: joinList(profile.dietaryRestrictions),
        food_preferences: profile.foodPreferences || undefined,
        medical_notes: profile.medicalNotes || undefined,
      });
      applyProfile(savedProfile);
      router.push("/goals");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "프로필 저장 중 오류가 발생했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Panel title="사용자 건강 프로필">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-[#d8ded7] bg-[#f7f8f3] p-4 text-sm leading-6 text-[#526052] md:col-span-2">
          {account.created
            ? `${account.email} 계정과 연결되어 있습니다.`
            : "계정 확인 중입니다."}
        </div>
        <label className="grid gap-2 text-sm font-medium text-[#344238]">
          성별
          <span className="text-xs font-normal text-[#8a4b3d]">필수</span>
          <select
            className="form-field"
            value={profile.gender}
            onChange={(event) =>
              updateProfile({ gender: event.target.value as Gender })
            }
          >
            {Object.entries(genderLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#344238]">
          운동 경험 수준
          <span className="text-xs font-normal text-[#8a4b3d]">필수</span>
          <select
            className="form-field"
            value={profile.experienceLevel}
            onChange={(event) =>
              handleExperienceChange(event.target.value as ExperienceLevel)
            }
          >
            {Object.entries(experienceLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <NumberInput
          label="나이 (필수)"
          min={10}
          suffix="세"
          value={profile.age}
          onChange={(age) => updateProfile({ age })}
        />
        <NumberInput
          label="키 (필수)"
          min={120}
          suffix="cm"
          value={profile.heightCm}
          onChange={(heightCm) => updateProfile({ heightCm })}
        />
        <NumberInput
          label="현재 체중 (필수)"
          min={30}
          suffix="kg"
          value={profile.weightKg}
          onChange={(weightKg) => updateProfile({ weightKg })}
        />
        <NumberInput
          label="현재 근육량"
          min={0}
          suffix="kg"
          value={profile.muscleMassKg ?? 0}
          onChange={(muscleMassKg) =>
            updateProfile({ muscleMassKg: muscleMassKg || null })
          }
        />
        <p className="text-xs leading-5 text-[#6b766c] md:col-span-2">
          현재 근육량, 체지방량, 체지방률을 비워두면 성별, 나이, 키,
          체중을 기준으로 평균 추정값을 저장합니다.
        </p>
        <NumberInput
          label="현재 체지방량"
          min={0}
          suffix="kg"
          value={profile.fatMassKg ?? 0}
          onChange={(fatMassKg) =>
            updateProfile({ fatMassKg: fatMassKg || null })
          }
        />
        <NumberInput
          label="현재 체지방률"
          max={100}
          min={0}
          suffix="%"
          value={profile.bodyFatPercentage ?? 0}
          onChange={(bodyFatPercentage) =>
            updateProfile({ bodyFatPercentage: bodyFatPercentage || null })
          }
        />
        <CheckboxGroup
          label="부상 이력"
          options={injuryOptions}
          values={profile.injuries}
          onChange={(injuries) => updateProfile({ injuries })}
        />
        <CheckboxGroup
          label="알레르기"
          options={allergyOptions}
          values={profile.allergies}
          onChange={(allergies) => updateProfile({ allergies })}
        />
        <CheckboxGroup
          label="식단 제한 조건"
          options={restrictionOptions}
          values={profile.dietaryRestrictions}
          onChange={(dietaryRestrictions) =>
            updateProfile({ dietaryRestrictions })
          }
        />
        <label className="grid gap-2 text-sm font-medium text-[#344238] md:col-span-2">
          선호/비선호 음식
          <input
            className="form-field"
            placeholder="예: 닭가슴살 선호, 우유 비선호"
            value={profile.foodPreferences}
            onChange={(event) =>
              updateProfile({ foodPreferences: event.target.value })
            }
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#344238] md:col-span-2">
          질환 또는 주의사항
          <textarea
            className="min-h-24 rounded-md border border-[#c9d2c8] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#3d6d5a] focus:ring-2 focus:ring-[#3d6d5a]/20"
            placeholder="운동/식단에 참고할 주의사항만 적어 주세요."
            value={profile.medicalNotes}
            onChange={(event) =>
              updateProfile({ medicalNotes: event.target.value })
            }
          />
        </label>
        {status ? (
          <p className="text-sm leading-6 text-[#526052] md:col-span-2">
            {status}
          </p>
        ) : null}
        <button
          className="primary-button md:col-span-2"
          disabled={isSaving}
          type="button"
          onClick={handleSave}
        >
          {isSaving ? "저장 중" : "프로필 저장"}
        </button>
      </div>
    </Panel>
  );
};

export default ProfileForm;
