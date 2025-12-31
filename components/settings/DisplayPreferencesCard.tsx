'use client';

import { AppSettings } from '../SettingsView';

interface DisplayIcon {
  className?: string;
}

const DisplayIcon = ({ className }: DisplayIcon) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
  </svg>
);

interface Props {
  settings: AppSettings;
  onUpdateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export default function DisplayPreferencesCard({ settings, onUpdateSetting }: Props) {
  return (
    <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <DisplayIcon className="w-5 h-5 text-[#e5a825]" />
        Display Preferences
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-[#a0a0a8] mb-2">
            Time Format
          </label>
          <div className="flex gap-3">
            <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border transition-colors ${settings.timeFormat === '12h'
              ? 'bg-[#e5a825]/10 border-[#e5a825] text-[#e5a825]'
              : 'bg-[#141417] border-[#2a2a32] text-[#6b6b75] hover:border-[#3a3a45]'
              }`}>
              <input
                type="radio"
                name="timeFormat"
                value="12h"
                checked={settings.timeFormat === '12h'}
                onChange={() => onUpdateSetting('timeFormat', '12h')}
                className="hidden"
              />
              <span className="text-sm font-medium">12-hour (2:00 PM)</span>
            </label>
            <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border transition-colors ${settings.timeFormat === '24h'
              ? 'bg-[#e5a825]/10 border-[#e5a825] text-[#e5a825]'
              : 'bg-[#141417] border-[#2a2a32] text-[#6b6b75] hover:border-[#3a3a45]'
              }`}>
              <input
                type="radio"
                name="timeFormat"
                value="24h"
                checked={settings.timeFormat === '24h'}
                onChange={() => onUpdateSetting('timeFormat', '24h')}
                className="hidden"
              />
              <span className="text-sm font-medium">24-hour (14:00)</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#a0a0a8] mb-2">
            Week Starts On
          </label>
          <div className="flex gap-3">
            <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border transition-colors ${settings.weekStartDay === 'monday'
              ? 'bg-[#e5a825]/10 border-[#e5a825] text-[#e5a825]'
              : 'bg-[#141417] border-[#2a2a32] text-[#6b6b75] hover:border-[#3a3a45]'
              }`}>
              <input
                type="radio"
                name="weekStart"
                value="monday"
                checked={settings.weekStartDay === 'monday'}
                onChange={() => onUpdateSetting('weekStartDay', 'monday')}
                className="hidden"
              />
              <span className="text-sm font-medium">Monday</span>
            </label>
            <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border transition-colors ${settings.weekStartDay === 'sunday'
              ? 'bg-[#e5a825]/10 border-[#e5a825] text-[#e5a825]'
              : 'bg-[#141417] border-[#2a2a32] text-[#6b6b75] hover:border-[#3a3a45]'
              }`}>
              <input
                type="radio"
                name="weekStart"
                value="sunday"
                checked={settings.weekStartDay === 'sunday'}
                onChange={() => onUpdateSetting('weekStartDay', 'sunday')}
                className="hidden"
              />
              <span className="text-sm font-medium">Sunday</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
