/**
 * Parse API timestamps stored as UTC (often without a timezone suffix).
 */
export const parseServerDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' && !/[zZ]|[+\-]\d{2}:\d{2}$/.test(value)) {
    return new Date(`${value}Z`);
  }
  return new Date(value);
};

/**
 * Format message time in the user's local timezone.
 */
export const formatMessageTime = (value, options = {}) => {
  const date = parseServerDate(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
};
