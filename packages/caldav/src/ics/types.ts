export type ICalPropertyParams = Record<string, string>;

export type ICalProperty = {
  value: string;
  params: ICalPropertyParams;
};

/** Structured representation of a single VEVENT block. */
export type ParsedVEvent = {
  uid?: string;
  summary?: string;
  description?: string;
  location?: string;
  dtstart?: ICalProperty;
  dtend?: ICalProperty;
  /** Raw DURATION value (e.g. PT1H) when DTEND is absent. */
  duration?: string;
  /** Raw RRULE value — presence indicates a recurring event. */
  rrule?: string;
};
