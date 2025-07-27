export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function startOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1);
  result.setDate(0);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function parseAPIDate(dateString: string): Date {
  return new Date(dateString + 'T00:00:00.000Z');
}

export function isOverdue(dateString: string | null): boolean {
  if (!dateString) return false;
  return new Date(dateString) < startOfDay(new Date());
}

export function daysUntil(dateString: string): number {
  const target = new Date(dateString);
  const today = startOfDay(new Date());
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getDateRange(period: 'today' | 'week' | 'month' | 'year'): { start: Date; end: Date } {
  const now = new Date();
  
  switch (period) {
    case 'today':
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      };
    
    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      return {
        start: startOfDay(weekStart),
        end: endOfDay(now)
      };
    
    case 'month':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
    
    case 'year':
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31);
      return {
        start: startOfDay(yearStart),
        end: endOfDay(yearEnd)
      };
  }
}