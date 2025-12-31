'use client';

import { useState } from 'react';
import { updateShiftSwapRequestStatus, createNotification, type ShiftSwapRequest, type DBEmployee } from '@/lib/instantdb';

interface SwapApprovalPanelProps {
  swapRequests: ShiftSwapRequest[];
  managerId: string;
  employees: DBEmployee[];
  onApprovalStatusChange?: () => void;
}

export default function SwapApprovalPanel({
  swapRequests,
  managerId,
  employees,
  onApprovalStatusChange,
}: SwapApprovalPanelProps) {
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const pendingRequests = swapRequests.filter(r => r.status === 'pending');

  const getEmployeeName = (id: string) => {
    return employees.find(e => e.id === id)?.name || 'Unknown';
  };

  const handleApprove = async (request: ShiftSwapRequest) => {
    setApprovingId(request.id);
    setErrors({});

    try {
      // Update swap request status
      await updateShiftSwapRequestStatus(
        request.id,
        'approved',
        managerId,
        reviewNotes[request.id]
      );

      // Notify requester
      await createNotification({
        userId: request.requesterId,
        userRole: 'staff',
        type: 'swap_approved',
        title: 'Your shift swap was approved!',
        message: `Your request to swap your ${request.shiftType} shift on ${request.shiftDate} has been approved.`,
        actionUrl: `/`,
        isRead: false,
        metadata: JSON.stringify({ swapRequestId: request.id }),
      });

      // Notify target employee if specific
      if (request.targetEmployeeId) {
        await createNotification({
          userId: request.targetEmployeeId,
          userRole: 'staff',
          type: 'swap_approved',
          title: 'Shift swap approved',
          message: `The shift swap request from ${request.requesterName} for ${request.shiftDate} has been approved by management.`,
          actionUrl: `/`,
          isRead: false,
          metadata: JSON.stringify({ swapRequestId: request.id }),
        });
      }

      onApprovalStatusChange?.();
      setReviewNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[request.id];
        return newNotes;
      });
    } catch (err) {
      setErrors(prev => ({
        ...prev,
        [request.id]: err instanceof Error ? err.message : 'Failed to approve',
      }));
    } finally {
      setApprovingId(null);
    }
  };

  const handleDeny = async (request: ShiftSwapRequest) => {
    setApprovingId(request.id);
    setErrors({});

    try {
      // Update swap request status
      await updateShiftSwapRequestStatus(
        request.id,
        'denied',
        managerId,
        reviewNotes[request.id]
      );

      // Notify requester
      await createNotification({
        userId: request.requesterId,
        userRole: 'staff',
        type: 'swap_denied',
        title: 'Your shift swap was denied',
        message: `Your request to swap your ${request.shiftType} shift on ${request.shiftDate} has been denied.`,
        actionUrl: `/`,
        isRead: false,
        metadata: JSON.stringify({ swapRequestId: request.id }),
      });

      onApprovalStatusChange?.();
      setReviewNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[request.id];
        return newNotes;
      });
    } catch (err) {
      setErrors(prev => ({
        ...prev,
        [request.id]: err instanceof Error ? err.message : 'Failed to deny',
      }));
    } finally {
      setApprovingId(null);
    }
  };

  if (pendingRequests.length === 0) {
    return (
      <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-6">
        <p className="text-center text-[#6b6b75]">No pending shift swap requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Pending Swap Requests</h3>
        <span className="bg-[#e5a825] text-[#0d0d0f] text-xs font-bold px-3 py-1 rounded-full">
          {pendingRequests.length}
        </span>
      </div>

      {pendingRequests.map((request) => (
        <div
          key={request.id}
          className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl p-4"
        >
          {errors[request.id] && (
            <div className="mb-4 p-3 bg-[#ef4444]/10 border border-[#ef4444] rounded-lg">
              <p className="text-sm text-[#ef4444]">{errors[request.id]}</p>
            </div>
          )}

          {/* Request Details */}
          <div className="mb-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-white">
                  {request.requesterName}
                </p>
                <p className="text-sm text-[#6b6b75]">
                  Requesting to swap {request.shiftType} shift on {request.shiftDate}
                </p>
              </div>
              <span className="text-xs font-medium text-[#e5a825] bg-[#e5a825]/10 px-2 py-1 rounded">
                {request.shiftType}
              </span>
            </div>

            {request.startTime && request.endTime && (
              <p className="text-sm text-[#a0a0a8]">
                Time: {request.startTime} - {request.endTime}
              </p>
            )}

            {request.targetEmployeeId ? (
              <p className="text-sm text-[#a0a0a8]">
                Target: {request.targetEmployeeName}
              </p>
            ) : (
              <p className="text-sm text-[#a0a0a8]">Target: Open (anyone)</p>
            )}

            {request.reason && (
              <p className="text-sm text-[#6b6b75] italic">
                Reason: {request.reason}
              </p>
            )}

            <p className="text-xs text-[#4a4a55]">
              Requested {new Date(request.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Review Notes */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-[#6b6b75] mb-2">
              Review Notes (optional)
            </label>
            <textarea
              value={reviewNotes[request.id] || ''}
              onChange={(e) =>
                setReviewNotes(prev => ({
                  ...prev,
                  [request.id]: e.target.value,
                }))
              }
              placeholder="Add notes about your decision..."
              className="w-full px-3 py-2 bg-[#141417] border border-[#2a2a32] rounded text-sm text-white placeholder-[#6b6b75] focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => handleApprove(request)}
              disabled={approvingId === request.id}
              className="flex-1 px-4 py-2 bg-[#22c55e] text-white rounded-lg hover:bg-[#16a34a] transition-colors disabled:opacity-50 font-medium text-sm"
            >
              {approvingId === request.id ? 'Processing...' : 'Approve'}
            </button>
            <button
              onClick={() => handleDeny(request)}
              disabled={approvingId === request.id}
              className="flex-1 px-4 py-2 bg-[#ef4444] text-white rounded-lg hover:bg-[#dc2626] transition-colors disabled:opacity-50 font-medium text-sm"
            >
              {approvingId === request.id ? 'Processing...' : 'Deny'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
