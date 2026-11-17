/**
 * Unit tests for greeting.js
 * Covers each time band:
 *   - 05:00 - 11:59 -> Good morning
 *   - 12:00 - 16:59 -> Good afternoon
 *   - 17:00 - 20:59 -> Good evening
 *   - 21:00 - 04:59 -> Hello
 * Also covers:
 *   - User profile with first name, full name, or missing name
 *   - Timezone edge cases (Tokyo vs New York vs London UTC)
 *   - Intl.DateTimeFormat dynamic formatting
 *   - Dynamic date range generation
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { getTimeGreeting, getGreeting, formatCurrentDate, getDynamicDateRangeOptions } from './greeting.js';

test('Time Band: 05:00 - 11:59 (Good morning)', () => {
  // 05:00 UTC
  const d1 = new Date('2026-11-16T05:00:00Z');
  assert.equal(getTimeGreeting(d1, 'UTC'), 'Good morning');

  // 11:59 UTC
  const d2 = new Date('2026-11-16T11:59:59Z');
  assert.equal(getTimeGreeting(d2, 'UTC'), 'Good morning');
});

test('Time Band: 12:00 - 16:59 (Good afternoon)', () => {
  // 12:00 UTC
  const d1 = new Date('2026-11-16T12:00:00Z');
  assert.equal(getTimeGreeting(d1, 'UTC'), 'Good afternoon');

  // 16:59 UTC
  const d2 = new Date('2026-11-16T16:59:59Z');
  assert.equal(getTimeGreeting(d2, 'UTC'), 'Good afternoon');
});

test('Time Band: 17:00 - 20:59 (Good evening)', () => {
  // 17:00 UTC
  const d1 = new Date('2026-11-16T17:00:00Z');
  assert.equal(getTimeGreeting(d1, 'UTC'), 'Good evening');

  // 20:59 UTC
  const d2 = new Date('2026-11-16T20:59:59Z');
  assert.equal(getTimeGreeting(d2, 'UTC'), 'Good evening');
});

test('Time Band: 21:00 - 04:59 (Hello)', () => {
  // 21:00 UTC
  const d1 = new Date('2026-11-16T21:00:00Z');
  assert.equal(getTimeGreeting(d1, 'UTC'), 'Hello');

  // 23:59 UTC
  const d2 = new Date('2026-11-16T23:59:59Z');
  assert.equal(getTimeGreeting(d2, 'UTC'), 'Hello');

  // 00:00 UTC
  const d3 = new Date('2026-11-16T00:00:00Z');
  assert.equal(getTimeGreeting(d3, 'UTC'), 'Hello');

  // 04:59 UTC
  const d4 = new Date('2026-11-16T04:59:59Z');
  assert.equal(getTimeGreeting(d4, 'UTC'), 'Hello');
});

test('Greeting user first name resolution', () => {
  const morningDate = new Date('2026-11-16T09:00:00Z');

  // Full name with first and last
  assert.equal(
    getGreeting({ full_name: 'Bhavesh Burad' }, morningDate, 'UTC'),
    'Good morning, Bhavesh'
  );

  // Single word name
  assert.equal(
    getGreeting({ full_name: 'Alex' }, morningDate, 'UTC'),
    'Good morning, Alex'
  );

  // Whitespace padded
  assert.equal(
    getGreeting({ full_name: '  Sarah   Connor ' }, morningDate, 'UTC'),
    'Good morning, Sarah'
  );

  // Missing / empty name -> returns just greeting without name or placeholder
  assert.equal(getGreeting(null, morningDate, 'UTC'), 'Good morning');
  assert.equal(getGreeting({}, morningDate, 'UTC'), 'Good morning');
  assert.equal(getGreeting({ full_name: '' }, morningDate, 'UTC'), 'Good morning');
  assert.equal(getGreeting({ full_name: '   ' }, morningDate, 'UTC'), 'Good morning');
});

test('Timezone edge cases across international dates & times', () => {
  // Fixed timestamp: 2026-11-16T14:30:00Z (2:30 PM UTC)
  const utcDate = new Date('2026-11-16T14:30:00Z');

  // In New York (UTC-5), it is 09:30 AM -> Good morning
  assert.equal(getTimeGreeting(utcDate, 'America/New_York'), 'Good morning');

  // In London (UTC+0), it is 14:30 (2:30 PM) -> Good afternoon
  assert.equal(getTimeGreeting(utcDate, 'Europe/London'), 'Good afternoon');

  // In India (UTC+5:30), it is 20:00 (8:00 PM) -> Good evening
  assert.equal(getTimeGreeting(utcDate, 'Asia/Kolkata'), 'Good evening');

  // In Tokyo (UTC+9), it is 23:30 (11:30 PM) -> Hello
  assert.equal(getTimeGreeting(utcDate, 'Asia/Tokyo'), 'Hello');
});

test('User saved preferences timezone precedence', () => {
  const fixedDate = new Date('2026-11-16T14:30:00Z');
  const userWithPref = {
    full_name: 'Elena Rostova',
    preferences: { timezone: 'America/New_York' },
  };

  // Should use user's preferences timezone (09:30 -> morning)
  assert.equal(getGreeting(userWithPref, fixedDate), 'Good morning, Elena');
});

test('formatCurrentDate format and timezone', () => {
  const fixedDate = new Date('2026-11-16T12:00:00Z');
  const formatted = formatCurrentDate('en-US', 'UTC', fixedDate);
  // e.g. "Monday, Nov 16, 2026"
  assert.equal(formatted, 'Monday, Nov 16, 2026');
});

test('getDynamicDateRangeOptions dynamic calculation', () => {
  const q4Date = new Date('2026-11-16T12:00:00Z');
  const options = getDynamicDateRangeOptions(q4Date);
  assert.equal(options.length, 4);
  assert.equal(options[0].label, 'Today');
  assert.equal(options[3].label, 'Q4 2026');

  const q1Date = new Date('2027-02-10T12:00:00Z');
  const q1Options = getDynamicDateRangeOptions(q1Date);
  assert.equal(q1Options[3].label, 'Q1 2027');
});
