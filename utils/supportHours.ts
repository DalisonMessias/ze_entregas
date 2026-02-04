export const checkBusinessHours = (start: string, end: string): boolean => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();

    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    const currentMinutes = hour * 60 + minute;
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const isWeekDay = day >= 1 && day <= 5;
    const isWorkingHours = currentMinutes >= startMinutes && currentMinutes < endMinutes;

    return isWeekDay && isWorkingHours;
};

export const getNextBusinessDayMessage = (startTime: string = '09:00'): string => {
    const now = new Date();
    const nextDate = new Date(now);

    if (now.getDay() === 5 && now.getHours() >= 18) {
        nextDate.setDate(now.getDate() + 3);
    } else if (now.getDay() === 6) {
        nextDate.setDate(now.getDate() + 2);
    } else {
        nextDate.setDate(now.getDate() + 1);
    }

    if (nextDate.getDay() === 0) nextDate.setDate(nextDate.getDate() + 1);

    return `Proximo dia util (${nextDate.toLocaleDateString('pt-BR')}) a partir das ${startTime}h`;
};

