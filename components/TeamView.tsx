'use client';

import { useState } from 'react';
import { Employee, Availability, DayAvailability } from '@/lib/types';

interface Props {
  employees: Employee[];
  onUpdateEmployee: (employee: Employee) => void;
  onAddEmployee: (employee: Employee) => void;
  onRemoveEmployee: (employeeId: string) => void;
}

type SortField = 'name' | 'bartending' | 'alone' | 'minShifts' | 'status';
type SortDirection = 'asc' | 'desc';

export default function TeamView({ employees, onUpdateEmployee, onAddEmployee, onRemoveEmployee }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editBartending, setEditBartending] = useState(0);
  const [editAlone, setEditAlone] = useState(0);
  const [editMinShifts, setEditMinShifts] = useState<number | undefined>(undefined);
  const [editAvailability, setEditAvailability] = useState<Availability | null>(null);

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
      newShifts = [...currentShifts, { type: shiftType as 'morning' | 'mid' | 'night' | 'any' }];
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
      };
      onUpdateEmployee(updatedEmployee);
      setSelectedEmployee(updatedEmployee);
      setIsEditing(false);
    }
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

  const getSkillStars = (level: number, interactive: boolean = false, onChange?: (val: number) => void) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`${i < level ? 'text-amber-400' : 'text-gray-200'} ${interactive ? 'cursor-pointer hover:text-amber-300' : ''}`}
        onClick={interactive && onChange ? () => onChange(i + 1) : undefined}
      >
        ★
      </span>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">Team</h1>
          <p className="text-sm text-slate-500 mt-1">
            {employees.length} team members
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Add Employee
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Employee List */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
          {/* Search */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                <tr>
                  <th
                    onClick={() => handleSort('name')}
                    className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      Employee
                      <SortIcon active={sortField === 'name'} direction={sortField === 'name' ? sortDirection : 'asc'} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('bartending')}
                    className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      Bartending
                      <SortIcon active={sortField === 'bartending'} direction={sortField === 'bartending' ? sortDirection : 'asc'} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('alone')}
                    className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      Solo Work
                      <SortIcon active={sortField === 'alone'} direction={sortField === 'alone' ? sortDirection : 'asc'} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('minShifts')}
                    className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <div className="flex items-center justify-center gap-1">
                      Min Shifts
                      <SortIcon active={sortField === 'minShifts'} direction={sortField === 'minShifts' ? sortDirection : 'asc'} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Status
                      <SortIcon active={sortField === 'status'} direction={sortField === 'status' ? sortDirection : 'asc'} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setIsEditing(false);
                    }}
                    className={`cursor-pointer transition-colors ${selectedEmployee?.id === emp.id
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-50'
                      }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {emp.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                          <p className="text-xs text-gray-500">
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
                      <span className="text-sm text-gray-900">{emp.minShiftsPerWeek || '—'}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${emp.exclusions.length > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-green-100 text-green-800'
                        }`}>
                        {emp.exclusions.length > 0 ? 'Has exclusions' : 'Available'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Employee Details Panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          {selectedEmployee ? (
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
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
                        className="text-lg font-semibold text-gray-900 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedEmployee.name}
                      </h3>
                    )}
                    <p className="text-sm text-gray-500">
                      {(isEditing ? editBartending : selectedEmployee.bartendingScale) >= 4 ? 'Bartender' : 'Server'}
                    </p>
                  </div>
                </div>
                {!isEditing && (
                  <button
                    onClick={startEditing}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
                    <span className="text-sm text-gray-600">Bartending</span>
                    {isEditing ? (
                      <span className="text-sm">{getSkillStars(editBartending, true, setEditBartending)}</span>
                    ) : (
                      <span className="text-sm font-medium">{selectedEmployee.bartendingScale}/5</span>
                    )}
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${((isEditing ? editBartending : selectedEmployee.bartendingScale) / 5) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Solo Work</span>
                    {isEditing ? (
                      <span className="text-sm">{getSkillStars(editAlone, true, setEditAlone)}</span>
                    ) : (
                      <span className="text-sm font-medium">{selectedEmployee.aloneScale}/5</span>
                    )}
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${((isEditing ? editAlone : selectedEmployee.aloneScale) / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Min Shifts */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Minimum Shifts/Week</span>
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      max="6"
                      value={editMinShifts || ''}
                      onChange={(e) => setEditMinShifts(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="—"
                      className="w-16 text-center border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <span className="text-sm font-medium">{selectedEmployee.minShiftsPerWeek || '—'}</span>
                  )}
                </div>
              </div>

              {/* Preferences */}
              {!isEditing && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Preferences</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmployee.preferences.prefersMorning && (
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs rounded-lg">
                        Prefers Morning
                      </span>
                    )}
                    {selectedEmployee.preferences.prefersNight && (
                      <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs rounded-lg">
                        Prefers Night
                      </span>
                    )}
                    {selectedEmployee.preferences.needsBartenderOnShift && (
                      <span className="px-2.5 py-1 bg-red-50 text-red-700 text-xs rounded-lg">
                        Needs Bartender Support
                      </span>
                    )}
                    {selectedEmployee.preferences.canOpen && (
                      <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs rounded-lg">
                        Can Open
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Availability - View Mode */}
              {!isEditing && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Weekly Availability</h4>
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
                          <span className="w-10 text-xs font-medium text-gray-600">{label}</span>
                          <div className="flex gap-1">
                            {shiftOptions.map(({ label: shiftLabel, type }) => {
                              const isSelected = shifts.some(s => s.type === type);
                              return (
                                <span
                                  key={type}
                                  className={`px-2 py-1 text-xs rounded-md font-medium ${isSelected
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-slate-100 text-slate-400'
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

              {/* Availability - Edit Mode */}
              {isEditing && editAvailability && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Weekly Availability</h4>
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
                          <span className="w-10 text-xs font-medium text-gray-600">{label}</span>
                          <div className="flex gap-1">
                            {shiftOptions.map(({ label: shiftLabel, type }) => {
                              const isSelected = hasShiftType(key, type);
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => toggleShiftTypeForDay(key, type)}
                                  className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${isSelected
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
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

              {/* Action Buttons */}
              {isEditing ? (
                <div className="flex gap-2">
                  <button
                    onClick={saveChanges}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <TrashIcon className="w-4 h-4" />
                  Remove Employee
                </button>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                <UserIcon className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Select an employee to view details</p>
            </div>
          )}
        </div>
      </div>

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Employee?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove <strong>{selectedEmployee.name}</strong> from the team?
              This will also remove any locked shifts for this employee.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Remove
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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
        className={`text-2xl cursor-pointer ${i < level ? 'text-amber-400' : 'text-gray-200'} hover:text-amber-300`}
        onClick={() => onChange(i + 1)}
      >
        ★
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Employee</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter employee name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bartending Skill</label>
            <div className="flex items-center gap-1">
              {getSkillStars(bartending, setBartending)}
              <span className="ml-2 text-sm text-gray-500">{bartending}/5</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Solo Work Skill</label>
            <div className="flex items-center gap-1">
              {getSkillStars(alone, setAlone)}
              <span className="ml-2 text-sm text-gray-500">{alone}/5</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Shifts/Week</label>
            <input
              type="number"
              min="0"
              max="6"
              value={minShifts || ''}
              onChange={(e) => setMinShifts(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Employee
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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
      className={`w-4 h-4 transition-all ${active ? 'text-amber-500' : 'text-slate-300'}`}
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
