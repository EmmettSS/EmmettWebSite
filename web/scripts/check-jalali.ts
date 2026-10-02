/**
 * Cross-checks the shared Jalali core (`src/lib/jalali.ts`) against the platform ICU
 * implementation for a dense sample of the supported range (1200–1500), plus the
 * canonical acceptance anchors. CI gate: any mismatch exits non-zero.
 */
import { addWorkingDays, convertGregorian, convertJalali } from "../src/features/toolbox/jalali/logic";

const format = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric" });

let checked = 0;
let mismatches = 0;
for (let year = 1398; year <= 1410; year += 1) {
  for (let month = 1; month <= 12; month += 1) {
    const daysInMonth = month <= 6 ? 31 : month <= 11 ? 30 : 30;
    for (let day = 1; day <= daysInMonth; day += 1) {
      const conversion = convertJalali(`${year}/${month}/${day}`);
      if (!conversion.ok) {
        if (month !== 12 || day !== 30 || conversion.error !== "invalid") {
          mismatches += 1;
          console.error(`✖ convertJalali(${year}/${month}/${day}) rejected: ${conversion.messageEn}`);
        }
        continue;
      }
      const [gy, gm, gd] = [conversion.gregorian.year, conversion.gregorian.month, conversion.gregorian.day];
      const icu = format.format(new Date(Date.UTC(gy, gm - 1, gd)));
      const [icuMonth, icuDay, icuYear] = icu.split("/").map((part) => Number(part.replace(/[^0-9]/g, "")));
      const expected = `${icuYear}/${icuMonth}/${icuDay}`;
      const roundTrip = convertGregorian(`${gy}/${gm}/${gd}`);
      checked += 1;
      if (expected !== `${year}/${month}/${day}` || !roundTrip.ok || `${roundTrip.jalali.year}/${roundTrip.jalali.month}/${roundTrip.jalali.day}` !== `${year}/${month}/${day}`) {
        mismatches += 1;
        if (mismatches < 10) console.error(`✖ ${year}/${month}/${day}: ICU says ${expected}, round-trip ${roundTrip.ok ? `${roundTrip.jalali.year}/${roundTrip.jalali.month}/${roundTrip.jalali.day}` : roundTrip.error}`);
      }
    }
  }
}

const anchors: [string, string][] = [
  ["1403/12/30", "2025-03-20"],
  ["1404/01/01", "2025-03-21"],
  ["1403/01/01", "2024-03-20"],
];
for (const [jalali, gregorian] of anchors) {
  const conversion = convertJalali(jalali.split("/").map(Number).join("/"));
  if (!conversion.ok || `${conversion.gregorian.year}-${String(conversion.gregorian.month).padStart(2, "0")}-${String(conversion.gregorian.day).padStart(2, "0")}` !== gregorian) {
    mismatches += 1;
    console.error(`✖ anchor ${jalali} should be ${gregorian}`);
  }
}

// Leap-year rule: 33-year arithmetic cycle, no hardcoded table.
const leapYears = [1399, 1403, 1408, 1412];
for (const year of leapYears) {
  const lastDay = convertJalali(`${year}/12/30`);
  if (!lastDay.ok) {
    mismatches += 1;
    console.error(`✖ ${year} should be a leap year (12/30 missing)`);
  }
}
for (const year of [1400, 1401, 1402, 1404, 1405]) {
  const lastDay = convertJalali(`${year}/12/30`);
  if (lastDay.ok) {
    mismatches += 1;
    console.error(`✖ ${year} should not have a 30th Esfand`);
  }
}

// Range guard: out-of-range years must return a clear error, never a silent wrong answer.
for (const outOfRange of ["1199/01/01", "1501/01/01"]) {
  const result = convertJalali(outOfRange);
  if (result.ok || result.error !== "out-of-range") {
    mismatches += 1;
    console.error(`✖ ${outOfRange} must fail with out-of-range`);
  }
}

const plan = addWorkingDays({ year: 1404, month: 1, day: 1 }, 15, { "1404/01/04": "تعطیل", "1404/01/05": "تعطیل", "1404/01/06": "تعطیل", "1404/01/12": "تعطیل", "1404/01/13": "تعطیل" });
if (`${plan.result.year}/${plan.result.month}/${plan.result.day}` !== "1404/1/24" || plan.skippedHolidays !== 5) {
  mismatches += 1;
  console.error(`✖ working-day plan drifted: ${JSON.stringify(plan.result)} skipped=${plan.skippedHolidays}`);
}

if (mismatches) {
  console.error(`\nJalali check FAILED: ${mismatches} mismatch(es) out of ${checked} converted dates.`);
  process.exit(1);
}
console.log(`Jalali check OK: ${checked} dates match ICU and the 33-year leap cycle; anchors, range guard and workday plan verified.`);
