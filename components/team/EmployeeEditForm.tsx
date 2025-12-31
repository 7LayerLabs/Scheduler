'use client';

import { Availability, EmployeeRestriction, PermanentRule } from '@/lib/types';
import AvailabilityEditor from './AvailabilityEditor';
import RestrictionsEditor from './RestrictionsEditor';
import PermanentRulesEditor from './PermanentRulesEditor';

interface Props {
  name: string;
  phoneNumber: string;
  bartending: number;
  alone: number;
  minShifts: number | undefined;
  availability: Availability | null;
  restrictions: EmployeeRestriction[];
  permanentRules: PermanentRule[];
  onNameChange: (name: string) => void;
  onPhoneChange: (phone: string) => void;
  onBartendingChange: (scale: number) => void;
  onAloneChange: (scale: number) => void;
  onMinShiftsChange: (shifts: number | undefined) => void;
  onAvailabilityChange: (availability: Availability) => void;
  onRestrictionsChange: (restrictions: EmployeeRestriction[]) => void;
  onPermanentRulesChange: (rules: PermanentRule[]) => void;
}

export default function EmployeeEditForm({
  name,
  phoneNumber,
  bartending,
  alone,
  minShifts,
  availability,
  restrictions,
  permanentRules,
  onNameChange,
  onPhoneChange,
  onBartendingChange,
  onAloneChange,
  onMinShiftsChange,
  onAvailabilityChange,
  onRestrictionsChange,
  onPermanentRulesChange,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <div className="pb-6 border-b border-[#2a2a32]">
        <h4 className="text-sm font-medium text-white mb-3">Contact Information</h4>
        <div className="space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Full Name"
            className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#2a2a32] rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#e5a825]/40 placeholder:text-[#6b6b75]"
          />
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="Phone Number"
            className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#2a2a32] rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#e5a825]/40 placeholder:text-[#6b6b75]"
          />
        </div>
      </div>

      {/* Skills */}
      <div className="pb-6 border-b border-[#2a2a32]">
        <h4 className="text-sm font-medium text-white mb-3">Skills & Requirements</h4>
        <div className="space-y-4">
          {/* Bartending Scale */}
          <div>
            <label className="text-xs font-medium text-[#6b6b75] block mb-2">
              Bartending Skill ({bartending}/10)
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={bartending}
              onChange={(e) => onBartendingChange(parseInt(e.target.value))}
              className="w-full h-2 bg-[#2a2a32] rounded-lg appearance-none cursor-pointer accent-[#e5a825]"
            />
          </div>

          {/* Alone Scale */}
          <div>
            <label className="text-xs font-medium text-[#6b6b75] block mb-2">
              Can Work Alone ({alone}/10)
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={alone}
              onChange={(e) => onAloneChange(parseInt(e.target.value))}
              className="w-full h-2 bg-[#2a2a32] rounded-lg appearance-none cursor-pointer accent-[#e5a825]"
            />
          </div>

          {/* Min Shifts */}
          <div>
            <label className="text-xs font-medium text-[#6b6b75] block mb-2">
              Minimum Shifts Per Week
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={minShifts ?? ''}
              onChange={(e) => onMinShiftsChange(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Leave empty for no minimum"
              className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#2a2a32] rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#e5a825]/40 placeholder:text-[#6b6b75]"
            />
          </div>
        </div>
      </div>

      {/* Availability Editor */}
      {availability && (
        <div className="pb-6 border-b border-[#2a2a32]">
          <AvailabilityEditor
            availability={availability}
            onUpdateAvailability={onAvailabilityChange}
          />
        </div>
      )}

      {/* Restrictions Editor */}
      <div className="pb-6 border-b border-[#2a2a32]">
        <RestrictionsEditor
          restrictions={restrictions}
          onUpdateRestrictions={onRestrictionsChange}
        />
      </div>

      {/* Permanent Rules Editor */}
      <div>
        <PermanentRulesEditor
          rules={permanentRules}
          onUpdateRules={onPermanentRulesChange}
        />
      </div>
    </div>
  );
}
