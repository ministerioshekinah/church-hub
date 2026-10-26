/* A single visit reminder, calculated from the church's regular weekly schedule.
 * RFC 5545: UTC start, escaped TEXT values, CRLF, and UTF-8-aware line folding.
 * No calendar account, subscription, or network request is involved. */
(() => {
  "use strict";
  const timeZone = "America/Los_Angeles";
  const days = [
    ["sunday", "domingo"], ["monday", "lunes"], ["tuesday", "martes"],
    ["wednesday", "miercoles"], ["thursday", "jueves"],
    ["friday", "viernes"], ["saturday", "sabado"]
  ];
  let clock;

  function partsAt(date) {
    clock ||= new Intl.DateTimeFormat("en-US", {
      timeZone, calendar: "gregory", numberingSystem: "latn", hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    return Object.fromEntries(clock.formatToParts(date)
      .filter(part => part.type !== "literal").map(part => [part.type, Number(part.value)]));
  }

  function wallTime(parts) {
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  }

  function dayNumber(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    const normalized = value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return days.findIndex(names => names.includes(normalized));
  }

  function nextService(service, now = new Date()) {
    if (!service || typeof now?.getTime !== "function" || !Number.isFinite(now.getTime())) return null;
    const dayEn = dayNumber(service.day_en), dayEs = dayNumber(service.day_es);
    if (dayEn === -1 || dayEs === -1 || (dayEn === null && dayEs === null)) return null;
    if (dayEn !== null && dayEs !== null && dayEn !== dayEs) return null;
    const weekday = dayEn ?? dayEs;
    const time = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.0+)?)?$/.exec(String(service.service_time || ""));
    if (!time) return null;
    // A special notice can override the weekly schedule. Do not infer a date
    // from free text (for example, a cancellation or a holiday service).
    if ([service.special_message_en, service.special_message_es].some(value => typeof value === "string" && value.trim())) return null;

    try {
      const today = partsAt(now);
      if (today.year < 1900 || today.year > 9998) return null;
      const todayWeekday = new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay();
      const daysAhead = (weekday - todayWeekday + 7) % 7;
      for (const week of [0, 7]) {
        const nominal = Date.UTC(today.year, today.month - 1, today.day + daysAhead + week, Number(time[1]), Number(time[2]), Number(time[3] || 0));
        // Sample both sides of a possible DST transition. Verify the complete
        // wall time afterwards; skipped or repeated local times stay ambiguous.
        const offsets = new Set([-36, 0, 36].map(hours => {
          const sample = nominal + hours * 3600000;
          return wallTime(partsAt(new Date(sample))) - sample;
        }));
        const candidates = [...offsets].map(offset => new Date(nominal - offset))
          .filter(date => wallTime(partsAt(date)) === nominal);
        if (candidates.length !== 1) return null;
        if (candidates[0].getTime() >= now.getTime()) return candidates[0];
      }
    } catch { /* Older browsers can still display the published day and time. */ }
    return null;
  }

  function calendarText(value) {
    return String(value || "")
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
      .replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n")
      .replace(/;/g, "\\;").replace(/,/g, "\\,");
  }

  function foldLine(line) {
    let result = "", octets = 0;
    for (const character of line) {
      const point = character.codePointAt(0);
      const size = point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
      if (octets + size > 75) { result += "\r\n "; octets = 1; }
      result += character;
      octets += size;
    }
    return result;
  }

  function utcStamp(date) {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }

  function calendarFile(service, language = "en", now = new Date()) {
    const start = nextService(service, now);
    const address = typeof service?.address === "string" ? service.address.trim() : "";
    if (!start || !address || address.length > 1000) return null;
    const spanish = language === "es";
    const label = service[spanish ? "service_label_es" : "service_label_en"];
    const title = typeof label === "string" && label.trim() ? [...label.trim()].slice(0, 200).join("") : spanish ? "Servicio" : "Church service";
    const description = spanish
      ? "Horario habitual de Ministerio Cristiano Shekinah. Consulta los anuncios antes de tu visita por si hay cambios. La hora corresponde a Los Ángeles. Este archivo guarda solo esta fecha y no se actualiza automáticamente."
      : "Regular schedule for Ministerio Cristiano Shekinah. Check announcements before visiting for any changes. The service time is in Los Angeles. This file saves one date and does not update automatically.";
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ministerio Cristiano Shekinah//Visit//EN",
      "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
      `UID:service-${utcStamp(start)}@mcshekinah.org`,
      `DTSTAMP:${utcStamp(now)}`, `DTSTART:${utcStamp(start)}`,
      `SUMMARY:${calendarText(title + " · Shekinah")}`,
      `LOCATION:${calendarText(address)}`, `DESCRIPTION:${calendarText(description)}`,
      "URL:https://mcshekinah.org/#visit", "END:VEVENT", "END:VCALENDAR"
    ];
    const date = partsAt(start);
    const day = [date.year, String(date.month).padStart(2, "0"), String(date.day).padStart(2, "0")].join("-");
    return { content: lines.map(foldLine).join("\r\n") + "\r\n", filename: `shekinah-service-${day}.ics`, start };
  }

  const api = Object.freeze({ nextService, calendarFile, timeZone });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.SHEKINAH_VISIT_CALENDAR = api;
})();
