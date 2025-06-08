/**
 * Formats a date consistently across the application
 * @param {Date|string|number} date - The date to format
 * @returns {string} - Formatted date string in YYYY-MM-DD format
 */
export function formatDateConsistent(date) {
  if (!date) return '';
  
  // Convert to Date object if it's not already
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Get components
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  // Return in YYYY-MM-DD format
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Firestore timestamp to a consistent date string
 * @param {Object} timestamp - Firestore timestamp object
 * @returns {string} - Formatted date string in YYYY-MM-DD format
 */
export function formatFirestoreTimestamp(timestamp) {
  if (!timestamp || !timestamp.seconds) return '';
  return formatDateConsistent(new Date(timestamp.seconds * 1000));
}

/**
 * Converts a date string to a Firestore timestamp
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date} - Date object
 */
export function parseDateString(dateString) {
  if (!dateString) return null;
  return new Date(dateString);
} 