'use client';

import { useState } from 'react';
import {
  useAllUsers,
  createUserProfile,
  updateUserProfile,
  useTimeOffRequests,
  useShiftSwapRequests,
  updateTimeOffRequestStatus,
  updateShiftSwapRequestStatus,
  User,
} from '@/lib/instantdb';
import { Employee } from '@/lib/types';

interface Props {
  currentUser: User;
  employees: Employee[];
}

export default function UserManagement({ currentUser, employees }: Props) {
  const [showAddUser, setShowAddUser] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'timeoff' | 'swaps'>('users');

  const { users, isLoading: loadingUsers } = useAllUsers();
  const { requests: timeOffRequests, isLoading: loadingTimeOff } = useTimeOffRequests();
  const { requests: swapRequests, isLoading: loadingSwaps } = useShiftSwapRequests();

  const pendingTimeOff = timeOffRequests.filter(r => r.status === 'pending');
  const pendingSwaps = swapRequests.filter(r => r.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="text-sm text-[#6b6b75] mt-1">Manage staff accounts and approve requests</p>
        </div>
        <button
          onClick={() => setShowAddUser(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#e5a825] hover:bg-[#f0b429] text-[#0d0d0f] text-sm font-semibold rounded-xl transition-all shadow-lg shadow-[#e5a825]/20"
        >
          <PlusIcon className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#2a2a32]">
        <TabButton
          active={activeTab === 'users'}
          onClick={() => setActiveTab('users')}
          count={users.length}
        >
          Users
        </TabButton>
        <TabButton
          active={activeTab === 'timeoff'}
          onClick={() => setActiveTab('timeoff')}
          count={pendingTimeOff.length}
          highlight={pendingTimeOff.length > 0}
        >
          Time Off Requests
        </TabButton>
        <TabButton
          active={activeTab === 'swaps'}
          onClick={() => setActiveTab('swaps')}
          count={pendingSwaps.length}
          highlight={pendingSwaps.length > 0}
        >
          Swap Requests
        </TabButton>
      </div>

      {/* Content */}
      {activeTab === 'users' && (
        <UsersTab users={users} employees={employees} isLoading={loadingUsers} />
      )}

      {activeTab === 'timeoff' && (
        <TimeOffTab
          requests={timeOffRequests}
          isLoading={loadingTimeOff}
          currentUser={currentUser}
        />
      )}

      {activeTab === 'swaps' && (
        <SwapsTab
          requests={swapRequests}
          isLoading={loadingSwaps}
          currentUser={currentUser}
        />
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <AddUserModal
          employees={employees}
          existingUsers={users}
          onClose={() => setShowAddUser(false)}
        />
      )}
    </div>
  );
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  children,
  count,
  highlight,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'text-[#e5a825] border-[#e5a825]'
          : 'text-[#6b6b75] border-transparent hover:text-white'
      }`}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span
          className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
            highlight
              ? 'bg-[#ef4444] text-white'
              : 'bg-[#2a2a32] text-[#a0a0a8]'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// Users Tab
function UsersTab({
  users,
  employees,
  isLoading,
}: {
  users: User[];
  employees: Employee[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <div className="text-center py-8 text-[#6b6b75]">Loading users...</div>;
  }

  return (
    <div className="bg-[#1a1a1f] rounded-2xl border border-[#2a2a32] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#2a2a32]">
            <th className="px-6 py-4 text-left text-xs font-medium text-[#6b6b75] uppercase tracking-wider">Name</th>
            <th className="px-6 py-4 text-left text-xs font-medium text-[#6b6b75] uppercase tracking-wider">Email</th>
            <th className="px-6 py-4 text-left text-xs font-medium text-[#6b6b75] uppercase tracking-wider">Role</th>
            <th className="px-6 py-4 text-left text-xs font-medium text-[#6b6b75] uppercase tracking-wider">Linked Employee</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2a2a32]">
          {users.map((user) => {
            const linkedEmployee = employees.find(e => e.id === user.employeeId);
            return (
              <tr key={user.id} className="hover:bg-[#222228]">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      user.role === 'manager' ? 'bg-[#e5a825] text-[#0d0d0f]' : 'bg-[#3b82f6] text-white'
                    }`}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white font-medium">{user.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-[#a0a0a8]">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    user.role === 'manager'
                      ? 'bg-[#e5a825]/10 text-[#e5a825] border border-[#e5a825]/30'
                      : 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/30'
                  }`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#a0a0a8]">
                  {linkedEmployee?.name || '-'}
                </td>
              </tr>
            );
          })}
          {users.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-8 text-center text-[#6b6b75]">
                No users yet. Add your first user to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Time Off Tab
function TimeOffTab({
  requests,
  isLoading,
  currentUser,
}: {
  requests: Array<{
    id: string;
    employeeId: string;
    employeeName: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: 'pending' | 'approved' | 'denied';
    createdAt: number;
  }>;
  isLoading: boolean;
  currentUser: User;
}) {
  const handleApprove = async (requestId: string) => {
    await updateTimeOffRequestStatus(requestId, 'approved', currentUser.name);
  };

  const handleDeny = async (requestId: string) => {
    await updateTimeOffRequestStatus(requestId, 'denied', currentUser.name);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-[#6b6b75]">Loading requests...</div>;
  }

  const pending = requests.filter(r => r.status === 'pending');
  const past = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-[#a0a0a8] mb-3">Pending Approval</h3>
          <div className="space-y-3">
            {pending.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onApprove={() => handleApprove(request.id)}
                onDeny={() => handleDeny(request.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past Requests */}
      <div>
        <h3 className="text-sm font-medium text-[#a0a0a8] mb-3">History</h3>
        {past.length > 0 ? (
          <div className="space-y-3">
            {past.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#6b6b75] bg-[#1a1a1f] rounded-xl border border-[#2a2a32]">
            No time off requests yet
          </div>
        )}
      </div>
    </div>
  );
}

// Swaps Tab
function SwapsTab({
  requests,
  isLoading,
  currentUser,
}: {
  requests: Array<{
    id: string;
    requesterId: string;
    requesterName: string;
    targetEmployeeId: string;
    targetEmployeeName: string;
    shiftDate: string;
    shiftType: 'morning' | 'night';
    status: 'pending' | 'approved' | 'denied';
    createdAt: number;
  }>;
  isLoading: boolean;
  currentUser: User;
}) {
  const handleApprove = async (requestId: string) => {
    await updateShiftSwapRequestStatus(requestId, 'approved', currentUser.name);
  };

  const handleDeny = async (requestId: string) => {
    await updateShiftSwapRequestStatus(requestId, 'denied', currentUser.name);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-[#6b6b75]">Loading requests...</div>;
  }

  const pending = requests.filter(r => r.status === 'pending');
  const past = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-[#a0a0a8] mb-3">Pending Approval</h3>
          <div className="space-y-3">
            {pending.map((request) => (
              <div
                key={request.id}
                className="p-4 bg-[#1a1a1f] rounded-xl border border-[#2a2a32]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      {request.requesterName} wants to swap with {request.targetEmployeeName}
                    </p>
                    <p className="text-sm text-[#6b6b75] mt-1">
                      {new Date(request.shiftDate + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })} - {request.shiftType.charAt(0).toUpperCase() + request.shiftType.slice(1)} shift
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(request.id)}
                      className="px-3 py-1.5 text-xs font-medium bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-lg transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeny(request.id)}
                      className="px-3 py-1.5 text-xs font-medium bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-lg transition-colors"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <h3 className="text-sm font-medium text-[#a0a0a8] mb-3">History</h3>
        {past.length > 0 ? (
          <div className="space-y-3">
            {past.map((request) => (
              <div
                key={request.id}
                className="p-4 bg-[#1a1a1f] rounded-xl border border-[#2a2a32] flex items-center justify-between"
              >
                <div>
                  <p className="text-white">
                    {request.requesterName} swapped with {request.targetEmployeeName}
                  </p>
                  <p className="text-sm text-[#6b6b75]">
                    {new Date(request.shiftDate + 'T12:00:00').toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={request.status} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#6b6b75] bg-[#1a1a1f] rounded-xl border border-[#2a2a32]">
            No swap requests yet
          </div>
        )}
      </div>
    </div>
  );
}

// Request Card
function RequestCard({
  request,
  onApprove,
  onDeny,
}: {
  request: {
    id: string;
    employeeName: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: 'pending' | 'approved' | 'denied';
    createdAt: number;
  };
  onApprove?: () => void;
  onDeny?: () => void;
}) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="p-4 bg-[#1a1a1f] rounded-xl border border-[#2a2a32]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium">{request.employeeName}</p>
          <p className="text-sm text-[#a0a0a8] mt-1">
            {formatDate(request.startDate)} - {formatDate(request.endDate)}
          </p>
          {request.reason && (
            <p className="text-sm text-[#6b6b75] mt-1">{request.reason}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {onApprove && onDeny ? (
            <>
              <button
                onClick={onApprove}
                className="px-3 py-1.5 text-xs font-medium bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-lg transition-colors"
              >
                Approve
              </button>
              <button
                onClick={onDeny}
                className="px-3 py-1.5 text-xs font-medium bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-lg transition-colors"
              >
                Deny
              </button>
            </>
          ) : (
            <StatusBadge status={request.status} />
          )}
        </div>
      </div>
    </div>
  );
}

// Status Badge
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

// Add User Modal
function AddUserModal({
  employees,
  existingUsers,
  onClose,
}: {
  employees: Employee[];
  existingUsers: User[];
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'manager' | 'staff'>('staff');
  const [employeeId, setEmployeeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out employees that already have user accounts
  const linkedEmployeeIds = existingUsers.map(u => u.employeeId).filter(Boolean);
  const availableEmployees = employees.filter(e => !linkedEmployeeIds.includes(e.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    await createUserProfile({
      name,
      email,
      role,
      employeeId: role === 'staff' ? employeeId : undefined,
      createdAt: Date.now(),
    });

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1a1f] rounded-2xl border border-[#2a2a32] p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-white mb-4">Add New User</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#a0a0a8] mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
              className="w-full px-3 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white placeholder:text-[#6b6b75] focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a0a0a8] mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              className="w-full px-3 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white placeholder:text-[#6b6b75] focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a0a0a8] mb-2">Role</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRole('staff')}
                className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                  role === 'staff'
                    ? 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]'
                    : 'bg-[#141417] text-[#6b6b75] border-[#2a2a32] hover:border-[#3a3a45]'
                }`}
              >
                Staff
              </button>
              <button
                type="button"
                onClick={() => setRole('manager')}
                className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                  role === 'manager'
                    ? 'bg-[#e5a825]/10 text-[#e5a825] border-[#e5a825]'
                    : 'bg-[#141417] text-[#6b6b75] border-[#2a2a32] hover:border-[#3a3a45]'
                }`}
              >
                Manager
              </button>
            </div>
          </div>

          {role === 'staff' && (
            <div>
              <label className="block text-sm font-medium text-[#a0a0a8] mb-2">Link to Employee</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
              >
                <option value="">Select an employee...</option>
                {availableEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#6b6b75] mt-1">
                This links the user account to their schedule
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#a0a0a8] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name || !email || (role === 'staff' && !employeeId)}
              className="px-4 py-2 bg-[#e5a825] hover:bg-[#f0b429] disabled:bg-[#3a3a45] text-[#0d0d0f] disabled:text-[#6b6b75] font-medium rounded-lg transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Plus Icon
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
