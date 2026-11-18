/**
 * Shared pluralization helper.
 * Returns formatted string with proper singular/plural suffix.
 * Example:
 *   pluralize(1, 'member') => '1 member'
 *   pluralize(2, 'member') => '2 members'
 *   pluralize(1, 'squad', 'teams') => '1 squad'
 */
export const pluralize = (count, singular, plural = null) => {
  const num = typeof count === 'number' ? count : parseInt(count, 10) || 0;
  const pluralForm = plural || `${singular}s`;
  return `${num} ${num === 1 ? singular : pluralForm}`;
};

export default pluralize;
