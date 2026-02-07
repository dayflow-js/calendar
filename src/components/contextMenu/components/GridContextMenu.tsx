import React from 'react';
import { ContextMenu, ContextMenuItem } from './Primitives';
import { useLocale } from '@/locale';
import { CalendarApp, ViewType } from '@/types';
import { clipboardStore } from '@/utils/clipboardStore';
import { handlePasteEvent } from '../utils';

interface GridContextMenuProps {
  x: number;
  y: number;
  date: Date;
  onClose: () => void;
  app: CalendarApp;
  onCreateEvent: () => void;
  viewType?: ViewType;
}

const GridContextMenu: React.FC<GridContextMenuProps> = ({
  x,
  y,
  date,
  onClose,
  app,
  onCreateEvent,
  viewType,
}) => {
  const { t } = useLocale();
  const hasCopiedEvent = clipboardStore.hasEvent();

  const handlePaste = async () => {
    await handlePasteEvent(app, date, viewType);
    onClose();
  };

  return (
    <ContextMenu x={x} y={y} onClose={onClose}>
      <ContextMenuItem onClick={() => { onCreateEvent(); onClose(); }}>
        {t('newEvent') || 'New Event'}
      </ContextMenuItem>
      <ContextMenuItem 
        onClick={handlePaste} 
        disabled={!hasCopiedEvent}
      >
        {t('pasteHere') || 'Paste Here'}
      </ContextMenuItem>
    </ContextMenu>
  );
};

export default GridContextMenu;
