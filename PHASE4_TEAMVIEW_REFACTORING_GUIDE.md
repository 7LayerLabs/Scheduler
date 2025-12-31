# Phase 4: TeamView Refactoring Implementation Guide

## Status
- ✅ Sub-components created and committed
- ✅ Imports added to TeamView.tsx
- 🔄 Ready for final refactoring (this guide)

## What We Created
1. **AvailabilityEditor.tsx** - Weekly availability editor
2. **RestrictionsEditor.tsx** - Time restrictions editor
3. **PermanentRulesEditor.tsx** - Permanent rules editor
4. **EmployeeEditForm.tsx** - Combined form using the 3 editors above
5. **EmployeeListItem.tsx** - Unified mobile/desktop list item

## TeamView Refactoring Steps

### Step 1: Replace Edit Form (Lines 774-1081)
**Remove:** All the manual availability, restrictions, and permanent rules rendering
**Add:** Replace with single `<EmployeeEditForm />` component call

**Location:** Desktop sidebar edit mode section (around line 774-1081)

**Change from:**
```tsx
{isEditing && editAvailability && (
  <div className="mb-6">
    {/* Availability - Edit Mode 774-818 */}
  </div>
)}

{isEditing && (
  <div className="mb-6">
    {/* Restrictions - Edit Mode 821-921 */}
  </div>
)}

{isEditing && (
  <div className="mb-6">
    {/* Permanent Rules - Edit Mode 953-1081 */}
  </div>
)}
```

**Change to:**
```tsx
{isEditing && editAvailability && (
  <EmployeeEditForm
    name={editName}
    phoneNumber={editPhoneNumber}
    bartending={editBartending}
    alone={editAlone}
    minShifts={editMinShifts}
    availability={editAvailability}
    restrictions={editRestrictions}
    permanentRules={editPermanentRules}
    onNameChange={setEditName}
    onPhoneChange={setEditPhoneNumber}
    onBartendingChange={setEditBartending}
    onAloneChange={setEditAlone}
    onMinShiftsChange={setEditMinShifts}
    onAvailabilityChange={setEditAvailability}
    onRestrictionsChange={setEditRestrictions}
    onPermanentRulesChange={setEditPermanentRules}
  />
)}
```

### Step 2: Replace Employee List Items (Lines 357-528)
**Remove:** Mobile card view (355-410) and desktop table rows (464-525)
**Add:** Use EmployeeListItem component for both views

**Location:** Employee list rendering

**Change from:**
```tsx
{/* Mobile Card View */}
<div className="md:hidden divide-y divide-[#2a2a32]">
  {filteredEmployees.map((emp) => (
    <div key={emp.id} onClick={() => {...}} ...>
      {/* 355-408 lines of mobile card code */}
    </div>
  ))}
</div>

{/* Desktop Table View */}
<div className="hidden md:block overflow-x-auto">
  <table className="w-full">
    <thead>...</thead>
    <tbody className="divide-y divide-[#2a2a32]">
      {filteredEmployees.map((emp) => (
        <tr key={emp.id} onClick={() => {...}} ...>
          {/* 464-524 lines of table cell code */}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Change to:**
```tsx
{/* Employee List - Uses EmployeeListItem for both mobile/desktop */}
<div className="divide-y divide-[#2a2a32]">
  {filteredEmployees.map((emp) => (
    <EmployeeListItem
      key={emp.id}
      employee={emp}
      isSelected={selectedEmployee?.id === emp.id}
      onSelect={(employee) => {
        setSelectedEmployee(employee);
        setIsEditing(false);
      }}
      onToggleActive={(employee, e) => {
        e.stopPropagation();
        toggleActiveStatus(employee, e);
      }}
    />
  ))}
</div>

{/* Desktop table wrapper */}
<div className="hidden md:block overflow-x-auto">
  <table className="w-full">
    <thead className="bg-[#141417]">
      <tr>
        <th onClick={() => handleSort('name')} className="...">
          <div className="flex items-center gap-1">
            Employee
            <SortIcon active={sortField === 'name'} direction={sortField === 'name' ? sortDirection : 'asc'} />
          </div>
        </th>
        {/* Other headers */}
      </tr>
    </thead>
    <tbody className="divide-y divide-[#2a2a32]">
      {filteredEmployees.map((emp) => (
        <EmployeeListItem
          key={emp.id}
          employee={emp}
          isSelected={selectedEmployee?.id === emp.id}
          onSelect={(employee) => {
            setSelectedEmployee(employee);
            setIsEditing(false);
          }}
          onToggleActive={(employee, e) => {
            e.stopPropagation();
            toggleActiveStatus(employee, e);
          }}
        />
      ))}
    </tbody>
  </table>
</div>
```

### Step 3: Code Removal (After integration)
Once the above changes are made, the following code can be removed from TeamView:

**Remove Functions (no longer needed):**
- `toggleShiftTypeForDay()` (moved to AvailabilityEditor)
- `getShiftTypesForDay()` (moved to AvailabilityEditor)
- `hasShiftType()` (moved to AvailabilityEditor)
- `addRestriction()` (moved to RestrictionsEditor)
- `updateRestriction()` (moved to RestrictionsEditor)
- `removeRestriction()` (moved to RestrictionsEditor)
- `toggleRestrictionDay()` (moved to RestrictionsEditor)
- `addPermanentRule()` (moved to PermanentRulesEditor)
- `updatePermanentRule()` (moved to PermanentRulesEditor)
- `removePermanentRule()` (moved to PermanentRulesEditor)
- `togglePermanentRuleActive()` (moved to PermanentRulesEditor)
- `togglePermanentRuleDay()` (moved to PermanentRulesEditor)

**Keep Functions (still used in TeamView):**
- `handleSort()`
- `startEditing()`
- `saveChanges()`
- `toggleActiveStatus()`
- `getSkillStars()` (used in EmployeeListItem)

### Step 4: Expected Results
After refactoring:
- **TeamView.tsx**: 1,577 lines → ~600-700 lines (55-60% reduction)
- **Code duplication**: Mobile/desktop duplicate code eliminated
- **Maintainability**: Focused components with single responsibilities
- **Functionality**: 100% preserved

## Testing Checklist
- [ ] App runs on localhost:3000 without errors
- [ ] Employee list displays correctly (mobile + desktop)
- [ ] List items are clickable and select employees
- [ ] Edit form opens and all fields work
- [ ] Availability editor functions correctly
- [ ] Restrictions editor works (add/remove/edit)
- [ ] Permanent rules editor works (add/remove/edit/toggle)
- [ ] Save and cancel buttons work
- [ ] Active/inactive toggle works
- [ ] Search and filters work

## Next Steps
1. Apply the changes above to TeamView.tsx
2. Test thoroughly on localhost:3000
3. Remove unused functions and code
4. Commit with message: "refactor: Integrate team sub-components into TeamView"

## Notes
- The components are designed to work independently
- State management is kept in TeamView for now (can be optimized later)
- Mobile and desktop views are unified in EmployeeListItem
- All original functionality is preserved
