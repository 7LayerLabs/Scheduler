import { init, tx, id } from '@instantdb/react';

// Replace with your InstantDB App ID from https://instantdb.com/dash
const APP_ID = process.env.NEXT_PUBLIC_INSTANTDB_APP_ID || 'YOUR_APP_ID_HERE';

// InstantDB Schema Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'manager' | 'staff';
  employeeId?: string; // Links to employee record for staff
  createdAt: number;
}

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
}

export interface ShiftSwapRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  targetEmployeeId: string;
  targetEmployeeName: string;
  shiftDate: string;
  shiftType: 'morning' | 'night';
  status: 'pending' | 'approved' | 'denied';
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
}

export interface SavedSchedule {
  id: string;
  weekStart: string;
  assignments: string; // JSON stringified
  createdAt: number;
  createdBy: string;
}

// Initialize InstantDB
type Schema = {
  users: User;
  timeOffRequests: TimeOffRequest;
  shiftSwapRequests: ShiftSwapRequest;
  savedSchedules: SavedSchedule;
};

export const db = init<Schema>({ appId: APP_ID });

// Export transaction helpers
export { tx, id };

// Auth helper functions
export function useAuth() {
  const { isLoading, user, error } = db.useAuth();
  return { isLoading, user, error };
}

// Sign in with email
export async function signInWithEmail(email: string) {
  try {
    await db.auth.sendMagicCode({ email });
    return { success: true };
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error };
  }
}

// Verify magic code
export async function verifyMagicCode(email: string, code: string) {
  try {
    await db.auth.signInWithMagicCode({ email, code });
    return { success: true };
  } catch (error) {
    console.error('Verify error:', error);
    return { success: false, error };
  }
}

// Sign out
export async function signOut() {
  await db.auth.signOut();
}

// Get current user profile from users table
export function useCurrentUser() {
  const { user } = db.useAuth();
  const { data, isLoading } = db.useQuery(
    user ? { users: { $: { where: { email: user.email } } } } : null
  );

  return {
    authUser: user,
    profile: data?.users?.[0] || null,
    isLoading,
  };
}

// Create or update user profile
export async function createUserProfile(profile: Omit<User, 'id'>) {
  const userId = id();
  await db.transact(
    tx.users[userId].update({
      ...profile,
    })
  );
  return userId;
}

// Update user profile
export async function updateUserProfile(userId: string, updates: Partial<User>) {
  await db.transact(tx.users[userId].update(updates));
}

// Get all users (for manager view)
export function useAllUsers() {
  const { data, isLoading, error } = db.useQuery({ users: {} });
  return { users: data?.users || [], isLoading, error };
}

// Check if this is the first user (for auto-admin setup)
export function useIsFirstUser() {
  const { data, isLoading } = db.useQuery({ users: {} });
  return {
    isFirstUser: !isLoading && (!data?.users || data.users.length === 0),
    isLoading,
  };
}

// Time Off Request functions
export async function createTimeOffRequest(request: Omit<TimeOffRequest, 'id' | 'status' | 'createdAt'>) {
  const requestId = id();
  await db.transact(
    tx.timeOffRequests[requestId].update({
      ...request,
      status: 'pending',
      createdAt: Date.now(),
    })
  );
  return requestId;
}

export function useTimeOffRequests(employeeId?: string) {
  const query = employeeId
    ? { timeOffRequests: { $: { where: { employeeId } } } }
    : { timeOffRequests: {} };

  const { data, isLoading, error } = db.useQuery(query);
  return { requests: data?.timeOffRequests || [], isLoading, error };
}

export async function updateTimeOffRequestStatus(
  requestId: string,
  status: 'approved' | 'denied',
  reviewedBy: string
) {
  await db.transact(
    tx.timeOffRequests[requestId].update({
      status,
      reviewedAt: Date.now(),
      reviewedBy,
    })
  );
}

// Shift Swap Request functions
export async function createShiftSwapRequest(request: Omit<ShiftSwapRequest, 'id' | 'status' | 'createdAt'>) {
  const requestId = id();
  await db.transact(
    tx.shiftSwapRequests[requestId].update({
      ...request,
      status: 'pending',
      createdAt: Date.now(),
    })
  );
  return requestId;
}

export function useShiftSwapRequests(requesterId?: string) {
  const query = requesterId
    ? { shiftSwapRequests: { $: { where: { requesterId } } } }
    : { shiftSwapRequests: {} };

  const { data, isLoading, error } = db.useQuery(query);
  return { requests: data?.shiftSwapRequests || [], isLoading, error };
}

export async function updateShiftSwapRequestStatus(
  requestId: string,
  status: 'approved' | 'denied',
  reviewedBy: string
) {
  await db.transact(
    tx.shiftSwapRequests[requestId].update({
      status,
      reviewedAt: Date.now(),
      reviewedBy,
    })
  );
}

// Schedule persistence functions
export async function saveSchedule(schedule: Omit<SavedSchedule, 'id'>) {
  const scheduleId = id();
  await db.transact(tx.savedSchedules[scheduleId].update(schedule));
  return scheduleId;
}

export function useSavedSchedules() {
  const { data, isLoading, error } = db.useQuery({ savedSchedules: {} });
  return { schedules: data?.savedSchedules || [], isLoading, error };
}
