'use client';

import { AppSettings } from '../SettingsView';

interface BuildingIcon {
  className?: string;
}

const BuildingIcon = ({ className }: BuildingIcon) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
  </svg>
);

const UploadIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

interface Props {
  restaurantName: string;
  logoUrl: string | null;
  onUpdateName: (name: string) => void;
  onLogoChange: (url: string | null) => void;
}

export default function BusinessSettingsCard({ restaurantName, logoUrl, onUpdateName, onLogoChange }: Props) {
  return (
    <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <BuildingIcon className="w-5 h-5 text-[#e5a825]" />
        Business Settings
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#a0a0a8] mb-2">
            Restaurant Name
          </label>
          <input
            type="text"
            value={restaurantName}
            onChange={(e) => onUpdateName(e.target.value)}
            className="w-full max-w-md px-4 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40 focus:border-[#e5a825]"
          />
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-[#a0a0a8] mb-2">
            Logo
          </label>
          <div className="flex items-center gap-4">
            {/* Current Logo Preview */}
            <div className="w-16 h-16 bg-[#e5a825] rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[#0d0d0f] font-bold text-2xl">B</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label className="px-4 py-2 bg-[#141417] text-white border border-[#2a2a32] rounded-lg font-medium hover:bg-[#222228] transition-colors cursor-pointer flex items-center gap-2">
                  <UploadIcon className="w-4 h-4" />
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          onLogoChange(event.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                {logoUrl && (
                  <button
                    onClick={() => onLogoChange(null)}
                    className="px-3 py-2 bg-[#141417] text-[#ef4444] border border-[#2a2a32] rounded-lg font-medium hover:bg-[#ef4444]/10 hover:border-[#ef4444]/30 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-[#6b6b75]">
                Recommended: Square image, at least 88x88 pixels
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
