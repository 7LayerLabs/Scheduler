'use client';

import { useState } from 'react';
import { Employee, Availability, DayAvailability, EmployeeRestriction, PermanentRule, DayOfWeek } from '@/lib/types';

interface Props {
  employees: Employee[];
  onUpdateEmployee: (employee: Employee) => void;
  onAddEmployee: (employee: Employee) => void;
  onRemoveEmployee: (employeeId: string) => void;
}

type SortField = 'name' | 'bartending' | 'alone' | 'minShifts' | 'status';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'inactive';

export default function TeamView({ employees, onUpdateEmployee, onAddEmployee, onRemoveEmployee }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editBartending, setEditBartending] = useState(0);
  const [editAlone, setEditAlone] = useState(0);
  const [editMinShifts, setEditMinShifts] = useState<number | undefined>(undefined);
  const [editAvailability, setEditAvailability] = useState<Availability | null>(null);
  const [editRestrictions, setEditRestrictions] = useState<EmployeeRestriction[]>([]);
  const [editPermanentRules, setEditPermanentRules] = useState<PermanentRule[]>([]);

  type DayKey = 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  type ShiftType = 'morning' | 'mid' | 'night' | 'any' | 'none';

  const dayLabels: { key: DayKey; label: string }[] = [
    { key: 'tuesday', label: 'Tue' },
    { key: 'wednesday', label: 'Wed' },
    { key: 'thursday', label: 'Thu' },
    { key: 'friday', label: 'Fri' },
    { key: 'saturday', label: 'Sat' },
    { key: 'sunday', label: 'Sun' },
  ];

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort employees
  const filteredEmployees = employees
    .filter((emp) => emp.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter((emp) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'active') return emp.isActive !== false;
      if (statusFilter === 'inactive') return emp.isActive === false;
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'bartending':
          comparison = a.bartendingScale - b.bartendingScale;
          break;
        case 'alone':
          comparison = a.aloneScale - b.aloneScale;
          break;
        case 'minShifts':
          const aShifts = a.minShiftsPerWeek ?? -1;
          const bShifts = b.minShiftsPerWeek ?? -1;
          comparison = aShifts - bShifts;
          break;
        case 'status':
          const aStatus = a.exclusions.length > 0 ? 1 : 0;
          const bStatus = b.exclusions.length > 0 ? 1 : 0;
          comparison = aStatus - bStatus;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const startEditing = () => {
    if (selectedEmployee) {
      setEditName(selectedEmployee.name);
      setEditBartending(selectedEmployee.bartendingScale);
      setEditAlone(selectedEmployee.aloneScale);
      setEditMinShifts(selectedEmployee.minShiftsPerWeek);
      // Deep clone the availability
      setEditAvailability(JSON.parse(JSON.stringify(selectedEmployee.availability)));
      // Deep clone restrictions
      setEditRestrictions(JSON.parse(JSON.stringify(selectedEmployee.restrictions || [])));
      // Deep clone permanent rules
      setEditPermanentRules(JSON.parse(JSON.stringify(selectedEmployee.permanentRules || [])));
      setIsEditing(true);
    }
  };

  const getShiftTypesForDay = (day: DayKey): ShiftType[] => {
    if (!editAvailability) return [];
    const dayAvail = editAvailability[day] as DayAvailability | null;
    if (!dayAvail || !dayAvail.available) return [];
    return dayAvail.shifts.map(s => s.type as ShiftType);
  };

  const hasShiftType = (day: DayKey, shiftType: ShiftType): boolean => {
    const types = getShiftTypesForDay(day);
    return types.includes(shiftType);
  };

  const toggleShiftTypeForDay = (day: DayKey, shiftType: ShiftType) => {
    if (!editAvailability) return;

    const newAvail = { ...editAvailability };
    const currentDayAvail = editAvailability[day] as DayAvailability | null;
    const currentShifts = currentDayAvail?.shifts || [];

    const hasShift = currentShifts.some(s => s.type === shiftType);

    let newShifts;
    if (hasShift) {
      // Remove this shift type
      newShifts = currentShifts.filter(s => s.type !== shiftType);
    } else {
      // Add this shift type
      // IMPORTANT: 'any' (Open) and specific types (morning/mid/night) are mutually exclusive
      if (shiftType === 'any') {
        // Selecting 'any' replaces all specific types
        newShifts = [{ type: 'any' as const }];
      } else {
        // Selecting a specific type removes 'any' first
        const withoutAny = currentShifts.filter(s => s.type !== 'any');
        newShifts = [...withoutAny, { type: shiftType as 'morning' | 'mid' | 'night' }];
      }
    }

    newAvail[day] = {
      available: newShifts.length > 0,
      shifts: newShifts,
      notes: currentDayAvail?.notes
    };

    setEditAvailability(newAvail);
  };

  const saveChanges = () => {
    if (selectedEmployee && editAvailability) {
      const updatedEmployee: Employee = {
        ...selectedEmployee,
        name: editName,
        bartendingScale: editBartending,
        aloneScale: editAlone,
        minShiftsPerWeek: editMinShifts,
        availability: editAvailability,
        restrictions: editRestrictions,
        permanentRules: editPermanentRules,
      };
      onUpdateEmployee(updatedEmployee);
      setSelectedEmployee(updatedEmployee);
      setIsEditing(false);
    }
  };

  // Restriction management functions
  const addRestriction = () => {
    const newRestriction: EmployeeRestriction = {
      id: `restriction-${Date.now()}`,
      type: 'no_before',
      time: '09:00',
      days: [],
      reason: '',
    };
    setEditRestrictions([...editRestrictions, newRestriction]);
  };

  const updateRestriction = (id: string, updates: Partial<EmployeeRestriction>) => {
    setEditRestrictions(editRestrictions.map(r =>
      r.id === id ? { ...r, ...updates } : r
    ));
  };

  const removeRestriction = (id: string) => {
    setEditRestrictions(editRestrictions.filter(r => r.id !== id));
  };

  const toggleRestrictionDay = (restrictionId: string, day: DayOfWeek) => {
    setEditRestrictions(editRestrictions.map(r => {
      if (r.id !== restrictionId) return r;
      const days = r.days.includes(day)
        ? r.days.filter(d => d !== day)
        : [...r.days, day];
      return { ...r, days };
    }));
  };

  // Permanent rule management functions
  const addPermanentRule = () => {
    const newRule: PermanentRule = {
      id: `rule-${Date.now()}`,
      type: 'fixed_shift',
      day: 'saturday',
      days: ['saturday'],  // Initialize with single day for fixed_shift
      startTime: '09:00',
      endTime: '12:00',
      reason: '',
      isActive: true,
    };
    setEditPermanentRules([...editPermanentRules, newRule]);
  };

  const updatePermanentRule = (id: string, updates: Partial<PermanentRule>) => {
    setEditPermanentRules(editPermanentRules.map(r =>
      r.id === id ? { ...r, ...updates } : r
    ));
  };

  const removePermanentRule = (id: string) => {
    setEditPermanentRules(editPermanentRules.filter(r => r.id !== id));
  };

  const togglePermanentRuleActive = (id: string) => {
    setEditPermanentRules(editPermanentRules.map(r =>
      r.id === id ? { ...r, isActive: !r.isActive } : r
    ));
  };

  const togglePermanentRuleDay = (ruleId: string, day: DayOfWeek) => {
    setEditPermanentRules(editPermanentRules.map(r => {
      if (r.id !== ruleId) return r;
      const currentDays = r.days || [r.day];
      const newDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day];
      // Ensure at least one day is selected
      if (newDays.length === 0) return r;
      return { ...r, days: newDays, day: newDays[0] };
    }));
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (selectedEmployee) {
      onRemoveEmployee(selectedEmployee.id);
      setSelectedEmployee(null);
      setShowDeleteConfirm(false);
    }
  };

  // Toggle active status for an employee
  const toggleActiveStatus = (emp: Employee, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // Prevent row selection when clicking toggle
    const updatedEmployee = {
      ...emp,
      isActive: emp.isActive === false ? true : false,
    };
    onUpdateEmployee(updatedEmployee);
    // Update selected employee if it's the same one
    if (selectedEmployee?.id === emp.id) {
      setSelectedEmployee(updatedEmployee);
    }
  };

  const getSkillStars = (level: number, interactive: boolean = false, onChange?: (val: number) => void) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`${i < level ? 'text-[#e5a825]' : 'text-[#3a3a45]'} ${interactive ? 'cursor-pointer hover:text-[#f0b429]' : ''}`}
        onClick={interactive && onChange ? () => onChange(i + 1) : undefined}
      >
        *
      </span>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Team</h1>
          <p className="text-xs sm:text-sm text-[#6b6b75] mt-1">
            {employees.length} team members
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 sm:px-5 py-2 sm:py-2.5 bg-[#e5a825] hover:bg-[#f0b429] text-[#0d0d0f] text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-[#e5a825]/20 hover:shadow-[#e5a825]/40 hover:scale-[1.02] flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          <span className="hidden sm:inline">Add Employee</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Employee List */}
        <div className="lg:col-span-2 bg-[#1a1a1f] rounded-2xl border border-[#2a2a32] overflow-hidden hover:border-[#3a3a45] transition-colors duration-200">
          {/* Search and Filter */}
          <div className="p-4 border-b border-[#2a2a32]">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b75]" />
                <input
                  type="text"
                  placeholder="Search team members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40 focus:border-[#e5a825] placeholder:text-[#6b6b75]"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-3 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40 focus:border-[#e5a825]"
              >
                <option value="all">All ({employees.length})</option>
                <option value="active">Active ({employees.filter(e => e.isActive !== false).length})</option>
                <option value="inactive">Inactive ({employees.filter(e => e.isActive === false).length})</option>
              </select>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-[#2a2a32]">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                onClick={() => {
                  setSelectedEmployee(emp);
                  setIsEditing(false);
                }}
                className={`p-4 cursor-pointer transition-colors ${
                  emp.isActive === false ? 'opacity-50' : ''
                } ${selectedEmployee?.id === emp.id
                  ? 'bg-[#e5a825]/10'
                  : 'hover:bg-[#222228]'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      emp.isActive === false ? 'bg-[#3a3a45]' : 'bg-[#a855f7]'
                    }`}>
                      <span className="text-white font-medium text-sm">
                        {emp.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${emp.isActive === false ? 'text-[#6b6b75]' : 'text-white'}`}>
                        {emp.name}
                        {emp.isActive === false && <span className="ml-2 text-xs text-[#ef4444]">(Inactive)</span>}
                      </p>
                      <p className="text-xs text-[#6b6b75]">
                        {emp.bartendingScale >= 4 ? 'Bartender' : 'Server'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Active/Inactive Toggle */}
                    <button
                      onClick={(e) => toggleActiveStatus(emp, e)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        emp.isActive !== false ? 'bg-[#22c55e]' : 'bg-[#3a3a45]'
                      }`}
                      title={emp.isActive !== false ? 'Click to deactivate' : 'Click to activate'}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        emp.isActive !== false ? 'left-5' : 'left-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-[#6b6b75]">
                  <span>Bar: {getSkillStars(emp.bartendingScale)}</span>
                  <span>Solo: {getSkillStars(emp.aloneScale)}</span>
                  {emp.minShiftsPerWeek && <span>Min: {emp.minShiftsPerWeek}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#141417]">
                <tr>
                  <th
                    onClick={() => handleSort('name')}
                    className="text-left py-3 px-4 text-xs font-semibold text-[#6b6b75] uppercase tracking-wider cursor-pointer hover:bg-[#1a1a1f] transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      Employee
                      <SortIcon active={sortField === 'name'} direction={sortField === 'name' ? sortDirection : 'asc'} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('bartending')}
                    className="text-center py-3 px-4 text-xs font-semibold text-[#6b6b75] uppercase tracking-wider cursor-pointer hover:bg-[#1a1a1f] transition-colors select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      Bartending
                      <SortIcon active={sortField === 'bartending'} direction={sortField === 'bartending' ? sortDirection : 'asc'} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('alone')}
                    className="text-center py-3 px-4 text-xs font-semibold text-[#6b6b75] uppercase tracking-wider cursor-pointer hover:bg-[#1a1a1f] transition-colors select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      Solo Work
                      <SortIcon active={sortField === 'alone'} direction={sortField === 'alone' ? sortDirection : 'asc'} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('minShifts')}
                    className="text-center py-3 px-4 text-xs font-semibold text-[#6b6b75] uppercase tracking-wider cursor-pointer hover:bg-[#1a1a1f] transition-colors select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      Min Shifts
                      <SortIcon active={sortField === 'minShifts'} direction={sortField === 'minShifts' ? sortDirection : 'asc'} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="text-right py-3 px-4 text-xs font-semibold text-[#6b6b75] uppercase tracking-wider cursor-pointer hover:bg-[#1a1a1f] transition-colors select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Status
                      <SortIcon active={sortField === 'status'} direction={sortField === 'status' ? sortDirection : 'asc'} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a32]">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setIsEditing(false);
                    }}
                    className={`cursor-pointer transition-colors ${
                      emp.isActive === false ? 'opacity-50' : ''
                    } ${selectedEmployee?.id === emp.id
                      ? 'bg-[#e5a825]/10'
                      : 'hover:bg-[#222228]'
                      }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          emp.isActive === false ? 'bg-[#3a3a45]' : 'bg-[#a855f7]'
                        }`}>
                          <span className="text-white font-medium text-sm">
                            {emp.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${emp.isActive === false ? 'text-[#6b6b75]' : 'text-white'}`}>
                            {emp.name}
                            {emp.isActive === false && <span className="ml-2 text-xs text-[#ef4444]">(Inactive)</span>}
                          </p>
                          <p className="text-xs text-[#6b6b75]">
                            {emp.bartendingScale >= 4 ? 'Bartender' : 'Server'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm">{getSkillStars(emp.bartendingScale)}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm">{getSkillStars(emp.aloneScale)}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm text-white">{emp.minShiftsPerWeek || '-'}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {/* Active/Inactive Toggle */}
                        <button
                          onClick={(e) => toggleActiveStatus(emp, e)}
                          className={`relative w-10 h-5 rounded-full transition-colors ${
                            emp.isActive !== false ? 'bg-[#22c55e]' : 'bg-[#3a3a45]'
                          }`}
                          title={emp.isActive !== false ? 'Click to deactivate' : 'Click to activate'}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                            emp.isActive !== false ? 'left-5' : 'left-0.5'
                          }`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Employee Details Panel - Desktop Sidebar / Mobile Modal */}
        {/* Desktop version */}
        <div className="hidden lg:block bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {selectedEmployee ? (
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#a855f7] rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-xl">
                      {(isEditing ? editName : selectedEmployee.name).charAt(0)}
                    </span>
                  </div>
                  <div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="text-lg font-semibold text-white bg-[#141417] border border-[#2a2a32] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
                      />
                    ) : (
                      <h3 className="text-lg font-semibold text-white">
                        {selectedEmployee.name}
                      </h3>
                    )}
                    <p className="text-sm text-[#6b6b75]">
                      {(isEditing ? editBartending : selectedEmployee.bartendingScale) >= 4 ? 'Bartender' : 'Server'}
                    </p>
                  </div>
                </div>
                {!isEditing && (
                  <button
                    onClick={startEditing}
                    className="p-2 text-[#6b6b75] hover:text-[#e5a825] hover:bg-[#e5a825]/10 rounded-lg transition-colors"
                    title="Edit employee"
                  >
                    <EditIcon className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Skills */}
              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[#a0a0a8]">Bartending</span>
                    {isEditing ? (
                      <span className="text-sm">{getSkillStars(editBartending, true, setEditBartending)}</span>
                    ) : (
                      <span className="text-sm font-medium text-white">{selectedEmployee.bartendingScale}/5</span>
                    )}
                  </div>
                  <div className="w-full h-2 bg-[#2a2a32] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#3b82f6] rounded-full transition-all"
                      style={{ width: `${((isEditing ? editBartending : selectedEmployee.bartendingScale) / 5) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[#a0a0a8]">Solo Work</span>
                    {isEditing ? (
                      <span className="text-sm">{getSkillStars(editAlone, true, setEditAlone)}</span>
                    ) : (
                      <span className="text-sm font-medium text-white">{selectedEmployee.aloneScale}/5</span>
                    )}
                  </div>
                  <div className="w-full h-2 bg-[#2a2a32] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#22c55e] rounded-full transition-all"
                      style={{ width: `${((isEditing ? editAlone : selectedEmployee.aloneScale) / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Min Shifts */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#a0a0a8]">Minimum Shifts/Week</span>
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      max="6"
                      value={editMinShifts || ''}
                      onChange={(e) => setEditMinShifts(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="-"
                      className="w-16 text-center bg-[#141417] border border-[#2a2a32] rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
                    />
                  ) : (
                    <span className="text-sm font-medium text-white">{selectedEmployee.minShiftsPerWeek || '-'}</span>
                  )}
                </div>
              </div>

              {/* Preferences */}
              {!isEditing && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-white mb-3">Preferences</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmployee.preferences.prefersMorning && (
                      <span className="px-2.5 py-1 bg-[#e5a825]/10 text-[#e5a825] text-xs rounded-lg border border-[#e5a825]/30">
                        Prefers Morning
                      </span>
                    )}
                    {selectedEmployee.preferences.prefersNight && (
                      <span className="px-2.5 py-1 bg-[#a855f7]/10 text-[#a855f7] text-xs rounded-lg border border-[#a855f7]/30">
                        Prefers Night
                      </span>
                    )}
                    {selectedEmployee.preferences.needsBartenderOnShift && (
                      <span className="px-2.5 py-1 bg-[#ef4444]/10 text-[#ef4444] text-xs rounded-lg border border-[#ef4444]/30">
                        Needs Bartender Support
                      </span>
                    )}
                    {selectedEmployee.preferences.canOpen && (
                      <span className="px-2.5 py-1 bg-[#22c55e]/10 text-[#22c55e] text-xs rounded-lg border border-[#22c55e]/30">
                        Can Open
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Availability & Restrictions - View Mode */}
              {!isEditing && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-white mb-3">Weekly Availability</h4>
                  <div className="space-y-2">
                    {dayLabels.map(({ key, label }) => {
                      const dayAvail = selectedEmployee.availability[key] as DayAvailability | null;
                      const shifts = dayAvail?.shifts || [];
                      const isSunday = key === 'sunday';

                      const shiftOptions: { label: string; type: 'any' | 'morning' | 'mid' | 'night' }[] = [
                        { label: 'Open', type: 'any' },
                        { label: 'Morning', type: 'morning' },
                        { label: 'Mid', type: 'mid' },
                        ...(isSunday ? [] : [{ label: 'Dinner', type: 'night' as const }])
                      ];

                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="w-10 text-xs font-medium text-[#6b6b75]">{label}</span>
                          <div className="flex gap-1">
                            {shiftOptions.map(({ label: shiftLabel, type }) => {
                              const isSelected = shifts.some(s => s.type === type);
                              return (
                                <span
                                  key={type}
                                  className={`px-2 py-1 text-xs rounded-md font-medium ${isSelected
                                      ? 'bg-[#e5a825] text-[#0d0d0f]'
                                      : 'bg-[#2a2a32] text-[#6b6b75]'
                                    }`}
                                >
                                  {shiftLabel}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Time Restrictions - View Mode (inline under availability) */}
                  <div className="mt-4 pt-4 border-t border-[#2a2a32]">
                    <h4 className="text-sm font-medium text-white mb-2">Time Restrictions</h4>
                    {(!selectedEmployee.restrictions || selectedEmployee.restrictions.length === 0) ? (
                      <p className="text-xs text-[#6b6b75]">No restrictions set</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedEmployee.restrictions.map((r) => (
                          <div key={r.id} className="p-2 bg-[#141417] rounded-lg border border-[#ef4444]/30">
                            <div className="text-xs text-[#ef4444] font-medium">
                              {r.type === 'no_before' && `Cannot start before ${r.time}`}
                              {r.type === 'no_after' && `Must finish by ${r.time}`}
                              {r.type === 'unavailable_range' && `Unavailable ${r.startTime}-${r.endTime}`}
                            </div>
                            {r.days.length > 0 && (
                              <div className="text-xs text-[#6b6b75] mt-1">
                                {r.days.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}
                              </div>
                            )}
                            {r.days.length === 0 && (
                              <div className="text-xs text-[#6b6b75] mt-1">All days</div>
                            )}
                            {r.reason && <div className="text-xs text-[#a0a0a8] mt-1">{r.reason}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Availability - Edit Mode */}
              {isEditing && editAvailability && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-white mb-3">Weekly Availability</h4>
                  <div className="space-y-2">
                    {dayLabels.map(({ key, label }) => {
                      const isSunday = key === 'sunday';

                      const shiftOptions: { label: string; type: 'any' | 'morning' | 'mid' | 'night' }[] = [
                        { label: 'Open', type: 'any' },
                        { label: 'Morning', type: 'morning' },
                        { label: 'Mid', type: 'mid' },
                        ...(isSunday ? [] : [{ label: 'Dinner', type: 'night' as const }])
                      ];

                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="w-10 text-xs font-medium text-[#6b6b75]">{label}</span>
                          <div className="flex gap-1">
                            {shiftOptions.map(({ label: shiftLabel, type }) => {
                              const isSelected = hasShiftType(key, type);
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => toggleShiftTypeForDay(key, type)}
                                  className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${isSelected
                                      ? 'bg-[#e5a825] text-[#0d0d0f]'
                                      : 'bg-[#2a2a32] text-[#6b6b75] hover:bg-[#3a3a45]'
                                    }`}
                                >
                                  {shiftLabel}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Restrictions - Edit Mode */}
              {isEditing && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-white">Time Restrictions</h4>
                    <button
                      type="button"
                      onClick={addRestriction}
                      className="text-xs text-[#e5a825] hover:text-[#f0b429] font-medium"
                    >
                      + Add Restriction
                    </button>
                  </div>
                  {editRestrictions.length === 0 && (
                    <p className="text-xs text-[#6b6b75]">No restrictions set</p>
                  )}
                  <div className="space-y-3">
                    {editRestrictions.map((r) => (
                      <div key={r.id} className="p-3 bg-[#141417] rounded-lg border border-[#2a2a32]">
                        {/* Restriction Type */}
                        <div className="flex items-center gap-2 mb-2">
                          <select
                            value={r.type}
                            onChange={(e) => updateRestriction(r.id, { type: e.target.value as EmployeeRestriction['type'] })}
                            className="flex-1 px-2 py-1 bg-[#0d0d0f] border border-[#2a2a32] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#e5a825]/40"
                          >
                            <option value="no_before">Cannot start before</option>
                            <option value="no_after">Must finish by</option>
                            <option value="unavailable_range">Unavailable range</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => removeRestriction(r.id)}
                            className="p-1 text-[#ef4444] hover:bg-[#ef4444]/10 rounded"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Time Input(s) */}
                        {(r.type === 'no_before' || r.type === 'no_after') && (
                          <div className="mb-2">
                            <input
                              type="time"
                              value={r.time || ''}
                              onChange={(e) => updateRestriction(r.id, { time: e.target.value })}
                              className="w-full px-2 py-1 bg-[#0d0d0f] border border-[#2a2a32] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#e5a825]/40"
                            />
                          </div>
                        )}
                        {r.type === 'unavailable_range' && (
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="time"
                              value={r.startTime || ''}
                              onChange={(e) => updateRestriction(r.id, { startTime: e.target.value })}
                              className="flex-1 px-2 py-1 bg-[#0d0d0f] border border-[#2a2a32] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#e5a825]/40"
                            />
                            <span className="text-xs text-[#6b6b75]">to</span>
                            <input
                              type="time"
                              value={r.endTime || ''}
                              onChange={(e) => updateRestriction(r.id, { endTime: e.target.value })}
                              className="flex-1 px-2 py-1 bg-[#0d0d0f] border border-[#2a2a32] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#e5a825]/40"
                            />
                          </div>
                        )}

                        {/* Days Selection */}
                        <div className="mb-2">
                          <div className="text-xs text-[#6b6b75] mb-1">Applies to (leave empty for all days):</div>
                          <div className="flex flex-wrap gap-1">
                            {(['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayOfWeek[]).map((day) => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => toggleRestrictionDay(r.id, day)}
                                className={`px-2 py-0.5 text-xs rounded font-medium transition-colors ${
                                  r.days.includes(day)
                                    ? 'bg-[#ef4444] text-white'
                                    : 'bg-[#2a2a32] text-[#6b6b75] hover:bg-[#3a3a45]'
                                }`}
                              >
                                {day.charAt(0).toUpperCase() + day.slice(0, 2)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Reason */}
                        <input
                          type="text"
                          placeholder="Reason (optional)"
                          value={r.reason || ''}
                          onChange={(e) => updateRestriction(r.id, { reason: e.target.value })}
                          className="w-full px-2 py-1 bg-[#0d0d0f] border border-[#2a2a32] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#e5a825]/40 placeholder:text-[#6b6b75]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Permanent Rules - View Mode */}
              {!isEditing && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-white mb-2">Permanent Rules</h4>
                  {(!selectedEmployee.permanentRules || selectedEmployee.permanentRules.length === 0) ? (
                    <p className="text-xs text-[#6b6b75]">No permanent rules set</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedEmployee.permanentRules.filter(r => r.isActive).map((r) => {
                        // Format days for display
                        const displayDays = r.type === 'fixed_shift' && r.days && r.days.length > 0
                          ? r.days.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')
                          : r.day.charAt(0).toUpperCase() + r.day.slice(1);

                        return (
                          <div key={r.id} className="p-2 bg-[#141417] rounded-lg border border-[#22c55e]/30">
                            <div className="text-xs text-[#22c55e] font-medium">
                              {r.type === 'fixed_shift' && `Fixed: ${displayDays} ${r.startTime}-${r.endTime}`}
                              {r.type === 'only_available' && `Only available: ${displayDays} ${r.startTime}-${r.endTime}`}
                              {r.type === 'never_schedule' && `Never schedule: ${displayDays}`}
                            </div>
                            {r.reason && <div className="text-xs text-[#a0a0a8] mt-1">{r.reason}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Permanent Rules - Edit Mode */}
              {isEditing && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-white">Permanent Rules</h4>
                    <button
                      type="button"
                      onClick={addPermanentRule}
                      className="text-xs text-[#22c55e] hover:text-[#4ade80] font-medium"
                    >
                      + Add Rule
                    </button>
                  </div>
                  <p className="text-xs text-[#6b6b75] mb-3">
                    Set fixed recurring schedules (e.g., &quot;Only works Saturday 9am-12pm&quot;)
                  </p>
                  {editPermanentRules.length === 0 && (
                    <p className="text-xs text-[#6b6b75]">No permanent rules set</p>
                  )}
                  <div className="space-y-3">
                    {editPermanentRules.map((r) => (
                      <div key={r.id} className={`p-3 bg-[#141417] rounded-lg border ${r.isActive ? 'border-[#22c55e]/30' : 'border-[#3a3a45] opacity-50'}`}>
                        {/* Rule Header with Toggle and Delete */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => togglePermanentRuleActive(r.id)}
                              className={`relative w-8 h-4 rounded-full transition-colors ${
                                r.isActive ? 'bg-[#22c55e]' : 'bg-[#3a3a45]'
                              }`}
                              title={r.isActive ? 'Click to disable' : 'Click to enable'}
                            >
                              <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                                r.isActive ? 'left-4' : 'left-0.5'
                              }`} />
                            </button>
                            <span className="text-xs text-[#6b6b75]">{r.isActive ? 'Active' : 'Inactive'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePermanentRule(r.id)}
                            className="p-1 text-[#ef4444] hover:bg-[#ef4444]/10 rounded"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Rule Type */}
                        <div className="mb-2">
                          <select
                            value={r.type}
                            onChange={(e) => updatePermanentRule(r.id, { type: e.target.value as PermanentRule['type'] })}
                            className="w-full px-2 py-1 bg-[#0d0d0f] border border-[#2a2a32] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#22c55e]/40"
                          >
                            <option value="fixed_shift">Fixed Shift (always schedule this time)</option>
                            <option value="only_available">Only Available (can ONLY work this time)</option>
                            <option value="never_schedule">Never Schedule (never work this day)</option>
                          </select>
                        </div>

                        {/* Day Selection - Multi-select for fixed_shift, single for others */}
                        <div className="mb-2">
                          <div className="text-xs text-[#6b6b75] mb-1">
                            {r.type === 'fixed_shift' ? 'Days (select multiple):' : 'Day:'}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayOfWeek[]).map((day) => {
                              // For fixed_shift, use multi-select with days array
                              const isSelected = r.type === 'fixed_shift'
                                ? (r.days || [r.day]).includes(day)
                                : r.day === day;

                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    if (r.type === 'fixed_shift') {
                                      togglePermanentRuleDay(r.id, day);
                                    } else {
                                      updatePermanentRule(r.id, { day });
                                    }
                                  }}
                                  className={`px-2 py-0.5 text-xs rounded font-medium transition-colors ${
                                    isSelected
                                      ? 'bg-[#22c55e] text-white'
                                      : 'bg-[#2a2a32] text-[#6b6b75] hover:bg-[#3a3a45]'
                                  }`}
                                >
                                  {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Time Range (for fixed_shift and only_available) */}
                        {r.type !== 'never_schedule' && (
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="time"
                              value={r.startTime || ''}
                              onChange={(e) => updatePermanentRule(r.id, { startTime: e.target.value })}
                              className="flex-1 px-2 py-1 bg-[#0d0d0f] border border-[#2a2a32] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#22c55e]/40"
                            />
                            <span className="text-xs text-[#6b6b75]">to</span>
                            <input
                              type="time"
                              value={r.endTime || ''}
                              onChange={(e) => updatePermanentRule(r.id, { endTime: e.target.value })}
                              className="flex-1 px-2 py-1 bg-[#0d0d0f] border border-[#2a2a32] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#22c55e]/40"
                            />
                          </div>
                        )}

                        {/* Reason */}
                        <input
                          type="text"
                          placeholder="Reason (e.g., Second job, School)"
                          value={r.reason || ''}
                          onChange={(e) => updatePermanentRule(r.id, { reason: e.target.value })}
                          className="w-full px-2 py-1 bg-[#0d0d0f] border border-[#2a2a32] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#22c55e]/40 placeholder:text-[#6b6b75]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {isEditing ? (
                <div className="flex gap-2">
                  <button
                    onClick={saveChanges}
                    className="flex-1 px-4 py-2 bg-[#e5a825] text-[#0d0d0f] rounded-lg hover:bg-[#f0b429] transition-colors font-medium"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-4 py-2 bg-[#2a2a32] text-[#a0a0a8] rounded-lg hover:bg-[#3a3a45] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-4 py-2 bg-[#ef4444]/10 text-[#ef4444] rounded-lg hover:bg-[#ef4444]/20 transition-colors flex items-center justify-center gap-2 border border-[#ef4444]/30"
                >
                  <TrashIcon className="w-4 h-4" />
                  Remove Employee
                </button>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-12 h-12 bg-[#222228] rounded-xl flex items-center justify-center mb-4 border border-[#2a2a32]">
                <UserIcon className="w-6 h-6 text-[#6b6b75]" />
              </div>
              <p className="text-sm text-[#6b6b75]">Select an employee to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Employee Details Modal */}
      {selectedEmployee && (
        <div className="lg:hidden fixed inset-0 bg-black/70 z-50 backdrop-blur-sm">
          <div className="absolute inset-x-0 bottom-0 bg-[#1a1a1f] rounded-t-2xl border-t border-[#2a2a32] max-h-[85vh] overflow-y-auto">
            {/* Mobile Modal Header */}
            <div className="sticky top-0 bg-[#1a1a1f] p-4 border-b border-[#2a2a32] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#a855f7] rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {(isEditing ? editName : selectedEmployee.name).charAt(0)}
                  </span>
                </div>
                <div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-base font-semibold text-white bg-[#141417] border border-[#2a2a32] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
                    />
                  ) : (
                    <h3 className="text-base font-semibold text-white">{selectedEmployee.name}</h3>
                  )}
                  <p className="text-xs text-[#6b6b75]">
                    {(isEditing ? editBartending : selectedEmployee.bartendingScale) >= 4 ? 'Bartender' : 'Server'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <button
                    onClick={startEditing}
                    className="p-2 text-[#6b6b75] hover:text-[#e5a825] rounded-lg"
                  >
                    <EditIcon className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedEmployee(null);
                    setIsEditing(false);
                  }}
                  className="p-2 text-[#6b6b75] hover:text-white rounded-lg"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mobile Modal Content */}
            <div className="p-4 space-y-4">
              {/* Skills */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[#a0a0a8]">Bartending</span>
                    {isEditing ? (
                      <span className="text-sm">{getSkillStars(editBartending, true, setEditBartending)}</span>
                    ) : (
                      <span className="text-sm font-medium text-white">{selectedEmployee.bartendingScale}/5</span>
                    )}
                  </div>
                  <div className="w-full h-2 bg-[#2a2a32] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#3b82f6] rounded-full"
                      style={{ width: `${((isEditing ? editBartending : selectedEmployee.bartendingScale) / 5) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[#a0a0a8]">Solo Work</span>
                    {isEditing ? (
                      <span className="text-sm">{getSkillStars(editAlone, true, setEditAlone)}</span>
                    ) : (
                      <span className="text-sm font-medium text-white">{selectedEmployee.aloneScale}/5</span>
                    )}
                  </div>
                  <div className="w-full h-2 bg-[#2a2a32] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#22c55e] rounded-full"
                      style={{ width: `${((isEditing ? editAlone : selectedEmployee.aloneScale) / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Min Shifts */}
              <div className="flex items-center justify-between py-2 border-t border-[#2a2a32]">
                <span className="text-sm text-[#a0a0a8]">Minimum Shifts/Week</span>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={editMinShifts || ''}
                    onChange={(e) => setEditMinShifts(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="-"
                    className="w-16 text-center bg-[#141417] border border-[#2a2a32] rounded px-2 py-1 text-sm text-white"
                  />
                ) : (
                  <span className="text-sm font-medium text-white">{selectedEmployee.minShiftsPerWeek || '-'}</span>
                )}
              </div>

              {/* Availability - View Mode */}
              {!isEditing && (
                <div className="border-t border-[#2a2a32] pt-4">
                  <h4 className="text-sm font-medium text-white mb-3">Availability</h4>
                  <div className="space-y-2">
                    {dayLabels.map(({ key, label }) => {
                      const dayAvail = selectedEmployee.availability[key] as DayAvailability | null;
                      const shifts = dayAvail?.shifts || [];
                      const isSunday = key === 'sunday';

                      const shiftOptions: { label: string; type: 'any' | 'morning' | 'mid' | 'night' }[] = [
                        { label: 'Open', type: 'any' },
                        { label: 'AM', type: 'morning' },
                        { label: 'Mid', type: 'mid' },
                        ...(isSunday ? [] : [{ label: 'PM', type: 'night' as const }])
                      ];

                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="w-8 text-xs font-medium text-[#6b6b75]">{label}</span>
                          <div className="flex gap-1 flex-wrap">
                            {shiftOptions.map(({ label: shiftLabel, type }) => {
                              const isSelected = shifts.some(s => s.type === type);
                              return (
                                <span
                                  key={type}
                                  className={`px-2 py-0.5 text-xs rounded font-medium ${isSelected
                                      ? 'bg-[#e5a825] text-[#0d0d0f]'
                                      : 'bg-[#2a2a32] text-[#6b6b75]'
                                    }`}
                                >
                                  {shiftLabel}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#2a2a32]">
                {isEditing ? (
                  <div className="flex gap-2">
                    <button
                      onClick={saveChanges}
                      className="flex-1 px-4 py-2.5 bg-[#e5a825] text-[#0d0d0f] rounded-lg font-medium"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-4 py-2.5 bg-[#2a2a32] text-[#a0a0a8] rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full px-4 py-2.5 bg-[#ef4444]/10 text-[#ef4444] rounded-lg flex items-center justify-center gap-2 border border-[#ef4444]/30"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Remove Employee
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <AddEmployeeModal
          onAdd={(emp) => {
            onAddEmployee(emp);
            setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedEmployee && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[#1a1a1f] rounded-xl p-6 w-full max-w-md mx-4 shadow-xl border border-[#2a2a32]">
            <h3 className="text-lg font-semibold text-white mb-2">Remove Employee?</h3>
            <p className="text-[#a0a0a8] mb-6">
              Are you sure you want to remove <strong className="text-white">{selectedEmployee.name}</strong> from the team?
              This will also remove any locked shifts for this employee.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-[#ef4444] text-white rounded-lg hover:bg-[#dc2626] transition-colors"
              >
                Remove
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-[#2a2a32] text-[#a0a0a8] rounded-lg hover:bg-[#3a3a45] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add Employee Modal Component
function AddEmployeeModal({ onAdd, onClose }: { onAdd: (emp: Employee) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [bartending, setBartending] = useState(0);
  const [alone, setAlone] = useState(0);
  const [minShifts, setMinShifts] = useState<number | undefined>(undefined);

  const getSkillStars = (level: number, onChange: (val: number) => void) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`text-2xl cursor-pointer ${i < level ? 'text-[#e5a825]' : 'text-[#3a3a45]'} hover:text-[#f0b429]`}
        onClick={() => onChange(i + 1)}
      >
        *
      </span>
    ));
  };

  const createDefaultAvailability = (): Availability => {
    const defaultDay: DayAvailability = { available: true, shifts: [{ type: 'any' }] };
    return {
      monday: null,
      tuesday: { ...defaultDay },
      wednesday: { ...defaultDay },
      thursday: { ...defaultDay },
      friday: { ...defaultDay },
      saturday: { ...defaultDay },
      sunday: { ...defaultDay },
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newEmployee: Employee = {
      id: name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name: name.trim(),
      bartendingScale: bartending,
      aloneScale: alone,
      availability: createDefaultAvailability(),
      exclusions: [],
      preferences: {},
      minShiftsPerWeek: minShifts,
    };

    onAdd(newEmployee);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#1a1a1f] rounded-xl p-6 w-full max-w-md mx-4 shadow-xl border border-[#2a2a32]">
        <h3 className="text-lg font-semibold text-white mb-4">Add New Employee</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#a0a0a8] mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter employee name"
              className="w-full px-3 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40 placeholder:text-[#6b6b75]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a0a0a8] mb-1">Bartending Skill</label>
            <div className="flex items-center gap-1">
              {getSkillStars(bartending, setBartending)}
              <span className="ml-2 text-sm text-[#6b6b75]">{bartending}/5</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a0a0a8] mb-1">Solo Work Skill</label>
            <div className="flex items-center gap-1">
              {getSkillStars(alone, setAlone)}
              <span className="ml-2 text-sm text-[#6b6b75]">{alone}/5</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a0a0a8] mb-1">Minimum Shifts/Week</label>
            <input
              type="number"
              min="0"
              max="6"
              value={minShifts || ''}
              onChange={(e) => setMinShifts(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Optional"
              className="w-full px-3 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40 placeholder:text-[#6b6b75]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2 bg-[#e5a825] text-[#0d0d0f] rounded-lg hover:bg-[#f0b429] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Add Employee
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#2a2a32] text-[#a0a0a8] rounded-lg hover:bg-[#3a3a45] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Icon Components
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
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

function SortIcon({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
  return (
    <svg
      className={`w-4 h-4 transition-all ${active ? 'text-[#e5a825]' : 'text-[#3a3a45]'}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      {direction === 'asc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l4-4m0 0l4 4m-4-4v18" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 17l-4 4m0 0l-4-4m4 4V3" />
      )}
    </svg>
  );
}
