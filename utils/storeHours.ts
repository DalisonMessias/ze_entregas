type StoreHoursInput = {
    openingHours?: string | null;
    isOpen?: boolean | null;
    isCurrentlyOpen?: boolean | null;
    now?: Date;
};

type StoreHoursState = {
    isManualOpen: boolean;
    isAutoOpen: boolean;
    isOpen: boolean;
};

const normalizeText = (value: string) => {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const normalizeToken = (value: string) => {
    return normalizeText(value).replace(/[.\s]/g, '');
};

const toMinutes = (value: string) => {
    const [rawH, rawM] = value.split(':');
    const h = Number(rawH);
    const m = Number(rawM);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
};

const dayTokenToIndex = (token: string) => {
    const normalized = normalizeToken(token);
    if (!normalized) return null;

    if (normalized.startsWith('dom')) return 0;
    if (normalized.startsWith('seg')) return 1;
    if (normalized.startsWith('ter')) return 2;
    if (normalized.startsWith('qua')) return 3;
    if (normalized.startsWith('qui')) return 4;
    if (normalized.startsWith('sex')) return 5;
    if (normalized.startsWith('sab')) return 6;

    return null;
};

const buildDayRange = (start: number, end: number) => {
    if (start <= end) {
        return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
    }
    return [
        ...Array.from({ length: 7 - start }, (_, idx) => start + idx),
        ...Array.from({ length: end + 1 }, (_, idx) => idx)
    ];
};

const parseDaysPart = (daysPart: string) => {
    const normalized = normalizeText(daysPart);
    if (!normalized) return [];

    if (normalized.includes('todos os dias') || normalized.includes('todososdias')) {
        return [0, 1, 2, 3, 4, 5, 6];
    }

    if (normalized.includes('-')) {
        const [startRaw, endRaw] = normalized.split('-').map(part => part.trim());
        const start = dayTokenToIndex(startRaw);
        const end = dayTokenToIndex(endRaw);
        if (start !== null && end !== null) {
            return buildDayRange(start, end);
        }
    }

    const tokens = normalized.split(',').map(part => part.trim()).filter(Boolean);
    const days = tokens.map(dayTokenToIndex).filter((value): value is number => value !== null);
    return days;
};

const isWithinDayTime = (days: number[], start: string, end: string, now: Date) => {
    if (days.length === 0) return true;

    const startMinutes = toMinutes(start);
    const endMinutes = toMinutes(end);
    if (startMinutes === null || endMinutes === null) return true;

    const currentDay = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const crossesMidnight = endMinutes < startMinutes;

    if (!crossesMidnight) {
        return days.includes(currentDay) && currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }

    if (currentMinutes >= startMinutes) {
        return days.includes(currentDay);
    }

    if (currentMinutes <= endMinutes) {
        const previousDay = (currentDay + 6) % 7;
        return days.includes(previousDay);
    }

    return false;
};

const isWithinLegacyOpeningHours = (openingHours: string, now: Date) => {
    const normalized = normalizeText(openingHours);
    if (!normalized) return true;

    if (normalized.includes('24h')) return true;

    const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const currentDayName = dayNames[now.getDay()];
    const configs = normalized.split(',').map(part => part.trim()).filter(Boolean);
    const todayConfig = configs.find(part => part.startsWith(currentDayName));
    if (!todayConfig) return true;

    const colonIndex = todayConfig.indexOf(':');
    if (colonIndex === -1) return true;

    const timeRange = todayConfig.slice(colonIndex + 1).trim();
    if (!timeRange) return false;
    if (timeRange === 'fechado') return false;
    if (timeRange === '24h') return true;

    const rangeMatch = timeRange.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (!rangeMatch) return true;

    return isWithinDayTime([now.getDay()], rangeMatch[1], rangeMatch[2], now);
};

export const isWithinOpeningHours = (openingHours: string, now: Date = new Date()) => {
    if (!openingHours) return true;

    const normalized = normalizeText(openingHours);
    if (!normalized) return true;

    if (normalized.includes('24h')) return true;

    const match = normalized.match(/^(.*)\s+(\d{2}:\d{2})\s+as\s+(\d{2}:\d{2})$/i);
    if (match) {
        const days = parseDaysPart(match[1]);
        return isWithinDayTime(days, match[2], match[3], now);
    }

    return isWithinLegacyOpeningHours(openingHours, now);
};

export const getStoreOpenState = ({
    openingHours,
    isOpen,
    isCurrentlyOpen,
    now = new Date()
}: StoreHoursInput): StoreHoursState => {
    const manualFlag = isCurrentlyOpen ?? isOpen;
    const isManualOpen = manualFlag !== false;
    const isAutoOpen = openingHours ? isWithinOpeningHours(openingHours, now) : true;
    return {
        isManualOpen,
        isAutoOpen,
        isOpen: isManualOpen && isAutoOpen
    };
};
