/**
 * T006 + T032: Itinerary JSON schema validation tests
 * Tests: valid sample passes, malformed required fields fail with readable reasons,
 *        semantic rules (date order, unique dayNumber, unique activity order per day)
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

let validateItinerary;

beforeAll(async () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf-8');
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost/' });

  // Wait for scripts to execute
  await new Promise(r => setTimeout(r, 200));
  validateItinerary = dom.window.__validateItinerary;
});

const validFixture = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../fixtures/valid-itinerary.json'), 'utf-8')
);
const invalidFixture = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../fixtures/invalid-itinerary-missing-fields.json'), 'utf-8')
);

describe('Itinerary Validator — Schema Compliance', () => {
  it('passes a valid itinerary fixture', () => {
    const errors = validateItinerary(validFixture);
    expect(errors).toEqual([]);
  });

  it('fails the invalid fixture missing required fields with readable reasons', () => {
    const errors = validateItinerary(invalidFixture);
    expect(errors.length).toBeGreaterThan(0);
    // Should mention missing schemaVersion
    expect(errors.some(e => e.toLowerCase().includes('schemaversion'))).toBe(true);
    // Errors should be readable strings
    errors.forEach(e => expect(typeof e).toBe('string'));
  });

  it('rejects null/undefined input', () => {
    expect(validateItinerary(null).length).toBeGreaterThan(0);
    expect(validateItinerary(undefined).length).toBeGreaterThan(0);
  });

  it('rejects an array instead of an object', () => {
    const errors = validateItinerary([1, 2, 3]);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects wrong schemaVersion', () => {
    const data = { ...validFixture, schemaVersion: '2.0' };
    const errors = validateItinerary(data);
    expect(errors.some(e => e.includes('schemaVersion'))).toBe(true);
  });

  it('rejects empty tripId', () => {
    const data = { ...validFixture, tripId: '' };
    const errors = validateItinerary(data);
    expect(errors.some(e => e.includes('tripId'))).toBe(true);
  });

  it('rejects empty title', () => {
    const data = { ...validFixture, title: '' };
    const errors = validateItinerary(data);
    expect(errors.some(e => e.includes('title'))).toBe(true);
  });

  it('rejects days as non-array', () => {
    const data = { ...validFixture, days: 'not-array' };
    const errors = validateItinerary(data);
    expect(errors.some(e => e.includes('days'))).toBe(true);
  });

  it('rejects empty days array', () => {
    const data = { ...validFixture, days: [] };
    const errors = validateItinerary(data);
    expect(errors.some(e => e.includes('days') && e.includes('at least one'))).toBe(true);
  });

  it('rejects day missing required fields', () => {
    const data = {
      ...validFixture,
      days: [{ dayId: 'x' }] // missing dayNumber, label, activities
    };
    const errors = validateItinerary(data);
    expect(errors.some(e => e.includes('dayNumber'))).toBe(true);
    expect(errors.some(e => e.includes('label'))).toBe(true);
    expect(errors.some(e => e.includes('activities'))).toBe(true);
  });

  it('rejects activity missing required fields', () => {
    const data = {
      ...validFixture,
      days: [{
        dayId: 'd1', dayNumber: 1, label: 'Day 1',
        activities: [{ activityId: 'a1' }] // missing many fields
      }]
    };
    const errors = validateItinerary(data);
    expect(errors.some(e => e.includes('order'))).toBe(true);
    expect(errors.some(e => e.includes('name'))).toBe(true);
    expect(errors.some(e => e.includes('description'))).toBe(true);
  });
});

describe('Itinerary Validator — Semantic Rules (T032)', () => {
  it('rejects dateRange where end is before start', () => {
    const data = {
      ...validFixture,
      dateRange: { start: '2026-04-10', end: '2026-04-01' }
    };
    const errors = validateItinerary(data);
    expect(errors.some(e => e.includes('dateRange.end'))).toBe(true);
  });

  it('rejects duplicate dayNumber values', () => {
    const day1 = { ...validFixture.days[0], dayId: 'dup-1', dayNumber: 1 };
    const day2 = { ...validFixture.days[1], dayId: 'dup-2', dayNumber: 1 };
    const data = { ...validFixture, days: [day1, day2] };
    const errors = validateItinerary(data);
    expect(errors.some(e => e.includes('Duplicate dayNumber'))).toBe(true);
  });

  it('rejects duplicate activity order within same day', () => {
    const activities = [
      { ...validFixture.days[0].activities[0], activityId: 'a1', order: 1 },
      { ...validFixture.days[0].activities[1], activityId: 'a2', order: 1 }
    ];
    const data = {
      ...validFixture,
      days: [{ dayId: 'd1', dayNumber: 1, label: 'Day 1', activities }]
    };
    const errors = validateItinerary(data);
    expect(errors.some(e => e.includes('Duplicate order'))).toBe(true);
  });

  it('accepts valid dateRange where end equals start', () => {
    const data = {
      ...validFixture,
      dateRange: { start: '2026-04-01', end: '2026-04-01' }
    };
    const errors = validateItinerary(data);
    expect(errors).toEqual([]);
  });

  it('rejects duplicate reviewLink sourceNames within an activity', () => {
    const act = {
      ...validFixture.days[0].activities[0],
      reviewLinks: [
        { sourceName: 'TripAdvisor', url: 'https://example.com/1' },
        { sourceName: 'TripAdvisor', url: 'https://example.com/2' }
      ]
    };
    const data = {
      ...validFixture,
      days: [{ dayId: 'd1', dayNumber: 1, label: 'Day 1', activities: [act] }]
    };
    const errors = validateItinerary(data);
    expect(errors.some(e => e.includes('Duplicate sourceName'))).toBe(true);
  });
});
