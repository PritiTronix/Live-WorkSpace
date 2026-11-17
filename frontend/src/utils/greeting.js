/**
 * Shared Greeting & Date Utilities
 * Real-time, per-user greeting and dynamic date/range formatting.
 *
 * Rules:
 * - Good morning: 05:00 - 11:59
 * - Good afternoon: 12:00 - 16:59
 * - Good evening: 17:00 - 20:59
 * - Hello: otherwise (21:00 - 04:59)
 * - Greeting includes user's first name if present, otherwise just the greeting.
 * - Timezone from user's saved preferences if present, otherwise browser's timezone.
 * - Date formatted via Intl.DateTimeFormat in user's locale.
 * - UI timer ticks once per minute and cleans up on unmount.
 */
import { useState, useEffect } from 'react';

/**
 * Returns the base time greeting according to hour in specified timezone or local time.
 * @param {Date} [date]
 * @param {string} [timeZone]
 * @returns {string} 'Good morning' | 'Good afternoon' | 'Good evening' | 'Hello'
 */
export function getTimeGreeting(date = new Date(), timeZone) {
  let hour;
  if (timeZone) {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone,
      });
      const parts = formatter.format(date);
      hour = parseInt(parts, 10) % 24;
    } catch {
      hour = date.getHours();
    }
  } else {
    hour = date.getHours();
  }

  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  }
  if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  }
  if (hour >= 17 && hour < 21) {
    return 'Good evening';
  }
  return 'Hello';
}

/**
 * Returns time-appropriate greeting with first name of user if available.
 * @param {Object|null|undefined} user
 * @param {Date} [date]
 * @param {string} [timeZone]
 * @returns {string}
 */
export function getGreeting(user, date = new Date(), timeZone) {
  const effectiveTz = timeZone || user?.timezone || user?.preferences?.timezone || undefined;
  const timeGreeting = getTimeGreeting(date, effectiveTz);

  const rawName = user?.full_name?.trim();
  if (!rawName) {
    return timeGreeting;
  }

  const firstName = rawName.split(/\s+/)[0];
  return firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;
}

/**
 * Formats current date at render time with Intl.DateTimeFormat.
 * @param {string} [locale] - Optional BCP 47 language tag
 * @param {string} [timeZone] - Optional IANA timezone identifier
 * @param {Date} [date] - Optional Date instance
 * @returns {string} e.g. "Monday, Nov 16, 2026"
 */
export function formatCurrentDate(locale, timeZone, date = new Date()) {
  const options = {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  if (timeZone) {
    options.timeZone = timeZone;
  }
  return new Intl.DateTimeFormat(locale || undefined, options).format(date);
}

/**
 * Generates dynamic date-range options computed from reference date.
 * Never hardcoded quarter or year names.
 * @param {Date} [referenceDate]
 */
export function getDynamicDateRangeOptions(referenceDate = new Date()) {
  const quarter = Math.floor(referenceDate.getMonth() / 3) + 1;
  const year = referenceDate.getFullYear();

  return [
    { id: 'today', label: 'Today' },
    { id: 'this_week', label: 'This Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'this_quarter', label: `Q${quarter} ${year}` },
  ];
}

/**
 * React hook: updates greeting and formatted date automatically every minute.
 * Updates state only when the formatted values change. Cleans up on unmount.
 * @param {Object|null|undefined} user
 * @param {string} [locale]
 * @returns {{ greeting: string, formattedDate: string, currentTime: Date }}
 */
export function useClock(user, locale) {
  const timeZone = user?.timezone || user?.preferences?.timezone || undefined;

  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [greeting, setGreeting] = useState(() => getGreeting(user, new Date(), timeZone));
  const [formattedDate, setFormattedDate] = useState(() => formatCurrentDate(locale, timeZone, new Date()));

  useEffect(() => {
    // Immediate sync on user/timeZone change
    const now = new Date();
    setGreeting(getGreeting(user, now, timeZone));
    setFormattedDate(formatCurrentDate(locale, timeZone, now));
    setCurrentTime(now);

    const interval = setInterval(() => {
      const nextTime = new Date();
      const nextGreeting = getGreeting(user, nextTime, timeZone);
      const nextDate = formatCurrentDate(locale, timeZone, nextTime);

      setGreeting((prev) => (prev !== nextGreeting ? nextGreeting : prev));
      setFormattedDate((prev) => (prev !== nextDate ? nextDate : prev));
      setCurrentTime(nextTime);
    }, 60000);

    return () => clearInterval(interval);
  }, [user?.full_name, timeZone, locale]);

  return { greeting, formattedDate, currentTime };
}
