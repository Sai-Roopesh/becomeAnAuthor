import { describe, expect, it } from "vitest";
import {
  createDefaultWorldEventTemporal,
  formatWorldEventTemporal,
  normalizeWorldEventTemporal,
  worldEventTemporalSortValue,
} from "@/shared/utils/world-event-temporal";

describe("world-event-temporal utils", () => {
  it("creates a strict default temporal value", () => {
    expect(createDefaultWorldEventTemporal()).toEqual({
      precision: "year",
      year: 1,
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
    });
  });

  it("normalizes invalid values and clamps day based on month/year", () => {
    const normalized = normalizeWorldEventTemporal({
      precision: "date-time",
      year: 2025,
      month: 2,
      day: 31,
      hour: 27,
      minute: -3,
    });

    expect(normalized).toEqual({
      precision: "date-time",
      year: 2025,
      month: 2,
      day: 28,
      hour: 23,
      minute: 0,
    });
  });

  it("formats each precision mode correctly", () => {
    expect(
      formatWorldEventTemporal({
        precision: "year",
        year: 450,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
      }),
    ).toBe("Year 450");

    expect(
      formatWorldEventTemporal({
        precision: "date",
        year: 450,
        month: 3,
        day: 21,
        hour: 0,
        minute: 0,
      }),
    ).toBe("Mar 21, Year 450");

    expect(
      formatWorldEventTemporal({
        precision: "date-time",
        year: 450,
        month: 3,
        day: 21,
        hour: 7,
        minute: 5,
      }),
    ).toBe("Mar 21, Year 450 at 07:05");
  });

  it("sorts by full temporal precision", () => {
    const yearOnly = worldEventTemporalSortValue({
      precision: "year",
      year: 450,
      month: 12,
      day: 31,
      hour: 23,
      minute: 59,
    });
    const date = worldEventTemporalSortValue({
      precision: "date",
      year: 450,
      month: 6,
      day: 1,
      hour: 23,
      minute: 59,
    });
    const dateTime = worldEventTemporalSortValue({
      precision: "date-time",
      year: 450,
      month: 6,
      day: 1,
      hour: 8,
      minute: 30,
    });

    expect(yearOnly).toBeLessThan(date);
    expect(date).toBeLessThan(dateTime);
  });
});
