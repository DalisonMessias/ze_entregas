export const formatMinutes = (value?: number | string | null): string => {
    if (value === undefined || value === null || value === '') return '';
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    if (!num || Number.isNaN(num) || num <= 0) return '';

    const hours = Math.floor(num / 60);
    const minutes = num % 60;

    if (hours <= 0) return `${num} min`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}min`;
};

export const formatMinuteRange = (
    min?: number | string | null,
    max?: number | string | null
): string => {
    const minNum = typeof min === 'string' ? parseInt(min, 10) : min ?? 0;
    const maxNum = typeof max === 'string' ? parseInt(max, 10) : max ?? 0;

    if ((!minNum || Number.isNaN(minNum)) && (!maxNum || Number.isNaN(maxNum))) return '';

    if (minNum > 0 && maxNum > 0) {
        return `${formatMinutes(minNum)} - ${formatMinutes(maxNum)}`;
    }

    return formatMinutes(minNum > 0 ? minNum : maxNum);
};
