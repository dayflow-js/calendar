export interface CalendarChipProps {
  name: string;
  /** lineColor hex, e.g. "#3b82f6" */
  color: string;
}

export const CalendarChip = ({ name, color }: CalendarChipProps) => (
  <span
    className='df-sidebar__chip'
    style={{ backgroundColor: `${color}26`, color }}
  >
    {name}
  </span>
);
