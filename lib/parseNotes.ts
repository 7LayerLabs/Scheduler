import { ScheduleOverride, DayOfWeek, Employee } from './types';
import { employees as defaultEmployees } from './employees';

// Parse natural language notes into schedule overrides
export function parseScheduleNotes(notes: string, employeeList?: Employee[]): ScheduleOverride[] {
  const employees = employeeList || defaultEmployees;
  const overrides: ScheduleOverride[] = [];

  // Normalize the text
  const text = notes.toLowerCase();

  // Split by common delimiters
  const sentences = text.split(/[.,;\n]+/).map(s => s.trim()).filter(s => s.length > 0);

  console.log('Parsing notes:', notes);
  console.log('Sentences:', sentences);

  for (const sentence of sentences) {
    console.log('Processing sentence:', sentence);

    // If the sentence references a specific employee, treat it as an employee rule first.
    // This avoids mis-parsing phrases like "Kim closes Saturday" as a business closure.
    const employeeMentioned = findEmployee(sentence, employees);
    if (!employeeMentioned) {
      // First try to parse as a business-wide rule (CLOSED, closing early, etc.)
      const businessRule = parseBusinessRule(sentence);
      console.log('Business rule result:', businessRule);
      if (businessRule) {
        overrides.push(...businessRule);
        continue;
      }
    }

    // Then try employee-specific rules
    const parsed = parseSentence(sentence, employees);
    console.log('Employee rule result:', parsed);
    if (parsed) {
      overrides.push(...parsed);
    }
  }

  console.log('Final overrides:', overrides);
  return overrides;
}

// Parse business-wide rules like "December 24 closing at 2pm" or "December 25 CLOSED"
// Also handles: "Closed Wednesday, December 24 at 2pm", "Closed all day Thursday"
function parseBusinessRule(sentence: string): ScheduleOverride[] | null {
  const lowerSentence = sentence.toLowerCase();

  const overrides: ScheduleOverride[] = [];

  // Determine target days:
  // - Prefer explicit date parsing (e.g., "Dec 24")
  // - Fall back to day-of-week phrases (e.g., "Closed Thursday", "Thursday close at 2")
  const dateInfo = findSpecificDate(sentence);
  console.log('findSpecificDate for:', sentence, '=> result:', dateInfo);
  const days: DayOfWeek[] = dateInfo ? [dateInfo.day] : findDays(sentence);
  if (days.length === 0) return null;

  // Check for fully CLOSED day (various patterns)
  // "closed all day", "closed thursday", "closed all day thursday", etc.
  const isFullyClosed =
    /closed\s+all\s*day/i.test(lowerSentence) ||
    /close\s+all\s*day/i.test(lowerSentence) ||
    lowerSentence.includes('not open') ||
    // "Closed [day]" without a time - check if there's NO time mentioned
    (lowerSentence.includes('closed') && !lowerSentence.match(/at\s+\d|closing at|\d\s*(am|pm)/i));

  if (isFullyClosed) {
    for (const day of days) {
      overrides.push({
        id: `business-closed-${day}-${Date.now()}`,
        type: 'exclude',
        employeeId: '__ALL__', // Special marker for "all employees"
        day,
        shiftType: 'any',
        note: `CLOSED: ${sentence}`,
      });
    }
    return overrides;
  }

  // Check for closing early - multiple patterns:
  // "closing at 2pm", "close at 2", "closed at 2pm", "at 2pm"
  // Pattern: looks for "at X" or "at Xpm" or "X pm" near the date
  const timeMatch = lowerSentence.match(/at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/i) ||
    lowerSentence.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);

  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] || '00';
    const ampm = timeMatch[3]?.toLowerCase();

    // Handle AM/PM
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    // If no am/pm specified, assume PM for 1-6
    if (!ampm && hour >= 1 && hour <= 6) hour += 12;

    const closeTime = `${hour.toString().padStart(2, '0')}:${minutes}`;

    // Create a special override that sets the closing time for these day(s)
    for (const day of days) {
      overrides.push({
        id: `business-early-close-${day}-${Date.now()}`,
        type: 'custom_time',
        employeeId: '__CLOSE_EARLY__', // Special marker
        day,
        shiftType: 'any',
        customEndTime: closeTime,
        note: `Early close at ${closeTime}: ${sentence}`,
      });
    }
    return overrides;
  }

  return null;
}

// Find specific date in sentence (December 24, Dec 24, 12/24, etc.)
function findSpecificDate(sentence: string): { day: DayOfWeek; date: string } | null {
  const lowerSentence = sentence.toLowerCase();

  // Month names and abbreviations
  const months: Record<string, number> = {
    'january': 1, 'jan': 1,
    'february': 2, 'feb': 2,
    'march': 3, 'mar': 3,
    'april': 4, 'apr': 4,
    'may': 5,
    'june': 6, 'jun': 6,
    'july': 7, 'jul': 7,
    'august': 8, 'aug': 8,
    'september': 9, 'sep': 9, 'sept': 9,
    'october': 10, 'oct': 10,
    'november': 11, 'nov': 11,
    'december': 12, 'dec': 12,
  };

  let month: number | null = null;
  let day: number | null = null;

  // Pattern 1: "December 24", "Dec 24", "Dec. 24"
  const monthNamePattern = /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\.?\s*(\d{1,2})/i;
  const monthMatch = lowerSentence.match(monthNamePattern);
  if (monthMatch) {
    month = months[monthMatch[1].toLowerCase()];
    day = parseInt(monthMatch[2]);
  }

  // Pattern 2: "12/24", "12-24"
  if (!month) {
    const slashPattern = /(\d{1,2})[\/\-](\d{1,2})/;
    const slashMatch = sentence.match(slashPattern);
    if (slashMatch) {
      month = parseInt(slashMatch[1]);
      day = parseInt(slashMatch[2]);
    }
  }

  if (!month || !day) return null;

  // Get the year - use current year first, check if date makes sense for scheduling
  const now = new Date();
  let year = now.getFullYear();

  // Create date with current year
  let targetDate = new Date(year, month - 1, day);

  // If the date is more than 60 days in the past, assume next year
  // This allows scheduling for dates in the recent past (like last week)
  // but moves far-past dates to next year
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  if (targetDate < sixtyDaysAgo) {
    year++;
    targetDate = new Date(year, month - 1, day);
  }

  const dayOfWeek = targetDate.getDay();
  const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];

  // Format as YYYY-MM-DD
  const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

  console.log('Date parsed:', { month, day, year, dayOfWeek, dayName, dateStr });

  return { day: dayName, date: dateStr };
}

function parseSentence(sentence: string, employees: Employee[]): ScheduleOverride[] | null {
  const overrides: ScheduleOverride[] = [];

  // Find employee name in sentence
  const employee = findEmployee(sentence, employees);
  if (!employee) return null;

  // Find days mentioned
  // Find days mentioned
  let days = findDays(sentence);

  // If no days mentioned, but we have a valid action/employee, assume it applies to ALL scheduled days
  // This handles global rules like "Kendall can't open" (implies every day)
  if (days.length === 0) {
    const action = determineAction(sentence);
    // Only apply default if it looks like a rule (exclude or assign)
    if (action === 'exclude' || action === 'assign') {
      days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      console.log('No days specified - defaulting to ALL days for rule:', sentence);
    } else {
      return null;
    }
  }

  // Check for custom times first (e.g., "10-1", "10:30-2:30", "10 to 1")
  const times = findTimes(sentence);

  // Determine action type
  const action = determineAction(sentence);

  // Determine shift type (unless we have custom times)
  const shiftType = times ? 'any' : determineShiftType(sentence);

  // Create overrides for each day
  for (const day of days) {
    if (times) {
      // Custom time assignment
      overrides.push({
        id: `parsed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'custom_time',
        employeeId: employee.id,
        day: day,
        shiftType: shiftType,
        customStartTime: times.start,
        customEndTime: times.end,
        note: sentence,
      });
    } else {
      overrides.push({
        id: `parsed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: action,
        employeeId: employee.id,
        day: day,
        shiftType: shiftType,
        note: sentence,
      });
    }
  }

  return overrides.length > 0 ? overrides : null;
}

// Parse time expressions like "10-1", "10:30-2:30", "10 to 1", "from 10 to 1"
function findTimes(sentence: string): { start: string; end: string } | null {
  const lowerSentence = sentence.toLowerCase();

  // Pattern 1: "10-1", "10:30-2:30", "10:00-13:00"
  const dashPattern = /(\d{1,2}):?(\d{2})?\s*[-–—]\s*(\d{1,2}):?(\d{2})?/;
  const dashMatch = lowerSentence.match(dashPattern);
  if (dashMatch) {
    const startHour = parseInt(dashMatch[1]);
    const startMin = dashMatch[2] || '00';
    const endHour = parseInt(dashMatch[3]);
    const endMin = dashMatch[4] || '00';

    return {
      start: normalizeTime(startHour, startMin),
      end: normalizeTime(endHour, endMin),
    };
  }

  // Pattern 2: "10 to 1", "from 10 to 1", "10 till 1", "10 until 2"
  const toPattern = /(?:from\s+)?(\d{1,2}):?(\d{2})?\s*(?:to|till|until|thru|through|-)\s*(\d{1,2}):?(\d{2})?/;
  const toMatch = lowerSentence.match(toPattern);
  if (toMatch) {
    const startHour = parseInt(toMatch[1]);
    const startMin = toMatch[2] || '00';
    const endHour = parseInt(toMatch[3]);
    const endMin = toMatch[4] || '00';

    return {
      start: normalizeTime(startHour, startMin),
      end: normalizeTime(endHour, endMin),
    };
  }

  // Pattern 3: Check for "can only work till X" or "has to leave by X" or "until X"
  const untilPattern = /(?:till|until|by|leave by|has to leave|needs to leave|leave at)\s*(\d{1,2}):?(\d{2})?/;
  const untilMatch = lowerSentence.match(untilPattern);
  if (untilMatch) {
    const endHour = parseInt(untilMatch[1]);
    const endMin = untilMatch[2] || '00';
    // Return with a placeholder start time (scheduler will use day's default start)
    return {
      start: '', // Empty means use default start
      end: normalizeTime(endHour, endMin),
    };
  }

  // Pattern 4: Check for "can't start before X" or "starts at X" or "after X"
  const afterPattern = /(?:can't start before|start(?:s)? at|after|not before|no earlier than)\s*(\d{1,2}):?(\d{2})?/;
  const afterMatch = lowerSentence.match(afterPattern);
  if (afterMatch) {
    const startHour = parseInt(afterMatch[1]);
    const startMin = afterMatch[2] || '00';
    // Return with a placeholder end time (scheduler will use day's default end)
    return {
      start: normalizeTime(startHour, startMin),
      end: '', // Empty means use default end
    };
  }

  return null;
}

// Normalize time to 24-hour format
function normalizeTime(hour: number, minutes: string): string {
  // If hour is 1-6, assume PM (afternoon/evening shift)
  // If hour is 7-12, could be AM or PM - context dependent
  // If hour >= 13, it's already 24-hour format
  let normalizedHour = hour;

  if (hour >= 1 && hour <= 6) {
    // 1-6 is almost always PM in restaurant context
    normalizedHour = hour + 12;
  } else if (hour >= 7 && hour <= 11) {
    // 7-11 is usually AM (morning shift)
    normalizedHour = hour;
  } else if (hour === 12) {
    // 12 is noon (could be end of morning or start of evening)
    normalizedHour = 12;
  }

  return `${normalizedHour.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

function findEmployee(sentence: string, employees: Employee[]): { id: string; name: string } | null {
  const lowerSentence = sentence.toLowerCase();

  // Handle nicknames/variations - maps employee name (lowercase) to all possible name variations
  // Priority order matters: more specific matches come first
  const nicknames: Record<string, string[]> = {
    'kris ann': ['kris ann', 'kris-ann', 'chris-ann', 'chrisann', 'chris ann', 'krisann', 'ka'],
    'kim': ['kimmy', 'kimmie'],
    'ali': ['allie', 'ally'],
    'heidi': ['hei'],
    'haley': ['hales', 'hayl'],
    'eva': ['ev'],
    'christian': ['christian', 'chris t'],
    'lisa': ['lis'],
    'kendall': ['ken', 'kenny', 'kend'],
    'kathy': ['kath', 'kat'],
    'bella s': ['bella s', 'bella-s'],
    'bella q': ['bella q', 'bella-q'],
  };

  // Short/ambiguous names that need word boundary matching
  const ambiguousNames = ['kris', 'chris', 'bella'];

  // First pass: check exact employee names (highest priority)
  for (const emp of employees) {
    const nameLower = emp.name.toLowerCase();
    // Use word boundary for exact name match
    const nameRegex = new RegExp(`\\b${nameLower}\\b`, 'i');
    if (nameRegex.test(lowerSentence)) {
      return { id: emp.id, name: emp.name };
    }
  }

  // Second pass: check specific nicknames (multi-word nicknames first)
  for (const emp of employees) {
    const empNameLower = emp.name.toLowerCase();
    if (nicknames[empNameLower]) {
      // Sort by length descending to match longer/more specific names first
      const sortedNicks = [...nicknames[empNameLower]].sort((a, b) => b.length - a.length);
      for (const nick of sortedNicks) {
        // Skip ambiguous single-word names in this pass
        if (ambiguousNames.includes(nick)) continue;

        if (lowerSentence.includes(nick)) {
          return { id: emp.id, name: emp.name };
        }
      }
    }
  }

  // Third pass: handle ambiguous names (kris, chris, bella) with word boundary
  // Default "chris" or "kris" alone to Kris Ann (most common usage)
  // Default "bella" alone to Bella S (first Bella in the list)
  for (const ambig of ambiguousNames) {
    const regex = new RegExp(`\\b${ambig}\\b`, 'i');
    if (regex.test(lowerSentence)) {
      // Map ambiguous names to default employee
      if (ambig === 'kris' || ambig === 'chris') {
        const emp = employees.find(e => e.id === 'krisann');
        if (emp) return { id: emp.id, name: emp.name };
      }
      if (ambig === 'bella') {
        const emp = employees.find(e => e.id === 'bellas');
        if (emp) return { id: emp.id, name: emp.name };
      }
    }
  }

  return null;
}

function findDays(sentence: string): DayOfWeek[] {
  const days: DayOfWeek[] = [];
  const lowerSentence = sentence.toLowerCase();

  const dayPatterns: { patterns: string[]; day: DayOfWeek }[] = [
    { patterns: ['monday', 'mon'], day: 'monday' },
    { patterns: ['tuesday', 'tues', 'tue'], day: 'tuesday' },
    { patterns: ['wednesday', 'wed'], day: 'wednesday' },
    { patterns: ['thursday', 'thurs', 'thur', 'thu'], day: 'thursday' },
    { patterns: ['friday', 'fri'], day: 'friday' },
    { patterns: ['saturday', 'sat'], day: 'saturday' },
    { patterns: ['sunday', 'sun'], day: 'sunday' },
  ];

  // Check for day ranges like "wed-fri" or "wed thru fri" or "wed through fri"
  const rangePattern = /(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[a-z]*\s*[-–—]|thru|through\s*(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)/i;
  const rangeMatch = sentence.match(rangePattern);

  if (rangeMatch || lowerSentence.includes('thru') || lowerSentence.includes('through') || lowerSentence.includes('-')) {
    // Try to find a range
    const dayOrder: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    let startDay: DayOfWeek | null = null;
    let endDay: DayOfWeek | null = null;

    for (const { patterns, day } of dayPatterns) {
      for (const pattern of patterns) {
        const idx = lowerSentence.indexOf(pattern);
        if (idx !== -1) {
          if (startDay === null) {
            startDay = day;
          } else if (endDay === null && day !== startDay) {
            endDay = day;
          }
        }
      }
    }

    if (startDay && endDay) {
      const startIdx = dayOrder.indexOf(startDay);
      const endIdx = dayOrder.indexOf(endDay);

      if (startIdx <= endIdx) {
        for (let i = startIdx; i <= endIdx; i++) {
          if (dayOrder[i] !== 'monday') { // Skip monday (closed)
            days.push(dayOrder[i]);
          }
        }
        return days;
      }
    }
  }

  // Check for individual days
  for (const { patterns, day } of dayPatterns) {
    for (const pattern of patterns) {
      // Use word boundary matching
      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      if (regex.test(lowerSentence)) {
        if (!days.includes(day) && day !== 'monday') {
          days.push(day);
        }
        break;
      }
    }
  }

  // Check for "weekdays" or "weekends"
  if (lowerSentence.includes('weekday')) {
    days.push('tuesday', 'wednesday', 'thursday', 'friday');
  }
  if (lowerSentence.includes('weekend')) {
    days.push('saturday', 'sunday');
  }

  return days;
}

function determineAction(sentence: string): 'assign' | 'exclude' | 'prioritize' {
  const lowerSentence = sentence.toLowerCase();

  // Check for exclusion keywords
  const excludeKeywords = ['off', 'no ', 'not ', 'can\'t', 'cannot', 'won\'t', 'unavailable', 'exclude', 'skip'];
  for (const keyword of excludeKeywords) {
    if (lowerSentence.includes(keyword)) {
      return 'exclude';
    }
  }

  // Check for strong assignment keywords
  const assignKeywords = ['opens', 'opening', 'must', 'needs to', 'has to', 'will work', 'assign', 'schedule'];
  for (const keyword of assignKeywords) {
    if (lowerSentence.includes(keyword)) {
      return 'assign';
    }
  }

  // Check for preference keywords
  const prioritizeKeywords = ['prefer', 'wants', 'would like', 'try to', 'if possible', 'prioritize'];
  for (const keyword of prioritizeKeywords) {
    if (lowerSentence.includes(keyword)) {
      return 'prioritize';
    }
  }

  // Default to assign for simple statements like "Kim Saturday"
  return 'assign';
}

function determineShiftType(sentence: string): 'morning' | 'mid' | 'night' | 'any' {
  const lowerSentence = sentence.toLowerCase();

  // Morning indicators
  const morningKeywords = ['morning', 'am', 'open', 'opens', 'opening', 'breakfast', 'early'];
  for (const keyword of morningKeywords) {
    if (lowerSentence.includes(keyword)) {
      return 'morning';
    }
  }

  // Mid indicators (lunch, noon, afternoon)
  const midKeywords = ['mid', 'midshift', 'mid shift', 'lunch', 'noon', 'afternoon'];
  for (const keyword of midKeywords) {
    if (lowerSentence.includes(keyword)) {
      return 'mid';
    }
  }

  // Night indicators
  const nightKeywords = ['night', 'pm', 'evening', 'dinner', 'close', 'closing', 'late'];
  for (const keyword of nightKeywords) {
    if (lowerSentence.includes(keyword)) {
      return 'night';
    }
  }

  // Default to any
  return 'any';
}

// Format time for display (24h to 12h)
function formatTimeDisplay(time24: string): string {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'p' : 'a';
  let hour12 = hours % 12;
  if (hour12 === 0) hour12 = 12;
  if (minutes === 0) {
    return `${hour12}${period}`;
  }
  return `${hour12}:${minutes.toString().padStart(2, '0')}${period}`;
}

// Format parsed overrides back to readable text
export function formatParsedOverrides(overrides: ScheduleOverride[], employeeList?: Employee[]): string[] {
  const employees = employeeList || defaultEmployees;
  const formatted: string[] = [];

  for (const override of overrides) {
    const dayLabel = override.day.charAt(0).toUpperCase() + override.day.slice(1);

    // Handle business-wide rules
    if (override.employeeId === '__ALL__') {
      if (override.type === 'exclude') {
        formatted.push(`${dayLabel} CLOSED`);
      }
      continue;
    }

    if (override.employeeId === '__CLOSE_EARLY__') {
      const closeTime = override.customEndTime ? formatTimeDisplay(override.customEndTime) : '';
      formatted.push(`${dayLabel} Close at ${closeTime}`);
      continue;
    }

    // Regular employee rules
    const emp = employees.find(e => e.id === override.employeeId);
    if (!emp) continue;

    const shiftLabel = override.shiftType === 'any' ? '' : ` ${override.shiftType}`;

    switch (override.type) {
      case 'assign':
        formatted.push(`${emp.name} ${dayLabel}${shiftLabel}`);
        break;
      case 'exclude':
        formatted.push(`${emp.name} OFF ${dayLabel}`);
        break;
      case 'prioritize':
        formatted.push(`Prefer ${emp.name} for ${dayLabel}${shiftLabel}`);
        break;
      case 'custom_time':
        const startStr = override.customStartTime ? formatTimeDisplay(override.customStartTime) : 'open';
        const endStr = override.customEndTime ? formatTimeDisplay(override.customEndTime) : 'close';
        formatted.push(`${emp.name} ${dayLabel} ${startStr}-${endStr}`);
        break;
    }
  }

  return formatted;
}
