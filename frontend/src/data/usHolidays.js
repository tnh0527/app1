/**
 * US Federal Holidays and Observances
 *
 * Uses the date-holidays library for accurate, maintainable holiday data.
 *
 * Key Features & Improvements:
 * ✅ Observed Dates: Automatically handles weekend substitutions (e.g., if July 4th
 *    falls on Saturday, the observed date is Friday; if Sunday, it's Monday)
 * ✅ Historical Accuracy: Correctly handles holidays added/changed over time
 *    (e.g., Juneteenth became federal in 2021)
 * ✅ Future Accuracy: Uses rule-based calculations maintained by the library,
 *    accurate for decades into the future (like iPhone calendar)
 * ✅ Timezone Safe: Uses library's timezone-aware date handling
 * ✅ Maintainable: Updates come from the actively maintained date-holidays package
 * ✅ International Support: Library supports 100+ countries if needed in future
 *
 * Note: The library returns "Washington's Birthday" for Presidents' Day (official name)
 * and handles all federal holiday rules according to U.S. Code Title 5 § 6103.
 *
 * @see https://github.com/commenthol/date-holidays
 */

import Holidays from "date-holidays";

// Initialize the holidays library for US
const hd = new Holidays("US");

// Icon mapping for holidays
const HOLIDAY_ICONS = {
  "New Year's Day": "🎉",
  "Martin Luther King Jr. Day": "✊",
  "Presidents' Day": "🏛️",
  "Memorial Day": "🪖",
  Juneteenth: "✊",
  "Independence Day": "🎆",
  "Labor Day": "👷",
  "Columbus Day": "🧭",
  "Veterans Day": "🎖️",
  "Thanksgiving Day": "🦃",
  "Christmas Day": "🎄",
  "Valentine's Day": "❤️",
  "St. Patrick's Day": "☘️",
  "Mother's Day": "💐",
  "Father's Day": "👔",
  Halloween: "🎃",
  "Christmas Eve": "🎅",
  "New Year's Eve": "🥂",
};

// Popular observances to include alongside federal holidays
const OBSERVANCES = [
  { name: "Valentine's Day", month: 2, day: 14 },
  { name: "St. Patrick's Day", month: 3, day: 17 },
  { name: "Mother's Day", rule: "2nd Sunday of May" },
  { name: "Father's Day", rule: "3rd Sunday of June" },
  { name: "Halloween", month: 10, day: 31 },
  { name: "Christmas Eve", month: 12, day: 24 },
  { name: "New Year's Eve", month: 12, day: 31 },
];

/**
 * Helper to get nth weekday of month
 */
const getNthWeekday = (year, month, weekday, n) => {
  const firstDay = new Date(year, month - 1, 1);
  const firstWeekday = firstDay.getDay();
  let day = 1 + ((weekday - firstWeekday + 7) % 7);
  day += (n - 1) * 7;
  return new Date(year, month - 1, day);
};

/**
 * Add observances for a given year
 */
const getObservances = (year) => {
  const observances = [];

  OBSERVANCES.forEach((obs) => {
    let date;
    if (obs.month && obs.day) {
      date = new Date(year, obs.month - 1, obs.day);
    } else if (obs.rule === "2nd Sunday of May") {
      date = getNthWeekday(year, 5, 0, 2);
    } else if (obs.rule === "3rd Sunday of June") {
      date = getNthWeekday(year, 6, 0, 3);
    }

    if (date) {
      observances.push({
        date: date,
        start: date,
        end: date,
        name: obs.name,
        type: "observance",
      });
    }
  });

  return observances;
};

/**
 * Generate US holidays for a given year
 * @param {number} year - The year to generate holidays for
 * @returns {Array} Array of holiday objects
 */
export const getUSHolidays = (year) => {
  // Get federal holidays from the library (includes observed dates)
  const federalHolidays = hd.getHolidays(year);

  // Filter for public/federal holidays only
  const publicHolidays = federalHolidays.filter(
    (h) => h.type === "public" || h.type === "bank"
  );

  // Get observances
  const observances = getObservances(year);

  // Combine and format
  const allHolidays = [...publicHolidays, ...observances];

  return allHolidays.map((holiday, index) => {
    const holidayDate = new Date(holiday.date || holiday.start);
    const isFederal = holiday.type === "public" || holiday.type === "bank";

    return {
      id: `holiday-${year}-${index}`,
      title: holiday.name,
      date: holidayDate,
      type: isFederal ? "federal" : "observance",
      icon: HOLIDAY_ICONS[holiday.name] || "🎊",
      isHoliday: true,
      isReadOnly: true,
      color: isFederal ? "#8B5CF6" : "#EC4899", // Purple for federal, pink for observances
      // Include substitute/observed info if available
      substitute: holiday.substitute || false,
    };
  });
};

/**
 * Get holidays for a date range (supports multiple years)
 * @param {Date} startDate - Start of the range
 * @param {Date} endDate - End of the range
 * @returns {Array} Array of holiday objects within the range
 */
export const getHolidaysInRange = (startDate, endDate) => {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  const holidays = [];

  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getUSHolidays(year);
    holidays.push(
      ...yearHolidays.filter(
        (holiday) => holiday.date >= startDate && holiday.date <= endDate
      )
    );
  }

  return holidays;
};

/**
 * Check if a date is a holiday
 * @param {Date} date - The date to check
 * @returns {Object|null} Holiday object if found, null otherwise
 */
export const getHolidayForDate = (date) => {
  const holidays = getUSHolidays(date.getFullYear());
  return holidays.find(
    (holiday) => holiday.date.toDateString() === date.toDateString()
  );
};

export default { getUSHolidays, getHolidaysInRange, getHolidayForDate };
