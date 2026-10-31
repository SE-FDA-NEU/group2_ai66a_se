import { describe, it, expect } from 'vitest';
import { parseVndInput, formatVnd, convertToVnd, convertFromVnd } from '../utils/currency';

describe('VND Currency Utilities', () => {
  describe('parseVndInput', () => {
    it('correctly parses Vietnamese dot-formatted thousands like 160.000 to 160000', () => {
      expect(parseVndInput('160.000')).toBe(160000);
      expect(parseVndInput('1.500.000')).toBe(1500000);
    });

    it('correctly parses plain digits like 160000 to 160000', () => {
      expect(parseVndInput('160000')).toBe(160000);
      expect(parseVndInput(160000)).toBe(160000);
    });

    it('correctly parses comma-separated thousands like 160,000 to 160000', () => {
      expect(parseVndInput('160,000')).toBe(160000);
    });

    it('handles currency symbol and whitespace like "160.000 ₫"', () => {
      expect(parseVndInput('160.000 ₫')).toBe(160000);
      expect(parseVndInput('  160.000đ  ')).toBe(160000);
    });

    it('returns null for empty, zero, or invalid strings', () => {
      expect(parseVndInput('')).toBeNull();
      expect(parseVndInput('   ')).toBeNull();
      expect(parseVndInput('0')).toBeNull();
      expect(parseVndInput('-1000')).toBeNull();
      expect(parseVndInput(null)).toBeNull();
    });
  });

  describe('formatVnd', () => {
    it('formats numbers into standard Vietnamese currency string (e.g. 160.000 ₫)', () => {
      const formatted = formatVnd(160000);
      // Replace non-breaking spaces if any
      const normalized = formatted.replace(/\u00a0/g, ' ');
      expect(normalized).toBe('160.000 ₫');
    });

    it('handles zero and null gracefully', () => {
      expect(formatVnd(0).replace(/\u00a0/g, ' ')).toBe('0 ₫');
      expect(formatVnd(null).replace(/\u00a0/g, ' ')).toBe('0 ₫');
    });
  });

  describe('pass-through compatibility', () => {
    it('preserves VND amounts without conversion drift', () => {
      expect(convertToVnd(160000, 'VND')).toBe(160000);
      expect(convertFromVnd(160000, 'VND')).toBe(160000);
    });
  });
});

