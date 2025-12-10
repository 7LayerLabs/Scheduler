'use client';

import { useState, useMemo, useEffect } from 'react';
import { generateSchedule } from '@/lib/scheduler';
import { employees as initialEmployees } from '@/lib/employees';
import { Employee, WeeklySchedule, ScheduleOverride, LockedShift, WeeklyStaffingNeeds } from '@/lib/types';
import {
  db,
  useCurrentUser,
  signOut,
  User,
  useIsFirstUser,
  createUserProfile,
  useEmployees,
  createEmployee,
  updateEmployee as updateEmployeeDB,
  deleteEmployee,
  bulkCreateEmployees,
  useAppSettings,
  updateLogoUrl,
  updateDefaultStaffingTemplate,
  useWeeklyStaffing,
  updateWeeklyStaffing,
  usePermanentRules,
  updatePermanentRules,
  useWeeklyRules,
  updateWeeklyRulesForWeek,
  updateUserProfilePic,
} from '@/lib/instantdb';
import Sidebar from '@/components/Sidebar';
import ScheduleView from '@/components/ScheduleView';
import TeamView from '@/components/TeamView';
import NotesAndStaffingView from '@/components/NotesAndStaffingView';
import SettingsView, { AppSettings, DEFAULT_SETTINGS } from '@/components/SettingsView';
import LoginPage from '@/components/LoginPage';
import StaffDashboard from '@/components/StaffDashboard';
import UserManagement from '@/components/UserManagement';

export default function Home() {
  // Auth state
  const { isLoading: authLoading, user: authUser, error: authError } = db.useAuth();
  const { profile: userProfile, isLoading: profileLoading } = useCurrentUser();
  const { isFirstUser, isLoading: checkingFirstUser } = useIsFirstUser();
  const [showLogin, setShowLogin] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  // InstantDB data hooks
  const { employees: dbEmployees, isLoading: employeesLoading } = useEmployees();
  const { logoUrl: dbLogoUrl, defaultStaffingTemplate: dbDefaultTemplate, isLoading: settingsLoading } = useAppSettings();
  const { staffingByWeek: dbStaffingByWeek, notesByWeek: dbNotesByWeek, isLoading: staffingLoading } = useWeeklyStaffing();
  const { rules: dbPermanentRules, rulesDisplay: dbPermanentRulesDisplay, isLoading: permanentRulesLoading } = usePermanentRules();
  const { rulesByWeek: dbRulesByWeek, displayByWeek: dbDisplayByWeek, isLoading: weeklyRulesLoading } = useWeeklyRules();

  // Migration state
  const [hasMigrated, setHasMigrated] = useState(false);

  const [activeTab, setActiveTab] = useState('schedule');
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Get week key for storage
  const getWeekKey = (date: Date) => date.toISOString().split('T')[0];
  const currentWeekKey = getWeekKey(weekStart);

  // Employees from InstantDB (with fallback to initial employees for migration)
  const employees = dbEmployees.length > 0 ? dbEmployees : initialEmployees;

  // Notes from InstantDB
  const notes = dbNotesByWeek[currentWeekKey] || '';
  const setNotes = async (newNotes: string) => {
    // Get current staffing for this week
    const currentStaffing = dbStaffingByWeek[currentWeekKey] || dbDefaultTemplate || DEFAULT_STAFFING_NEEDS;
    await updateWeeklyStaffing(currentWeekKey, currentStaffing, newNotes);
  };

  // Overrides (for compatibility)
  const overrides = [...(dbPermanentRules || []), ...(dbRulesByWeek[currentWeekKey] || [])];
  const setOverrides = () => {}; // No longer needed, rules are managed separately

  // Permanent rules from InstantDB
  const permanentRules = dbPermanentRules || [];
  const permanentRulesDisplay = dbPermanentRulesDisplay || [];

  // Combined setter to avoid race conditions - updates both rules and display atomically
  const setPermanentRulesAndDisplay = async (rules: ScheduleOverride[], display: string[]) => {
    await updatePermanentRules(rules, display);
  };

  // Legacy setters for backwards compatibility - use combined setter when possible
  const setPermanentRules = async (rules: ScheduleOverride[]) => {
    await updatePermanentRules(rules, permanentRulesDisplay);
  };
  const setPermanentRulesDisplay = async (display: string[]) => {
    await updatePermanentRules(permanentRules, display);
  };

  // Weekly rules from InstantDB
  const weeklyLockedRules = dbRulesByWeek;
  const weeklyLockedRulesDisplay = dbDisplayByWeek;
  const weekLockedRules = dbRulesByWeek[currentWeekKey] || [];
  const weekLockedRulesDisplay = dbDisplayByWeek[currentWeekKey] || [];

  // Combined setter to avoid race conditions - updates both rules and display atomically
  const setWeekLockedRulesAndDisplay = async (rules: ScheduleOverride[], display: string[]) => {
    await updateWeeklyRulesForWeek(currentWeekKey, rules, display);
  };

  // Legacy setters for backwards compatibility - use combined setter when possible
  const setWeekLockedRules = async (rules: ScheduleOverride[]) => {
    await updateWeeklyRulesForWeek(currentWeekKey, rules, weekLockedRulesDisplay);
  };
  const setWeekLockedRulesDisplay = async (display: string[]) => {
    await updateWeeklyRulesForWeek(currentWeekKey, weekLockedRules, display);
  };

  // For compatibility with existing components
  const setWeeklyLockedRules = () => {};
  const setWeeklyLockedRulesDisplay = () => {};

  const [lockedShifts, setLockedShifts] = useState<LockedShift[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Logo from InstantDB with local state for optimistic updates
  const [localLogoUrl, setLocalLogoUrl] = useState<string | null>(null);
  const logoUrl = localLogoUrl ?? dbLogoUrl;

  // Sync local state with DB when dbLogoUrl changes
  useEffect(() => {
    if (dbLogoUrl && !localLogoUrl) {
      setLocalLogoUrl(dbLogoUrl);
    }
  }, [dbLogoUrl]);

  const setLogoUrl = async (url: string | null) => {
    // Optimistically update local state
    setLocalLogoUrl(url);
    try {
      await updateLogoUrl(url);
    } catch (error) {
      console.error('Failed to save logo, reverting...', error);
      // Revert on error
      setLocalLogoUrl(dbLogoUrl);
    }
  };

  // Profile picture from user profile in InstantDB
  const profilePicUrl = userProfile?.profilePicUrl || null;
  const setProfilePicUrl = async (url: string | null) => {
    if (userProfile?.id) {
      await updateUserProfilePic(userProfile.id, url);
    }
  };

  // Migration: Move data from localStorage to InstantDB on first load
  useEffect(() => {
    const migrateData = async () => {
      if (hasMigrated || employeesLoading) return;

      // Only migrate if InstantDB has no employees yet
      if (dbEmployees.length === 0 && authUser) {
        console.log('Migrating data from localStorage to InstantDB...');

        // Migrate employees
        try {
          await bulkCreateEmployees(initialEmployees);
          console.log('Employees migrated successfully');
        } catch (e) {
          console.error('Failed to migrate employees:', e);
        }

        // Migrate logo
        const savedLogo = localStorage.getItem('bobolas-logo');
        if (savedLogo) {
          await updateLogoUrl(savedLogo);
        }

        // Migrate default staffing template
        const savedTemplate = localStorage.getItem('bobolas-default-staffing-template');
        if (savedTemplate) {
          await updateDefaultStaffingTemplate(JSON.parse(savedTemplate));
        }

        // Migrate permanent rules
        const savedPermanentRules = localStorage.getItem('bobolas-permanent-rules');
        const savedPermanentDisplay = localStorage.getItem('bobolas-permanent-display');
        if (savedPermanentRules || savedPermanentDisplay) {
          await updatePermanentRules(
            savedPermanentRules ? JSON.parse(savedPermanentRules) : [],
            savedPermanentDisplay ? JSON.parse(savedPermanentDisplay) : []
          );
        }

        console.log('Migration complete!');
      }

      setHasMigrated(true);
    };

    migrateData();
  }, [hasMigrated, employeesLoading, dbEmployees.length, authUser]);
  const DEFAULT_STAFFING_NEEDS: WeeklyStaffingNeeds = {
    tuesday: {
      slots: [
        { id: 'tue-1', startTime: '07:15', endTime: '14:00', label: 'Opener' },
        { id: 'tue-2', startTime: '11:00', endTime: '16:00', label: '2nd Server' },
        { id: 'tue-3', startTime: '16:00', endTime: '21:00', label: 'Closer' },
      ],
      notes: ''
    },
    wednesday: {
      slots: [
        { id: 'wed-1', startTime: '07:15', endTime: '14:00', label: 'Opener' },
        { id: 'wed-2', startTime: '11:00', endTime: '16:00', label: '2nd Server' },
        { id: 'wed-3', startTime: '16:00', endTime: '21:00', label: 'Closer' },
      ],
      notes: ''
    },
    thursday: {
      slots: [
        { id: 'thu-1', startTime: '07:15', endTime: '14:00', label: 'Opener' },
        { id: 'thu-2', startTime: '11:00', endTime: '16:00', label: '2nd Server' },
        { id: 'thu-3', startTime: '16:00', endTime: '21:00', label: 'Closer' },
      ],
      notes: ''
    },
    friday: {
      slots: [
        { id: 'fri-1', startTime: '07:15', endTime: '14:00', label: 'Opener' },
        { id: 'fri-2', startTime: '11:00', endTime: '16:00', label: '2nd Server' },
        { id: 'fri-3', startTime: '15:00', endTime: '21:00', label: 'Dinner 1' },
        { id: 'fri-4', startTime: '17:00', endTime: '21:00', label: 'Dinner 2' },
      ],
      notes: ''
    },
    saturday: {
      slots: [
        { id: 'sat-1', startTime: '07:15', endTime: '15:00', label: 'Opener' },
        { id: 'sat-2', startTime: '10:00', endTime: '15:00', label: '2nd Server' },
        { id: 'sat-3', startTime: '15:00', endTime: '21:00', label: 'Dinner 1' },
        { id: 'sat-4', startTime: '17:00', endTime: '21:00', label: 'Dinner 2' },
      ],
      notes: ''
    },
    sunday: {
      slots: [
        { id: 'sun-1', startTime: '07:15', endTime: '14:30', label: 'Opener' },
        { id: 'sun-2', startTime: '08:00', endTime: '14:30', label: '2nd Server' },
        { id: 'sun-3', startTime: '09:00', endTime: '14:30', label: '3rd Server' },
      ],
      notes: ''
    },
  };

  // Staffing needs from InstantDB
  const defaultStaffingTemplate = dbDefaultTemplate || DEFAULT_STAFFING_NEEDS;
  const weeklyStaffingNeeds = dbStaffingByWeek;

  // Get staffing needs for current week or use default template
  const staffingNeeds = dbStaffingByWeek[currentWeekKey] || defaultStaffingTemplate;

  const setStaffingNeeds = async (newNeeds: WeeklyStaffingNeeds) => {
    await updateWeeklyStaffing(currentWeekKey, newNeeds, notes);
  };

  // Save current week's staffing as the new default template
  const [showSavedDefaultMessage, setShowSavedDefaultMessage] = useState(false);
  const saveAsDefaultTemplate = async () => {
    // Get the current staffing needs (either from this week's saved data or the current state)
    const currentStaffing = dbStaffingByWeek[currentWeekKey] || staffingNeeds;
    await updateDefaultStaffingTemplate(currentStaffing);
    // Show confirmation
    setShowSavedDefaultMessage(true);
    setTimeout(() => setShowSavedDefaultMessage(false), 2000);
  };

  const handleUpdateEmployee = async (updatedEmployee: Employee) => {
    // If employee doesn't exist in DB yet (using fallback data), create it instead
    const existsInDB = dbEmployees.some(e => e.id === updatedEmployee.id);
    if (existsInDB) {
      await updateEmployeeDB(updatedEmployee);
    } else {
      // Employee is from initialEmployees fallback, create it in DB
      await createEmployee(updatedEmployee);
    }
  };

  const handleAddEmployee = async (newEmployee: Employee) => {
    await createEmployee(newEmployee);
  };

  const handleRemoveEmployee = async (employeeId: string) => {
    await deleteEmployee(employeeId);
    // Also remove any locked shifts for this employee
    setLockedShifts(prev => prev.filter(lock => lock.employeeId !== employeeId));
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      // Convert locked shifts to overrides for the scheduler
      const lockedOverrides: ScheduleOverride[] = lockedShifts.map(lock => ({
        id: `locked-${lock.employeeId}-${lock.day}-${lock.shiftType}`,
        type: 'assign' as const,
        employeeId: lock.employeeId,
        day: lock.day,
        shiftType: lock.shiftType,
        note: 'Locked shift',
      }));

      // Combine ALL rule sources:
      // 1. permanentRules - apply to ALL weeks (from Notes & Staffing)
      // 2. weekLockedRules - apply to THIS WEEK only (from Notes & Staffing)
      // 3. lockedOverrides - from locked shifts on the schedule grid
      const allOverrides = [...permanentRules, ...weekLockedRules, ...lockedOverrides];

      console.log('Generating schedule with rules:', {
        permanentRules: permanentRules.length,
        weekLockedRules: weekLockedRules.length,
        lockedOverrides: lockedOverrides.length,
        totalOverrides: allOverrides.length
      });

      // Pass locked shifts and existing assignments so they persist through regeneration
      const existingAssignments = schedule?.assignments || [];
      const newSchedule = generateSchedule(weekStart, allOverrides, employees, staffingNeeds, lockedShifts, existingAssignments);
      setSchedule(newSchedule);
      setIsGenerating(false);
    }, 500);
  };

  const formatWeekRange = (start: Date) => {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}, ${end.getFullYear()}`;
  };

  const changeWeek = (delta: number) => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + delta * 7);
    setWeekStart(newDate);
    setSchedule(null);
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!schedule) {
      return {
        totalShifts: 0,
        staffScheduled: 0,
        conflicts: 0,
        coverage: 0,
      };
    }

    const uniqueStaff = new Set(schedule.assignments.map(a => a.employeeId));
    return {
      totalShifts: schedule.assignments.length,
      staffScheduled: uniqueStaff.size,
      conflicts: schedule.conflicts.length,
      coverage: schedule.conflicts.length === 0 ? 100 : Math.round((1 - schedule.conflicts.length / 12) * 100),
    };
  }, [schedule]);

  const handleClearSchedule = () => {
    setSchedule(null);
    setLockedShifts([]);
  };

  const handleSignOut = async () => {
    await signOut();
    setShowLogin(false);
  };

  // Handle auth error - show login page instead of being stuck
  if (authError) {
    console.error('Auth error:', authError);
    return <LoginPage onLoginSuccess={() => window.location.reload()} />;
  }

  // Loading state - but don't wait forever
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#e5a825] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6b6b75]">Connecting...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!authUser) {
    return <LoginPage onLoginSuccess={() => window.location.reload()} />;
  }

  // Show loading while checking first user status or profile
  if (profileLoading || checkingFirstUser || isCreatingProfile) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#e5a825] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6b6b75]">{isCreatingProfile ? 'Setting up your account...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  // If no profile but this is the first user, auto-create them as manager
  if (!userProfile && isFirstUser && authUser?.email) {
    // Auto-create first user as manager
    const setupFirstUser = async () => {
      setIsCreatingProfile(true);
      try {
        const email = authUser.email as string;
        await createUserProfile({
          email: email,
          name: email.split('@')[0],
          role: 'manager',
          createdAt: Date.now(),
        });
        window.location.reload();
      } catch (error) {
        console.error('Failed to create profile:', error);
        setIsCreatingProfile(false);
      }
    };
    setupFirstUser();
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#e5a825] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6b6b75]">Setting up your manager account...</p>
        </div>
      </div>
    );
  }

  // If authenticated but no profile and not first user, show waiting screen
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-[#141417] rounded-2xl border border-[#2a2a32] p-8 text-center">
            <div className="w-16 h-16 bg-[#e5a825]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#e5a825]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Access Pending</h2>
            <p className="text-[#a0a0a8] mb-4">
              Your account ({authUser.email}) is not yet set up in the system.
            </p>
            <p className="text-sm text-[#6b6b75] mb-6">
              Please contact your manager to get access to the scheduling system.
            </p>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-[#1a1a1f] text-[#a0a0a8] rounded-lg hover:bg-[#2a2a32] transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentUser = userProfile as User;

  // Staff sees simplified dashboard
  if (currentUser.role === 'staff') {
    return (
      <StaffDashboard
        user={currentUser}
        employees={employees}
        schedule={schedule}
        weekStart={weekStart}
        formatWeekRange={formatWeekRange}
        changeWeek={changeWeek}
        staffingNeeds={staffingNeeds}
      />
    );
  }

  // Manager sees full dashboard
  return (
    <div className="flex min-h-screen bg-[#0d0d0f]">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={currentUser.role}
        logoUrl={logoUrl}
      />

      <main className="flex-1 overflow-auto">
        {/* Top Header */}
        <header className="bg-[#141417] border-b border-[#2a2a32] sticky top-0 z-10">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Search */}
              <div className="flex-1 max-w-lg">
                <div className="relative group">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6b6b75] group-focus-within:text-[#e5a825] transition-colors" />
                  <input
                    type="text"
                    placeholder="Search employees, shifts..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1f] border border-[#2a2a32] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40 focus:border-[#e5a825] transition-all duration-200 placeholder:text-[#6b6b75]"
                  />
                </div>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-4">
                <button className="relative p-2.5 text-[#6b6b75] hover:text-[#e5a825] hover:bg-[#1a1a1f] rounded-xl transition-all duration-200">
                  <BellIcon className="w-5 h-5" />
                  {(schedule?.conflicts.length || 0) > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#ef4444] rounded-full animate-pulse ring-2 ring-[#0d0d0f]" />
                  )}
                </button>

                {/* User Menu */}
                <div className="relative group">
                  <button className="w-10 h-10 bg-[#e5a825] rounded-full flex items-center justify-center cursor-pointer shadow-lg shadow-[#e5a825]/20 hover:shadow-[#e5a825]/40 hover:scale-105 transition-all duration-200 ring-2 ring-[#e5a825]/20 overflow-hidden">
                    {profilePicUrl ? (
                      <img src={profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[#0d0d0f] font-semibold text-sm">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </button>

                  {/* Dropdown */}
                  <div className="absolute right-0 top-12 w-56 bg-[#1a1a1f] rounded-xl border border-[#2a2a32] shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="p-3 border-b border-[#2a2a32]">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#e5a825] rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                          {profilePicUrl ? (
                            <img src={profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[#0d0d0f] font-semibold text-lg">
                              {currentUser.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
                          <p className="text-xs text-[#6b6b75] truncate">{currentUser.email}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-[#e5a825]/10 text-[#e5a825] rounded-full border border-[#e5a825]/30">
                            {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-2 space-y-1">
                      <label className="w-full px-3 py-2 text-left text-sm text-[#a0a0a8] hover:bg-[#2a2a32] rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
                        <CameraIcon className="w-4 h-4" />
                        {profilePicUrl ? 'Change Photo' : 'Add Photo'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setProfilePicUrl(event.target?.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {profilePicUrl && (
                        <button
                          onClick={() => setProfilePicUrl(null)}
                          className="w-full px-3 py-2 text-left text-sm text-[#a0a0a8] hover:bg-[#2a2a32] rounded-lg transition-colors flex items-center gap-2"
                        >
                          <TrashIcon className="w-4 h-4" />
                          Remove Photo
                        </button>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="w-full px-3 py-2 text-left text-sm text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <LogoutIcon className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">
          {activeTab === 'schedule' && (
            <ScheduleView
              weekStart={weekStart}
              changeWeek={changeWeek}
              formatWeekRange={formatWeekRange}
              schedule={schedule}
              setSchedule={setSchedule}
              handleGenerate={handleGenerate}
              onClearSchedule={handleClearSchedule}
              isGenerating={isGenerating}
              employees={employees}
              stats={stats}
              lockedShifts={lockedShifts}
              setLockedShifts={setLockedShifts}
              notes={notes}
              setNotes={setNotes}
              overrides={[...permanentRules, ...weekLockedRules]}
              setOverrides={setOverrides}
              staffingNeeds={staffingNeeds}
              weekLockedRules={weekLockedRules}
              setWeekLockedRules={setWeekLockedRules}
              weekLockedRulesDisplay={weekLockedRulesDisplay}
              setWeekLockedRulesDisplay={setWeekLockedRulesDisplay}
              permanentRules={permanentRules}
              setPermanentRules={setPermanentRules}
              permanentRulesDisplay={permanentRulesDisplay}
              setPermanentRulesDisplay={setPermanentRulesDisplay}
            />
          )}

          {activeTab === 'notes-staffing' && (
            <NotesAndStaffingView
              notes={notes}
              setNotes={setNotes}
              overrides={overrides}
              setOverrides={setOverrides}
              employees={employees}
              weekStart={weekStart}
              changeWeek={changeWeek}
              formatWeekRange={formatWeekRange}
              staffingNeeds={staffingNeeds}
              setStaffingNeeds={setStaffingNeeds}
              saveAsDefaultTemplate={saveAsDefaultTemplate}
              showSavedDefaultMessage={showSavedDefaultMessage}
              permanentRules={permanentRules}
              setPermanentRules={setPermanentRules}
              permanentRulesDisplay={permanentRulesDisplay}
              setPermanentRulesDisplay={setPermanentRulesDisplay}
              setPermanentRulesAndDisplay={setPermanentRulesAndDisplay}
              weekLockedRules={weekLockedRules}
              setWeekLockedRules={setWeekLockedRules}
              weekLockedRulesDisplay={weekLockedRulesDisplay}
              setWeekLockedRulesDisplay={setWeekLockedRulesDisplay}
              setWeekLockedRulesAndDisplay={setWeekLockedRulesAndDisplay}
            />
          )}

          {activeTab === 'team' && (
            <TeamView
              employees={employees}
              onUpdateEmployee={handleUpdateEmployee}
              onAddEmployee={handleAddEmployee}
              onRemoveEmployee={handleRemoveEmployee}
            />
          )}

          {activeTab === 'users' && (
            <UserManagement
              currentUser={currentUser}
              employees={employees}
              profilePicUrl={profilePicUrl}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={appSettings}
              onUpdateSettings={setAppSettings}
              schedule={schedule}
              employees={employees}
              weekStart={weekStart}
              formatWeekRange={formatWeekRange}
              logoUrl={logoUrl}
              onLogoChange={setLogoUrl}
              onExportSchedule={() => {
                // Simple CSV export
                if (!schedule) return;
                const rows = ['Date,Shift,Employee,Start,End'];
                for (const a of schedule.assignments) {
                  const emp = employees.find(e => e.id === a.employeeId);
                  rows.push(`${a.date},${a.shiftId},${emp?.name || 'Unknown'},${a.startTime || ''},${a.endTime || ''}`);
                }
                const csv = rows.join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `schedule-${currentWeekKey}.csv`;
                link.click();
              }}
            />
          )}
        </div>
      </main>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          aside, header {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}

// Icon Components
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  );
}
