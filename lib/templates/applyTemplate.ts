/**
 * Apply Template Utility
 * Applies a template to a new week
 */

import type { ScheduleTemplate } from '@/lib/instantdb';

export interface TemplateConflict {
  employeeId: string;
  employeeName: string;
  reason: string;
}

export interface ApplyTemplateResult {
  success: boolean;
  assignments?: any[];
  conflicts: TemplateConflict[];
  warnings: string[];
}

/**
 * Apply template to a target week
 * Maps dates from template to target week while preserving day-of-week
 */
export function applyTemplateToWeek(
  template: ScheduleTemplate,
  targetWeekStart: Date,
  currentAssignments?: any[]
): ApplyTemplateResult {
  const conflicts: TemplateConflict[] = [];
  const warnings: string[] = [];

  try {
    // Parse template assignments
    const templateAssignments = JSON.parse(template.assignments);

    if (!templateAssignments || templateAssignments.length === 0) {
      return {
        success: false,
        conflicts: [{ employeeId: '', employeeName: 'Template', reason: 'No assignments in template' }],
        warnings: [],
      };
    }

    // Get template week info
    const firstTemplateDate = new Date(templateAssignments[0].date);
    const templateWeekStart = getWeekStartDate(firstTemplateDate);

    // Map template dates to target week
    const mappedAssignments = templateAssignments.map((assignment: any) => {
      const templateDate = new Date(assignment.date);
      const dayOffset = getDayOffset(templateDate, templateWeekStart);
      const targetDate = new Date(targetWeekStart);
      targetDate.setDate(targetDate.getDate() + dayOffset);

      return {
        ...assignment,
        date: formatDate(targetDate),
      };
    });

    // Check for conflicts with existing assignments
    if (currentAssignments) {
      for (const newAssignment of mappedAssignments) {
        const existingConflict = currentAssignments.find(
          (existing: any) =>
            existing.employeeId === newAssignment.employeeId
              && existing.date === newAssignment.date
              && existing.type === newAssignment.type
        );

        if (existingConflict) {
          conflicts.push({
            employeeId: newAssignment.employeeId,
            employeeName: newAssignment.employeeName,
            reason: `Already scheduled for ${newAssignment.type} on ${newAssignment.date}`,
          });
        }
      }
    }

    return {
      success: conflicts.length === 0,
      assignments: mappedAssignments,
      conflicts,
      warnings,
    };
  } catch (err) {
    return {
      success: false,
      conflicts: [
        {
          employeeId: '',
          employeeName: 'Template',
          reason: err instanceof Error ? err.message : 'Failed to apply template',
        },
      ],
      warnings: [],
    };
  }
}

/**
 * Get week start date (Monday)
 */
function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * Get day offset from week start
 */
function getDayOffset(date: Date, weekStart: Date): number {
  const timeDiff = date.getTime() - weekStart.getTime();
  return Math.round(timeDiff / (1000 * 60 * 60 * 24));
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Merge template assignments with existing schedule
 */
export function mergeTemplateWithSchedule(
  existing: any[],
  templateAssignments: any[],
  mergeMode: 'replace' | 'merge'
): any[] {
  if (mergeMode === 'replace') {
    return templateAssignments;
  }

  // Merge mode: combine, avoiding duplicates
  const merged = [...existing];

  for (const templateAssignment of templateAssignments) {
    const isDuplicate = merged.some(
      e =>
        e.employeeId === templateAssignment.employeeId
          && e.date === templateAssignment.date
          && e.type === templateAssignment.type
    );

    if (!isDuplicate) {
      merged.push(templateAssignment);
    }
  }

  return merged;
}

/**
 * Check if template is compatible with target week
 */
export function isTemplateCompatible(
  template: ScheduleTemplate,
  targetWeekStart: Date,
  existingAssignments?: any[]
): boolean {
  const result = applyTemplateToWeek(template, targetWeekStart, existingAssignments);
  return result.success && result.conflicts.length === 0;
}

/**
 * Get template preview for target week
 */
export function getTemplatePreview(
  template: ScheduleTemplate,
  targetWeekStart: Date
): string[] {
  try {
    const assignments = JSON.parse(template.assignments);
    const preview: string[] = [];

    for (const assignment of assignments.slice(0, 5)) {
      preview.push(
        `${assignment.employeeName}: ${assignment.type} (${assignment.startTime}-${assignment.endTime})`
      );
    }

    if (assignments.length > 5) {
      preview.push(`... and ${assignments.length - 5} more shifts`);
    }

    return preview;
  } catch {
    return ['Could not preview template'];
  }
}
