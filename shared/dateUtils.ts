/**
 * Shared date utility functions for both client and server
 * Italian format: DD/MM/YYYY
 * Database format: YYYY-MM-DD
 */

/**
 * Convert date from YYYY-MM-DD to DD/MM/YYYY format
 * Parses manually to avoid timezone issues
 */
export function formatDateToItalian(dateStr: string): string {
  if (!dateStr) return '';
  
  // If already in DD/MM/YYYY format, return as is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Parse YYYY-MM-DD format manually to avoid timezone issues
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }
  
  // Fallback: return original string
  return dateStr;
}

/**
 * Convert date from YYYY-MM-DD to Italian long format
 * Example: "2025-10-08" -> "martedì 08 ottobre 2025"
 */
export function formatDateToItalianLong(dateStr: string): string {
  if (!dateStr) return '';
  
  // Parse YYYY-MM-DD format manually to avoid timezone issues
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!isoMatch) return dateStr;
  
  const [, yearStr, monthStr, dayStr] = isoMatch;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  
  // Italian day names
  const dayNames = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  
  // Italian month names
  const monthNames = [
    'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
  ];
  
  // Calculate day of week (Zeller's congruence)
  let m = month;
  let y = year;
  if (m < 3) {
    m += 12;
    y -= 1;
  }
  const q = day;
  const K = y % 100;
  const J = Math.floor(y / 100);
  const h = (q + Math.floor((13 * (m + 1)) / 5) + K + Math.floor(K / 4) + Math.floor(J / 4) - 2 * J) % 7;
  
  // Convert Zeller's result to day of week (0 = Saturday in Zeller's)
  const dayOfWeek = ((h + 5) % 7 + 1) % 7; // Convert to 0 = Sunday
  
  const dayName = dayNames[dayOfWeek];
  const monthName = monthNames[month - 1];
  
  return `${dayName} ${String(day).padStart(2, '0')} ${monthName} ${year}`;
}

/**
 * Convert date from DD/MM/YYYY to YYYY-MM-DD format
 * Validates input before conversion
 */
export function formatDateToISO(dateStr: string): string {
  if (!dateStr) return '';
  
  // If already in ISO format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Parse DD/MM/YYYY format
  const parts = dateStr.split('/');
  if (parts.length !== 3) return '';
  
  const [day, month, year] = parts;
  
  // Basic validation
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  
  if (isNaN(d) || isNaN(m) || isNaN(y)) return '';
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900) return '';
  
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Get today's date in DD/MM/YYYY format (local timezone)
 */
export function getTodayItalian(): string {
  return formatDateToItalian(getTodayISO());
}

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 */
export function getTodayISO(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validate DD/MM/YYYY format
 */
export function isValidItalianDate(dateStr: string): boolean {
  if (!dateStr) return false;
  
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateStr.match(regex);
  
  if (!match) return false;
  
  const [, day, month, year] = match;
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  if (y < 1900 || y > 2100) return false;
  
  // Check actual date validity (this will create a Date object but only for validation)
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
