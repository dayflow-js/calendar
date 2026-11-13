const paths = {
  search: 'M21 21l-4.35-4.35 M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  plus: 'M12 5v14 M5 12h14',
  calendar:
    'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2',
  close: 'M6 6l12 12 M18 6 6 18',
  flag: 'M5 21V4 M5 4h12l-2.5 4.5L17 13H5',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  check: 'M5 12l5 5L20 7',
  chevronDown: 'M6 9l6 6 6-6',
  pencil: 'M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4',
  enter: 'M20 5v7a3 3 0 0 1-3 3H5 M9 11l-4 4 4 4',
  palette:
    'M12 3a9 9 0 1 0 0 18c.9 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8 M7.5 10.5h.01 M12 7.5h.01 M16.5 10.5h.01',
  trash: 'M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3',
};

export type BoardIconName = keyof typeof paths;

export function BoardIcon({
  name,
  size = 16,
}: {
  name: BoardIconName;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={1.8}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <path d={paths[name]} />
    </svg>
  );
}
