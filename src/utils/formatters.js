/**
 * Formatting utilities for numbers, currencies, and statuses.
 */

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export function formatPercent(value) {
  return `${Math.round(value || 0)}%`;
}

export function formatHours(hours) {
  return `${Math.round(hours || 0)}h`;
}
