import React from 'react';
import { PanelRightClose, PanelRightOpen, Plus } from 'lucide-react';
import { useLocale } from '@/locale';

interface SidebarHeaderProps {
  isCollapsed: boolean;
  onCollapseToggle: () => void;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  isCollapsed,
  onCollapseToggle,
}) => {
  const { t } = useLocale();
  return (
    <div className="flex items-center px-2 py-2">
      <button
        type="button"
        aria-label={isCollapsed ? t('expandSidebar') : t('collapseSidebar')}
        className="flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-800"
        onClick={onCollapseToggle}
      >
        {isCollapsed ? (
          <PanelRightClose className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        ) : (
          <PanelRightOpen className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        )}
      </button>
      {!isCollapsed && (
        <div className='flex flex-1 justify-between items-center ml-3'>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {t('calendars')}
          </span>
        </div>
      )}
    </div>
  );
};
