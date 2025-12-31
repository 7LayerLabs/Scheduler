'use client';

import { Employee } from '@/lib/types';

interface Props {
  employee: Employee;
  isSelected: boolean;
  onSelect: (employee: Employee) => void;
  onToggleActive: (employee: Employee, e: React.MouseEvent) => void;
}

const getSkillStars = (level: number) => {
  return Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < level ? 'text-[#e5a825]' : 'text-[#3a3a45]'}>
      *
    </span>
  ));
};

export default function EmployeeListItem({
  employee,
  isSelected,
  onSelect,
  onToggleActive,
}: Props) {
  const emp = employee;
  const isInactive = emp.isActive === false;

  return (
    <>
      {/* Mobile Card View */}
      <div
        className="md:hidden p-4 cursor-pointer transition-colors border-b border-[#2a2a32] last:border-b-0"
        style={{
          opacity: isInactive ? 0.5 : 1,
          backgroundColor: isSelected ? '#e5a825/10' : 'transparent'
        }}
        onClick={() => onSelect(emp)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isInactive ? 'bg-[#3a3a45]' : 'bg-[#a855f7]'
              }`}
            >
              <span className="text-white font-medium text-sm">
                {emp.name.charAt(0)}
              </span>
            </div>
            <div>
              <p className={`text-sm font-medium ${isInactive ? 'text-[#6b6b75]' : 'text-white'}`}>
                {emp.name}
                {isInactive && <span className="ml-2 text-xs text-[#ef4444]">(Inactive)</span>}
              </p>
              <p className="text-xs text-[#6b6b75]">
                {emp.bartendingScale >= 4 ? 'Bartender' : 'Server'}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => onToggleActive(emp, e)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              emp.isActive !== false ? 'bg-[#22c55e]' : 'bg-[#3a3a45]'
            }`}
            title={emp.isActive !== false ? 'Click to deactivate' : 'Click to activate'}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                emp.isActive !== false ? 'left-5' : 'left-0.5'
              }`}
            />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-[#6b6b75]">
          <span>Bar: {getSkillStars(emp.bartendingScale)}</span>
          <span>Solo: {getSkillStars(emp.aloneScale)}</span>
          {emp.minShiftsPerWeek && <span>Min: {emp.minShiftsPerWeek}</span>}
        </div>
      </div>

      {/* Desktop Table Row - only rendered in server/hydration context */}
      {typeof document !== 'undefined' && (
        <tr
          className="hidden md:table-row cursor-pointer transition-colors"
          style={{
            opacity: isInactive ? 0.5 : 1,
            backgroundColor: isSelected ? '#e5a825/10' : 'transparent'
          }}
          onClick={() => onSelect(emp)}
        >
          <td className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  isInactive ? 'bg-[#3a3a45]' : 'bg-[#a855f7]'
                }`}
              >
                <span className="text-white font-medium text-sm">
                  {emp.name.charAt(0)}
                </span>
              </div>
              <div>
                <p className={`text-sm font-medium ${isInactive ? 'text-[#6b6b75]' : 'text-white'}`}>
                  {emp.name}
                  {isInactive && <span className="ml-2 text-xs text-[#ef4444]">(Inactive)</span>}
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
              <button
                onClick={(e) => onToggleActive(emp, e)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  emp.isActive !== false ? 'bg-[#22c55e]' : 'bg-[#3a3a45]'
                }`}
                title={emp.isActive !== false ? 'Click to deactivate' : 'Click to activate'}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    emp.isActive !== false ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
