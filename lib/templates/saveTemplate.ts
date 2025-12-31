/**
 * Save Template Utility
 * Creates a new schedule template from current schedule
 */

import { createScheduleTemplate, type ScheduleTemplate } from '@/lib/instantdb';

export interface ScheduleAssignment {
  employeeId: string;
  employeeName: string;
  date: string;
  type: 'morning' | 'mid' | 'night';
  startTime: string;
  endTime: string;
}

export interface SaveTemplateOptions {
  name: string;
  description?: string;
  category: 'seasonal' | 'event' | 'standard' | 'custom';
  assignments: ScheduleAssignment[];
  staffingNeeds?: any;
  weekNotesTemplate?: string;
  userId: string;
}

/**
 * Save current schedule as a reusable template
 */
export async function saveCurrentScheduleAsTemplate(
  options: SaveTemplateOptions
): Promise<string> {
  const assignmentsJson = JSON.stringify(options.assignments);
  const staffingNeedsJson = options.staffingNeeds
    ? JSON.stringify(options.staffingNeeds)
    : undefined;

  const templateId = await createScheduleTemplate({
    name: options.name,
    description: options.description,
    category: options.category,
    assignments: assignmentsJson,
    staffingNeeds: staffingNeedsJson,
    weekNotesTemplate: options.weekNotesTemplate,
    createdBy: options.userId,
  });

  return templateId;
}

/**
 * Duplicate an existing template
 */
export async function duplicateTemplate(
  template: ScheduleTemplate,
  newName: string,
  userId: string
): Promise<string> {
  const templateId = await createScheduleTemplate({
    name: newName,
    description: `Copy of ${template.name}`,
    category: template.category,
    assignments: template.assignments,
    staffingNeeds: template.staffingNeeds,
    weekNotesTemplate: template.weekNotesTemplate,
    createdBy: userId,
  });

  return templateId;
}

/**
 * Get template statistics
 */
export function getTemplateStats(template: ScheduleTemplate): {
  shiftCount: number;
  employeeCount: number;
  categories: string[];
  usagePercentage: number;
} {
  const assignments = JSON.parse(template.assignments) as ScheduleAssignment[];

  const shiftCount = assignments.length;
  const uniqueEmployees = new Set(assignments.map(a => a.employeeId));
  const employeeCount = uniqueEmployees.size;

  const shiftTypes = new Set(assignments.map(a => a.type));
  const categories = Array.from(shiftTypes);

  // Calculate usage (total uses / months available)
  const monthsActive = Math.max(
    1,
    Math.floor((Date.now() - template.createdAt) / (30 * 24 * 60 * 60 * 1000))
  );
  const usagePercentage = Math.min(100, (template.usageCount / monthsActive) * 10);

  return {
    shiftCount,
    employeeCount,
    categories,
    usagePercentage,
  };
}

/**
 * Format template for display
 */
export function formatTemplate(template: ScheduleTemplate): {
  name: string;
  category: string;
  stats: string;
  lastUsed: string;
} {
  const stats = getTemplateStats(template);
  const categoryLabel = template.category.charAt(0).toUpperCase() + template.category.slice(1);
  const statsText = `${stats.shiftCount} shifts • ${stats.employeeCount} staff`;

  const lastUsed = template.lastUsedAt
    ? new Date(template.lastUsedAt).toLocaleDateString()
    : 'Never';

  return {
    name: template.name,
    category: categoryLabel,
    stats: statsText,
    lastUsed,
  };
}
