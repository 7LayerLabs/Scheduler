'use client';

import { useState } from 'react';
import { User, TimeOffRequest, ShiftSwapRequest, useTimeOffRequests, useShiftSwapRequests, createTimeOffRequest, createShiftSwapRequest } from '@/lib/instantdb';
import { Employee, WeeklySchedule } from '@/lib/types';

interface Props {
  user: User;
  employees: Employee[];
  schedule: WeeklySchedule | null;
  weekStart: Date;
  formatWeekRange: (date: Date) => string;
  changeWeek: (delta: number) => void;
}

export default function StaffDashboard({
  user,
  employees,
  schedule,
  weekStart,
  formatWeekRange,
  changeWeek,
}: Props) {
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<{ date: string; shiftType: 'morning' | 'night' } | null>(null);

  // Find the employee linked to this user
  const { requests: timeOffRequests } = useTimeOffRequests(user.employeeId);
  const { requests: swapRequests } = useShiftSwapRequests(user.employeeId);

  // Get my shifts for this week
  const myShifts = schedule?.assignments.filter(a => a.employeeId === user.employeeId) || [];

  const formatTime = (time: string): string => {
    if (!time || !time.includes(':')) return time || '';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    let hour12 = hours % 12;
    if (hour12 === 0) hour12 = 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getDayName = (dateStr: string): string => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#0d0d0f]">
      {/* Header */}
      <header className="bg-[#141417] border-b border-[#2a2a32] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Bobola<span className="text-[#e5a825]">&apos;</span>s
            </h1>
            <p className="text-sm text-[#6b6b75]">Welcome, {user.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-[#a0a0a8]">{formatWeekRange(weekStart)}</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => changeWeek(-1)}
                className="p-2 hover:bg-[#222228] rounded-lg transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5 text-[#6b6b75]" />
              </button>
              <button
                onClick={() => changeWeek(1)}
                className="p-2 hover:bg-[#222228] rounded-lg transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5 text-[#6b6b75]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto space-y-6">
        {/* My Shifts This Week */}
        <section className="bg-[#1a1a1f] rounded-2xl border border-[#2a2a32] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">My Shifts This Week</h2>
            <span className="text-sm text-[#6b6b75]">{myShifts.length} shift{myShifts.length !== 1 ? 's' : ''}</span>
          </div>

          {myShifts.length > 0 ? (
            <div className="space-y-3">
              {myShifts.sort((a, b) => a.date.localeCompare(b.date)).map((shift, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-[#141417] rounded-xl border border-[#2a2a32] hover:border-[#e5a825]/30 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-white">{getDayName(shift.date)}</p>
                    <p className="text-sm text-[#6b6b75]">{formatDate(shift.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-[#e5a825]">
                      {shift.startTime && shift.endTime
                        ? `${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}`
                        : 'TBD'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedShift({
                        date: shift.date,
                        shiftType: shift.shiftId.includes('night') ? 'night' : 'morning',
                      });
                      setShowSwapModal(true);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-[#a855f7] bg-[#a855f7]/10 rounded-lg hover:bg-[#a855f7]/20 transition-colors border border-[#a855f7]/30"
                  >
                    Request Swap
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#6b6b75]">
              {schedule ? 'No shifts scheduled this week' : 'Schedule not yet generated'}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setShowTimeOffModal(true)}
            className="p-6 bg-[#1a1a1f] rounded-2xl border border-[#2a2a32] hover:border-[#22c55e]/30 transition-all group"
          >
            <CalendarOffIcon className="w-8 h-8 text-[#22c55e] mb-3" />
            <h3 className="font-semibold text-white group-hover:text-[#22c55e] transition-colors">Request Time Off</h3>
            <p className="text-sm text-[#6b6b75] mt-1">Submit a time off request</p>
          </button>

          <div className="p-6 bg-[#1a1a1f] rounded-2xl border border-[#2a2a32]">
            <ClockIcon className="w-8 h-8 text-[#3b82f6] mb-3" />
            <h3 className="font-semibold text-white">Hours This Week</h3>
            <p className="text-2xl font-bold text-[#3b82f6] mt-1">
              {myShifts.reduce((total, shift) => {
                if (shift.startTime && shift.endTime) {
                  const [sh, sm] = shift.startTime.split(':').map(Number);
                  const [eh, em] = shift.endTime.split(':').map(Number);
                  return total + (eh - sh) + (em - sm) / 60;
                }
                return total;
              }, 0).toFixed(1)}h
            </p>
          </div>
        </div>

        {/* My Requests */}
        <section className="bg-[#1a1a1f] rounded-2xl border border-[#2a2a32] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">My Requests</h2>

          <div className="space-y-3">
            {/* Time Off Requests */}
            {timeOffRequests.map((request: TimeOffRequest) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 bg-[#141417] rounded-xl border border-[#2a2a32]"
              >
                <div>
                  <p className="font-medium text-white">Time Off: {formatDate(request.startDate)} - {formatDate(request.endDate)}</p>
                  <p className="text-sm text-[#6b6b75]">{request.reason}</p>
                </div>
                <StatusBadge status={request.status} />
              </div>
            ))}

            {/* Swap Requests */}
            {swapRequests.map((request: ShiftSwapRequest) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 bg-[#141417] rounded-xl border border-[#2a2a32]"
              >
                <div>
                  <p className="font-medium text-white">Shift Swap: {formatDate(request.shiftDate)}</p>
                  <p className="text-sm text-[#6b6b75]">With: {request.targetEmployeeName}</p>
                </div>
                <StatusBadge status={request.status} />
              </div>
            ))}

            {timeOffRequests.length === 0 && swapRequests.length === 0 && (
              <div className="text-center py-6 text-[#6b6b75]">
                No pending requests
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Time Off Modal */}
      {showTimeOffModal && (
        <TimeOffModal
          employeeId={user.employeeId || ''}
          employeeName={user.name}
          onClose={() => setShowTimeOffModal(false)}
        />
      )}

      {/* Swap Modal */}
      {showSwapModal && selectedShift && (
        <SwapModal
          requesterId={user.employeeId || ''}
          requesterName={user.name}
          shiftDate={selectedShift.date}
          shiftType={selectedShift.shiftType}
          employees={employees.filter(e => e.id !== user.employeeId)}
          onClose={() => {
            setShowSwapModal(false);
            setSelectedShift(null);
          }}
        />
      )}
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: 'pending' | 'approved' | 'denied' }) {
  const styles = {
    pending: 'bg-[#e5a825]/10 text-[#e5a825] border-[#e5a825]/30',
    approved: 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/30',
    denied: 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30',
  };

  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// Time Off Modal Component
function TimeOffModal({
  employeeId,
  employeeName,
  onClose,
}: {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
}) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    await createTimeOffRequest({
      employeeId,
      employeeName,
      startDate,
      endDate,
      reason,
    });

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1a1f] rounded-2xl border border-[#2a2a32] p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-white mb-4">Request Time Off</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#a0a0a8] mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#a0a0a8] mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                min={startDate}
                className="w-full px-3 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a0a0a8] mb-2">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Vacation, appointment, etc."
              rows={3}
              className="w-full px-3 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white placeholder:text-[#6b6b75] focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40 resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#a0a0a8] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !startDate || !endDate}
              className="px-4 py-2 bg-[#22c55e] hover:bg-[#16a34a] disabled:bg-[#3a3a45] text-white font-medium rounded-lg transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Swap Modal Component
function SwapModal({
  requesterId,
  requesterName,
  shiftDate,
  shiftType,
  employees,
  onClose,
}: {
  requesterId: string;
  requesterName: string;
  shiftDate: string;
  shiftType: 'morning' | 'night';
  employees: Employee[];
  onClose: () => void;
}) {
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetEmployee = employees.find(e => e.id === targetEmployeeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmployee) return;

    setIsSubmitting(true);

    await createShiftSwapRequest({
      requesterId,
      requesterName,
      targetEmployeeId,
      targetEmployeeName: targetEmployee.name,
      shiftDate,
      shiftType,
    });

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1a1f] rounded-2xl border border-[#2a2a32] p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-white mb-4">Request Shift Swap</h3>

        <div className="mb-4 p-3 bg-[#141417] rounded-lg border border-[#2a2a32]">
          <p className="text-sm text-[#6b6b75]">Your shift:</p>
          <p className="text-white font-medium">
            {new Date(shiftDate + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })} - {shiftType.charAt(0).toUpperCase() + shiftType.slice(1)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#a0a0a8] mb-2">Swap with</label>
            <select
              value={targetEmployeeId}
              onChange={(e) => setTargetEmployeeId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
            >
              <option value="">Select an employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#a0a0a8] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !targetEmployeeId}
              className="px-4 py-2 bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-[#3a3a45] text-white font-medium rounded-lg transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Request Swap'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Icons
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function CalendarOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
