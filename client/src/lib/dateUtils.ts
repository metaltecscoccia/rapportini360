/**
 * Utility functions for date formatting and conversion
 * Italian format: DD/MM/YYYY
 * Database format: YYYY-MM-DD
 */

/**
 * Convert date from YYYY-MM-DD to DD/MM/YYYY format
 */
export function formatDateToItalian(dateStr: string): string {
  if (!dateStr) return '';
  
  // Handle both Date objects and strings
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  
  // Validate date
  if (isNaN(date.getTime())) return dateStr;
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Convert date from DD/MM/YYYY to YYYY-MM-DD format
 */
export function formatDateToISO(dateStr: string): string {
  if (!dateStr) return '';
  
  // If already in ISO format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Parse DD/MM/YYYY format
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Get today's date in DD/MM/YYYY format
 */
export function getTodayItalian(): string {
  const today = new Date();
  return formatDateToItalian(today.toISOString().split('T')[0]);
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
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
  
  // Check actual date validity
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
