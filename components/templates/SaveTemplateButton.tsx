'use client';

import { useState } from 'react';
import { useCurrentUser } from '@/lib/instantdb';
import SaveTemplateModal from './SaveTemplateModal';

interface SaveTemplateButtonProps {
  hasSchedule: boolean;
  assignments: any[];
  onTemplateSaved?: () => void;
}

export default function SaveTemplateButton({
  hasSchedule,
  assignments,
  onTemplateSaved,
}: SaveTemplateButtonProps) {
  const { profile } = useCurrentUser();
  const [showModal, setShowModal] = useState(false);

  if (!hasSchedule || !profile) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-[#f59e0b] text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 border border-[#f59e0b]/30 hover:border-[#f59e0b]/50 hover:bg-[#f59e0b]/10"
        title="Save this schedule as a template for future use"
      >
        💾 Save as Template
      </button>

      {showModal && (
        <SaveTemplateModal
          isOpen={true}
          onClose={() => setShowModal(false)}
          assignments={assignments}
          userId={profile.id}
          onSuccess={() => {
            setShowModal(false);
            onTemplateSaved?.();
          }}
        />
      )}
    </>
  );
}
