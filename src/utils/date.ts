export const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDateKey = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const addDays = (date: Date, amount: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};

export const formatDateHuman = (
  value: string,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  },
): string => {
  return parseDateKey(value).toLocaleDateString('ru-RU', options);
};

export const formatWeekday = (value: string): string => {
  return parseDateKey(value).toLocaleDateString('ru-RU', { weekday: 'long' });
};

export const compareTime = (a: string, b: string): number => {
  return a.localeCompare(b, undefined, { numeric: true });
};

export const minutesBetween = (start: string, end: string): number => {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  return (endH - startH) * 60 + (endM - startM);
};

export const addMinutesToTime = (time: string, minutes: number): string => {
  const [hours, mins] = time.split(':').map(Number);
  const total = hours * 60 + mins + minutes;
  const totalHours = Math.floor(total / 60);
  const totalMinutes = total % 60;
  return `${String(totalHours).padStart(2, '0')}:${String(totalMinutes).padStart(2, '0')}`;
};

