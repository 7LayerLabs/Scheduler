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
  profilePicUrl?: string;
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

// Employee stored in InstantDB
export interface DBEmployee {
  id: string;
  name: string;
  bartendingScale: number;
  aloneScale: number;
  availability: string; // JSON stringified
  setSchedule?: string; // JSON stringified
  exclusions: string; // JSON stringified
  preferences: string; // JSON stringified
  minShiftsPerWeek?: number;
  restrictions?: string; // JSON stringified
  permanentRules?: string; // JSON stringified PermanentRule[]
  isActive?: boolean; // Default true, false = excluded from scheduling
  createdAt: number;
  updatedAt: number;
}

// App settings stored in InstantDB
export interface DBAppSettings {
  id: string;
  key: string; // 'main' for main settings, 'logo' for logo, etc.
  logoUrl?: string;
  defaultStaffingTemplate?: string; // JSON stringified
  updatedAt: number;
}

// Weekly staffing needs per week
export interface DBWeeklyStaffing {
  id: string;
  weekKey: string; // e.g., '2024-01-15'
  staffingNeeds: string; // JSON stringified
  notes?: string;
  updatedAt: number;
}

// Weekly rules (overrides) per week
export interface DBWeeklyRules {
  id: string;
  weekKey: string;
  rules: string; // JSON stringified ScheduleOverride[]
  rulesDisplay: string; // JSON stringified string[]
  updatedAt: number;
}

// Permanent rules that apply to all weeks
export interface DBPermanentRules {
  id: string;
  rules: string; // JSON stringified ScheduleOverride[]
  rulesDisplay: string; // JSON stringified string[]
  updatedAt: number;
}

// Initialize InstantDB
// Note: Using untyped init for compatibility with InstantDB 0.22+
// Schema types are defined separately for our application use
export const db = init({ appId: APP_ID });

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
    profile: (data?.users?.[0] as User | undefined) || null,
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
  return { users: (data?.users || []) as User[], isLoading, error };
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
  return { requests: (data?.timeOffRequests || []) as TimeOffRequest[], isLoading, error };
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
  return { requests: (data?.shiftSwapRequests || []) as ShiftSwapRequest[], isLoading, error };
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
  return { schedules: (data?.savedSchedules || []) as SavedSchedule[], isLoading, error };
}

// ============================================
// EMPLOYEE FUNCTIONS
// ============================================

import { Employee, ScheduleOverride, WeeklyStaffingNeeds } from './types';

// Convert Employee to DBEmployee for storage
function employeeToDBEmployee(emp: Employee): Omit<DBEmployee, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: emp.name,
    bartendingScale: emp.bartendingScale,
    aloneScale: emp.aloneScale,
    availability: JSON.stringify(emp.availability),
    setSchedule: emp.setSchedule ? JSON.stringify(emp.setSchedule) : undefined,
    exclusions: JSON.stringify(emp.exclusions),
    preferences: JSON.stringify(emp.preferences),
    minShiftsPerWeek: emp.minShiftsPerWeek,
    restrictions: emp.restrictions ? JSON.stringify(emp.restrictions) : undefined,
    permanentRules: emp.permanentRules ? JSON.stringify(emp.permanentRules) : undefined,
    isActive: emp.isActive,
  };
}

// Convert DBEmployee to Employee
function dbEmployeeToEmployee(dbEmp: DBEmployee): Employee {
  return {
    id: dbEmp.id,
    name: dbEmp.name,
    bartendingScale: dbEmp.bartendingScale,
    aloneScale: dbEmp.aloneScale,
    availability: JSON.parse(dbEmp.availability),
    setSchedule: dbEmp.setSchedule ? JSON.parse(dbEmp.setSchedule) : undefined,
    exclusions: JSON.parse(dbEmp.exclusions),
    preferences: JSON.parse(dbEmp.preferences),
    minShiftsPerWeek: dbEmp.minShiftsPerWeek,
    restrictions: dbEmp.restrictions ? JSON.parse(dbEmp.restrictions) : undefined,
    permanentRules: dbEmp.permanentRules ? JSON.parse(dbEmp.permanentRules) : undefined,
    isActive: dbEmp.isActive !== false, // Default to true if not set
  };
}

// Hook to get all employees
export function useEmployees() {
  const { data, isLoading, error } = db.useQuery({ employees: {} });

  const employees: Employee[] = ((data?.employees || []) as DBEmployee[]).map(dbEmployeeToEmployee);

  return { employees, isLoading, error };
}

// Create a new employee
export async function createEmployee(emp: Employee) {
  // Check if employee with same name already exists
  const result = await db.queryOnce({ employees: { $: { where: { name: emp.name } } } });
  const existing = result.data?.employees?.[0] as { id: string } | undefined;
  const empId = existing?.id || id();

  const dbEmp = employeeToDBEmployee(emp);
  await db.transact(
    tx.employees[empId].update({
      ...dbEmp,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  );
  return empId;
}

// Update an existing employee
export async function updateEmployee(emp: Employee) {
  const dbEmp = employeeToDBEmployee(emp);
  // Use lookup by name for deterministic UUID - emp.id should be a valid UUID from InstantDB
  await db.transact(
    tx.employees[emp.id].update({
      ...dbEmp,
      updatedAt: Date.now(),
    })
  );
}

// Delete an employee
export async function deleteEmployee(employeeId: string) {
  await db.transact(tx.employees[employeeId].delete());
}

// Bulk create employees (for migration)
export async function bulkCreateEmployees(employeeList: Employee[]) {
  // Create each employee one at a time to ensure proper UUID generation
  for (const emp of employeeList) {
    await createEmployee(emp);
  }
}

// ============================================
// APP SETTINGS FUNCTIONS
// ============================================

// Hook to get app settings
export function useAppSettings() {
  const { data, isLoading, error } = db.useQuery({
    appSettings: { $: { where: { key: 'main' } } }
  });

  const settings = (data?.appSettings?.[0] as DBAppSettings | undefined);

  return {
    logoUrl: settings?.logoUrl || null,
    defaultStaffingTemplate: settings?.defaultStaffingTemplate
      ? JSON.parse(settings.defaultStaffingTemplate)
      : null,
    isLoading,
    error,
  };
}

// Update logo URL
export async function updateLogoUrl(logoUrl: string | null) {
  try {
    // Query for existing settings first
    const result = await db.queryOnce({ appSettings: { $: { where: { key: 'main' } } } });
    const existing = result.data?.appSettings?.[0] as { id: string } | undefined;
    const settingsId = existing?.id || id();

    await db.transact(
      tx.appSettings[settingsId].update({
        key: 'main',
        logoUrl: logoUrl || undefined,
        updatedAt: Date.now(),
      })
    );
    console.log('Logo URL saved successfully');
  } catch (error) {
    console.error('Failed to save logo URL:', error);
    throw error;
  }
}

// Update default staffing template
export async function updateDefaultStaffingTemplate(template: WeeklyStaffingNeeds) {
  // Query for existing settings first
  const result = await db.queryOnce({ appSettings: { $: { where: { key: 'main' } } } });
  const existing = result.data?.appSettings?.[0] as { id: string } | undefined;
  const settingsId = existing?.id || id();

  await db.transact(
    tx.appSettings[settingsId].update({
      key: 'main',
      defaultStaffingTemplate: JSON.stringify(template),
      updatedAt: Date.now(),
    })
  );
}

// ============================================
// WEEKLY STAFFING FUNCTIONS
// ============================================

// Hook to get all weekly staffing data
export function useWeeklyStaffing() {
  const { data, isLoading, error } = db.useQuery({ weeklyStaffing: {} });

  const staffingByWeek: Record<string, WeeklyStaffingNeeds> = {};
  const notesByWeek: Record<string, string> = {};

  for (const item of ((data?.weeklyStaffing || []) as DBWeeklyStaffing[])) {
    staffingByWeek[item.weekKey] = JSON.parse(item.staffingNeeds);
    if (item.notes) {
      notesByWeek[item.weekKey] = item.notes;
    }
  }

  return { staffingByWeek, notesByWeek, isLoading, error };
}

// Update staffing for a specific week
export async function updateWeeklyStaffing(weekKey: string, staffingNeeds: WeeklyStaffingNeeds, notes?: string) {
  // Query for existing record first
  const result = await db.queryOnce({ weeklyStaffing: { $: { where: { weekKey } } } });
  const existing = result.data?.weeklyStaffing?.[0] as { id: string } | undefined;
  const staffingId = existing?.id || id();

  await db.transact(
    tx.weeklyStaffing[staffingId].update({
      weekKey,
      staffingNeeds: JSON.stringify(staffingNeeds),
      notes: notes || undefined,
      updatedAt: Date.now(),
    })
  );
}

// ============================================
// RULES FUNCTIONS (Permanent & Weekly)
// ============================================

// Hook to get permanent rules
export function usePermanentRules() {
  const { data, isLoading, error } = db.useQuery({ permanentRules: {} });

  const rulesData = (data?.permanentRules?.[0] as DBPermanentRules | undefined);

  return {
    rules: rulesData?.rules ? JSON.parse(rulesData.rules) as ScheduleOverride[] : [],
    rulesDisplay: rulesData?.rulesDisplay ? JSON.parse(rulesData.rulesDisplay) as string[] : [],
    isLoading,
    error,
  };
}

// Update permanent rules
export async function updatePermanentRules(rules: ScheduleOverride[], rulesDisplay: string[]) {
  // Query for existing record first
  const result = await db.queryOnce({ permanentRules: {} });
  const existing = result.data?.permanentRules?.[0] as { id: string } | undefined;
  const rulesId = existing?.id || id();

  await db.transact(
    tx.permanentRules[rulesId].update({
      rules: JSON.stringify(rules),
      rulesDisplay: JSON.stringify(rulesDisplay),
      updatedAt: Date.now(),
    })
  );
}

// Hook to get all weekly rules
export function useWeeklyRules() {
  const { data, isLoading, error } = db.useQuery({ weeklyRules: {} });

  const rulesByWeek: Record<string, ScheduleOverride[]> = {};
  const displayByWeek: Record<string, string[]> = {};

  for (const item of ((data?.weeklyRules || []) as DBWeeklyRules[])) {
    rulesByWeek[item.weekKey] = JSON.parse(item.rules);
    displayByWeek[item.weekKey] = JSON.parse(item.rulesDisplay);
  }

  return { rulesByWeek, displayByWeek, isLoading, error };
}

// Update rules for a specific week
export async function updateWeeklyRulesForWeek(weekKey: string, rules: ScheduleOverride[], rulesDisplay: string[]) {
  // Query for existing record first
  const result = await db.queryOnce({ weeklyRules: { $: { where: { weekKey } } } });
  const existing = result.data?.weeklyRules?.[0] as { id: string } | undefined;
  const rulesId = existing?.id || id();

  await db.transact(
    tx.weeklyRules[rulesId].update({
      weekKey,
      rules: JSON.stringify(rules),
      rulesDisplay: JSON.stringify(rulesDisplay),
      updatedAt: Date.now(),
    })
  );
}

// ============================================
// USER PROFILE PIC UPDATE
// ============================================

export async function updateUserProfilePic(userId: string, profilePicUrl: string | null) {
  await db.transact(
    tx.users[userId].update({
      profilePicUrl: profilePicUrl || undefined,
    })
  );
}
