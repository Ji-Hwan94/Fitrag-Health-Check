"use client";

import NumberInput from "@/components/ui/NumberInput";
import Panel from "@/components/ui/Panel";
import { useCoachStore } from "@/store/useCoachStore";

export default function ProfileForm() {
  const { profile, updateProfile } = useCoachStore();

  return (
    <Panel title="신체 정보 입력">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-[#344238]">
          성별
          <select
            className="h-11 rounded-md border border-[#cbd4c4] bg-white px-3 text-sm outline-none transition focus:border-[#52735d] focus:ring-2 focus:ring-[#52735d]/20"
            value={profile.gender}
            onChange={(event) => updateProfile({ gender: event.target.value })}
          >
            <option value="male">남성</option>
            <option value="female">여성</option>
            <option value="none">응답 안 함</option>
          </select>
        </label>
        <NumberInput
          label="나이"
          min={10}
          suffix="세"
          value={profile.age}
          onChange={(age) => updateProfile({ age })}
        />
        <NumberInput
          label="키"
          min={120}
          suffix="cm"
          value={profile.heightCm}
          onChange={(heightCm) => updateProfile({ heightCm })}
        />
        <NumberInput
          label="현재 체중"
          min={30}
          suffix="kg"
          value={profile.weightKg}
          onChange={(weightKg) => updateProfile({ weightKg })}
        />
        <label className="grid gap-2 text-sm font-medium text-[#344238] md:col-span-2">
          부상 이력
          <textarea
            className="min-h-24 rounded-md border border-[#cbd4c4] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#52735d] focus:ring-2 focus:ring-[#52735d]/20"
            value={profile.injuries}
            onChange={(event) => updateProfile({ injuries: event.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#344238] md:col-span-2">
          식단 제한 조건
          <textarea
            className="min-h-24 rounded-md border border-[#cbd4c4] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#52735d] focus:ring-2 focus:ring-[#52735d]/20"
            value={profile.dietaryRestrictions}
            onChange={(event) =>
              updateProfile({ dietaryRestrictions: event.target.value })
            }
          />
        </label>
      </div>
    </Panel>
  );
}
