'use client';

import { AppSettings } from '../SettingsView';

interface RulesIcon {
  className?: string;
}

const RulesIcon = ({ className }: RulesIcon) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
  </svg>
);

interface Props {
  settings: AppSettings;
  onUpdateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export default function SchedulingRulesCard({ settings, onUpdateSetting }: Props) {
  return (
    <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <RulesIcon className="w-5 h-5 text-[#e5a825]" />
        Scheduling Rules
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-[#a0a0a8] mb-2">
            Overtime Threshold (hours/week)
          </label>
          <input
            type="number"
            min="20"
            max="60"
            value={settings.overtimeThreshold}
            onChange={(e) => onUpdateSetting('overtimeThreshold', parseInt(e.target.value) || 40)}
            className="w-full max-w-[120px] px-4 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
          />
          <p className="text-xs text-[#6b6b75] mt-1">Warn when employee approaches this many hours</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#a0a0a8] mb-2">
            Min Rest Between Shifts (hours)
          </label>
          <input
            type="number"
            min="4"
            max="24"
            value={settings.minRestBetweenShifts}
            onChange={(e) => onUpdateSetting('minRestBetweenShifts', parseInt(e.target.value) || 8)}
            className="w-full max-w-[120px] px-4 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
          />
          <p className="text-xs text-[#6b6b75] mt-1">Minimum hours between end of one shift and start of next</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#a0a0a8] mb-2">
            Bartending Skill Threshold
          </label>
          <select
            value={settings.bartendingThreshold}
            onChange={(e) => onUpdateSetting('bartendingThreshold', parseInt(e.target.value))}
            className="w-full max-w-[120px] px-4 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
          >
            {[1, 2, 3, 4, 5].map(n => (
              <option key={n} value={n}>{n} stars</option>
            ))}
          </select>
          <p className="text-xs text-[#6b6b75] mt-1">Employees below this need a higher-rated bartender on shift</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#a0a0a8] mb-2">
            Can Work Alone Threshold
          </label>
          <select
            value={settings.aloneThreshold}
            onChange={(e) => onUpdateSetting('aloneThreshold', parseInt(e.target.value))}
            className="w-full max-w-[120px] px-4 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
          >
            {[1, 2, 3, 4, 5].map(n => (
              <option key={n} value={n}>{n} stars</option>
            ))}
          </select>
          <p className="text-xs text-[#6b6b75] mt-1">Rating needed for an employee to work alone</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#a0a0a8] mb-2">
            Minimum Shift Hours
          </label>
          <input
            type="number"
            min="1"
            max="8"
            step="0.5"
            value={settings.minShiftHours}
            onChange={(e) => onUpdateSetting('minShiftHours', parseFloat(e.target.value) || 3)}
            className="w-full max-w-[120px] px-4 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
          />
          <p className="text-xs text-[#6b6b75] mt-1">Servers must work at least this many hours per shift</p>
        </div>
      </div>
    </div>
  );
}
