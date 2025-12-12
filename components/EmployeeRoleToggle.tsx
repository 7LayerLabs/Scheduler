'use client';

import type { ChangeEvent } from 'react';

export default function EmployeeRoleToggle(props: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const { label, description, checked, disabled, onChange } = props;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <label className={`flex items-start gap-3 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
        className="mt-1 h-4 w-4 accent-[#e5a825]"
      />
      <div className="min-w-0">
        <div className="text-sm font-medium text-white">{label}</div>
        {description && <div className="text-xs text-[#6b6b75]">{description}</div>}
      </div>
    </label>
  );
}


