/**
 * CSV Export Functionality
 * Export analytics data to CSV format
 */

import type { WeeklyAnalytics } from '@/lib/instantdb';

/**
 * Export analytics to CSV format
 */
export function exportAnalyticsToCSV(
  analytics: WeeklyAnalytics[],
  dateRange?: { start: Date; end: Date }
): string {
  // CSV Headers
  const headers = [
    'Week Key',
    'Total Shifts',
    'Total Hours',
    'Bartender Coverage',
    'Date Created',
  ];

  // CSV Rows
  const rows = analytics.map(a => [
    a.weekKey,
    a.totalShifts,
    a.totalHours.toFixed(1),
    `${(a.bartenderCoverageRate * 100).toFixed(0)}%`,
    new Date(a.createdAt).toLocaleDateString(),
  ]);

  // Combine
  const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');

  return csvContent;
}

/**
 * Export employee utilization to CSV
 */
export function exportEmployeeUtilizationToCSV(
  analytics: WeeklyAnalytics[]
): string {
  // Collect all employees and their hours
  const employeeData: Record<
    string,
    { hours: number; shifts: number; weeks: number }
  > = {};

  for (const week of analytics) {
    const utilization = JSON.parse(week.employeeUtilization);
    for (const [empId, hours] of Object.entries(utilization)) {
      if (!employeeData[empId]) {
        employeeData[empId] = { hours: 0, shifts: 0, weeks: 0 };
      }
      employeeData[empId].hours += hours as number;
      employeeData[empId].weeks += 1;
    }
  }

  // CSV Headers
  const headers = ['Employee ID', 'Total Hours', 'Average Hours/Week', 'Weeks Worked'];

  // CSV Rows
  const rows = Object.entries(employeeData).map(([empId, data]) => [
    empId,
    data.hours.toFixed(1),
    (data.hours / Math.max(1, data.weeks)).toFixed(1),
    data.weeks,
  ]);

  // Sort by hours descending
  rows.sort((a, b) => parseFloat(String(b[1])) - parseFloat(String(a[1])));

  // Combine
  const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');

  return csvContent;
}

/**
 * Export shift distribution to CSV
 */
export function exportShiftDistributionToCSV(
  analytics: WeeklyAnalytics[]
): string {
  // CSV Headers
  const headers = ['Week Key', 'Morning', 'Mid', 'Night', 'Total'];

  // CSV Rows
  const rows = analytics.map(a => {
    const distribution = JSON.parse(a.shiftTypeDistribution);
    const total =
      distribution.morning + distribution.mid + distribution.night;
    return [
      a.weekKey,
      distribution.morning,
      distribution.mid,
      distribution.night,
      total,
    ];
  });

  // Combine
  const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');

  return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const element = document.createElement('a');
  element.setAttribute(
    'href',
    'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent)
  );
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

/**
 * Generate filename with date range
 */
export function generateCSVFilename(
  type: 'analytics' | 'utilization' | 'distribution',
  startDate?: Date,
  endDate?: Date
): string {
  const date = new Date().toISOString().split('T')[0];
  const range =
    startDate && endDate
      ? `_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}`
      : '';

  return `${type}${range}_${date}.csv`;
}

/**
 * Copy CSV to clipboard
 */
export function copyCSVToClipboard(csvContent: string): Promise<void> {
  return navigator.clipboard.writeText(csvContent);
}
