'use client';

import { useState } from 'react';
import { createShiftSwapRequest, createNotification, type DBEmployee } from '@/lib/instantdb';

interface ShiftData {
  date: string;
  type: 'morning' | 'mid' | 'night';
  startTime: string;
  endTime: string;
}

interface RequestSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userShifts: ShiftData[];
  employees: DBEmployee[];
  onSuccess?: () => void;
}

export default function RequestSwapModal({
  isOpen,
  onClose,
  userId,
  userName,
  userShifts,
  employees,
  onSuccess,
}: RequestSwapModalProps) {
  const [selectedShiftIndex, setSelectedShiftIndex] = useState<number | null>(null);
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>('anyone');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (selectedShiftIndex === null) {
      setError('Please select a shift');
      return;
    }

    const selectedShift = userShifts[selectedShiftIndex];
    setIsSubmitting(true);
    setError(null);

    try {
      // Create shift swap request
      const targetId = targetEmployeeId === 'anyone' ? undefined : targetEmployeeId;
      const targetName = targetId
        ? employees.find(e => e.id === targetId)?.name
        : undefined;

      const requestId = await createShiftSwapRequest({
        requesterId: userId,
        requesterName: userName,
        targetEmployeeId: targetId,
        targetEmployeeName: targetName,
        shiftDate: selectedShift.date,
        shiftType: selectedShift.type,
        startTime: selectedShift.startTime,
        endTime: selectedShift.endTime,
        reason: reason || undefined,
      });

      // Create notifications
      if (targetId) {
        // Notify specific employee
        await createNotification({
          userId: targetId,
          userRole: 'staff',
          type: 'swap_requested',
          title: `${userName} requested a shift swap`,
          message: `${userName} wants to swap their ${selectedShift.type} shift on ${selectedShift.date}. ${reason ? `Reason: ${reason}` : ''}`,
          actionUrl: `/`,
          isRead: false,
          metadata: JSON.stringify({ swapRequestId: requestId }),
        });
      } else {
        // Notify all staff
        const staffEmployees = employees.filter(e => e.id !== userId);
        for (const employee of staffEmployees) {
          await createNotification({
            userId: employee.id,
            userRole: 'staff',
            type: 'swap_requested',
            title: `${userName} is looking for shift coverage`,
            message: `${userName} wants to swap their ${selectedShift.type} shift on ${selectedShift.date}. ${reason ? `Reason: ${reason}` : ''}`,
            actionUrl: `/`,
            isRead: false,
            metadata: JSON.stringify({ swapRequestId: requestId }),
          });
        }
      }

      onSuccess?.();
      onClose();
      setSelectedShiftIndex(null);
      setTargetEmployeeId('anyone');
      setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create swap request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl max-w-md w-full mx-4 max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-[#2a2a32] sticky top-0 bg-[#1a1a1f]">
          <h2 className="text-lg font-bold text-white">Request Shift Swap</h2>
          <p className="text-sm text-[#6b6b75] mt-1">Select a shift you'd like to swap</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444] rounded-lg">
              <p className="text-sm text-[#ef4444]">{error}</p>
            </div>
          )}

          {/* Shift Selection */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Your Shifts
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {userShifts.length === 0 ? (
                <p className="text-sm text-[#6b6b75]">No upcoming shifts</p>
              ) : (
                userShifts.map((shift, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedShiftIndex(idx)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedShiftIndex === idx
                        ? 'bg-[#e5a825] text-[#0d0d0f]'
                        : 'bg-[#141417] text-white hover:bg-[#1a1a1f]'
                    }`}
                  >
                    <div className="font-medium">
                      {shift.date} - {shift.type.charAt(0).toUpperCase() + shift.type.slice(1)}
                    </div>
                    <div className="text-sm opacity-75">
                      {shift.startTime} - {shift.endTime}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Target Employee Selection */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Target Employee
            </label>
            <select
              value={targetEmployeeId}
              onChange={(e) => setTargetEmployeeId(e.target.value)}
              className="w-full px-3 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
            >
              <option value="anyone">Anyone can take it</option>
              {employees
                .filter(e => e.id !== userId)
                .map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why do you need to swap this shift?"
              className="w-full px-3 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white placeholder-[#6b6b75] focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#2a2a32] flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-[#141417] text-white rounded-lg hover:bg-[#1a1a1f] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedShiftIndex === null}
            className="flex-1 px-4 py-2 bg-[#e5a825] text-[#0d0d0f] rounded-lg hover:bg-[#f0b429] transition-colors disabled:opacity-50 font-medium"
          >
            {isSubmitting ? 'Submitting...' : 'Request Swap'}
          </button>
        </div>
      </div>
    </div>
  );
}
