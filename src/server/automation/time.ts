import type { Schedule, NotificationPreference } from "@/contracts/coordinator";
const formatters = new Map<string, Intl.DateTimeFormat>();
export function localParts(instant: string | Date, timezone: string) {
    let formatter = formatters.get(timezone);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
        formatters.set(timezone, formatter);
    }
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(p => [p.type, p.value]));
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    return { date, time: `${parts.hour}:${parts.minute}`, weekday: new Date(date + "T12:00:00Z").getUTCDay() || 7 };
}
export function addDays(date: string, amount: number) { return new Date(Date.parse(date + "T12:00:00Z") + amount * 86400000).toISOString().slice(0, 10); }
// Handles gaps by advancing to the first existing minute; overlaps select the first instant.
export function localInstant(date: string, time: string, timezone: string): string {
    const target = Date.parse(`${date}T${time}:00Z`);
    let guess = target;
    for (let n = 0; n < 4; n++) {
        const p = localParts(new Date(guess), timezone);
        const delta = target - Date.parse(`${p.date}T${p.time}:00Z`);
        if (!delta)
            break;
        guess += delta;
    }
    const matches: number[] = [];
    // Wide enough for fractional offsets and modern DST gaps, bounded to one local conversion.
    for (let offset = -180; offset <= 180; offset++) {
        const candidate = guess + offset * 60000, p = localParts(new Date(candidate), timezone);
        if (p.date === date && p.time === time)
            matches.push(candidate);
    }
    if (matches.length)
        return new Date(Math.min(...matches)).toISOString();
    for (let offset = -180; offset <= 180; offset++) {
        const candidate = guess + offset * 60000, p = localParts(new Date(candidate), timezone);
        if (p.date === date && p.time > time)
            return new Date(candidate).toISOString();
    }
    throw new Error("LOCAL_TIME_UNAVAILABLE");
}
export type Occurrence = {
    key: string;
    slot: "morning" | "eod" | "repeat" | "weekly";
    workDate: string;
    scheduledFor: string;
    expiresAt: string;
};
export function occurrences(settings: Schedule, projectId: string, after: string, until: string): Occurrence[] {
    const first = localParts(after, settings.timezone).date, last = localParts(until, settings.timezone).date;
    const result: Occurrence[] = [];
    for (let day = first, count = 0; day <= last && count < 8; day = addDays(day, 1), count++) {
        const weekday = new Date(day + "T12:00:00Z").getUTCDay() || 7;
        const working = settings.workdays.includes(weekday) && !settings.holidays.includes(day);
        const slots: [
            Occurrence["slot"],
            string
        ][] = working ? [["morning", settings.morningTime], ["eod", settings.eodTime], ...(settings.repeatTime ? [["repeat", settings.repeatTime] as [
                    "repeat",
                    string
                ]] : [])] : [];
        if (weekday === (settings.weeklyMode === "friday" ? 5 : 1))
            slots.push(["weekly", settings.weeklyTime]);
        for (const [slot, time] of slots) {
            const scheduledFor = localInstant(day, time, settings.timezone);
            if (scheduledFor <= after || scheduledFor > until)
                continue;
            result.push({ key: `${projectId}:${day}:${slot}:${slot === "weekly" ? settings.weeklyMode : "daily"}`, slot, workDate: day, scheduledFor,
                expiresAt: new Date(Date.parse(scheduledFor) + (slot === "weekly" ? 86400000 : 3600000)).toISOString() });
        }
    }
    return result.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
}
export function weekStart(date: string, timezone: string) {
    const weekday = new Date(date + "T12:00:00Z").getUTCDay() || 7;
    return localInstant(addDays(date, 1 - weekday), "00:00", timezone);
}
export function quietUntil(now: string, preferences: NotificationPreference): string {
    const p = localParts(now, preferences.timezone), { quietStart: start, quietEnd: end } = preferences;
    if (start === end)
        return now;
    const quiet = start < end ? p.time >= start && p.time < end : p.time >= start || p.time < end;
    return quiet ? localInstant(start > end && p.time >= start ? addDays(p.date, 1) : p.date, end, preferences.timezone) : now;
}
