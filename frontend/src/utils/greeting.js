/**
 * Shared Greeting & Date Utilities
 * Follows universal project rules:
 * - Greeting: 'Good Morning' (05:00-11:59), 'Good Afternoon' (12:00-16:59),
 *   or 'Good Evening' (17:00-04:59) plus FIRST NAME of logged-in user.
 *   If user has no name, returns greeting without a name. Never a placeholder name.
 * - Date: formatted at render time with Intl.DateTimeFormat in the user's locale and timezone.
 */

/**
 * Returns time-appropriate greeting with first name of user if available.
 * @param {Object|null|undefined} user
 * @returns {string}
 */
export function getGreeting(user) {
  const hour = new Date().getHours();
  let timeGreeting = 'Good Evening';

  if (hour >= 5 && hour < 12) {
    timeGreeting = 'Good Morning';
  } else if (hour >= 12 && hour < 17) {
    timeGreeting = 'Good Afternoon';
  }

  const rawName = user?.full_name?.trim();
  if (!rawName) {
    return timeGreeting;
  }

  // Extract first name only
  const firstName = rawName.split(/\s+/)[0];
  return firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;
}

/**
 * Formats current date at render time with Intl.DateTimeFormat.
 * @param {string} [locale] - Optional BCP 47 language tag
 * @param {string} [timeZone] - Optional IANA timezone identifier
 * @returns {string}
 */
export function formatCurrentDate(locale, timeZone) {
  const options = {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  if (timeZone) {
    options.timeZone = timeZone;
  }
  return new Intl.DateTimeFormat(locale || undefined, options).format(new Date());
}

/**
 * Generates dynamic date-range options computed from current date.
 * Never fixed quarter or year names.
 */
export function getDynamicDateRangeOptions() {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const year = now.getFullYear();

  return [
    { id: 'today', label: 'Today' },
    { id: 'this_week', label: 'This Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'this_quarter', label: `Q${quarter} ${year}` },
  ];
}
