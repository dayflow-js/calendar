export interface CalendarChipProps {
  name: string;
  /** lineColor hex, e.g. "#3b82f6" */
  color: string;
}

export const CalendarChip = ({ name, color }: CalendarChipProps) => (
  <span
    className='mx-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium'
    style={{ backgroundColor: `${color}26`, color }}
  >
    {name}
  </span>
);
