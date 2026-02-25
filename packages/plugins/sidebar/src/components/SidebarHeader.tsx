import {
  PanelRightClose,
  PanelRightOpen,
  useLocale,
  sidebarHeader,
  sidebarHeaderToggle,
  sidebarHeaderTitle,
} from '@dayflow/core';

interface SidebarHeaderProps {
  isCollapsed: boolean;
  onCollapseToggle: () => void;
}

export const SidebarHeader = ({
  isCollapsed,
  onCollapseToggle,
}: SidebarHeaderProps) => {
  const { t } = useLocale();
  return (
    <div className={sidebarHeader}>
      <button
        type='button'
        aria-label={isCollapsed ? t('expandSidebar') : t('collapseSidebar')}
        className={sidebarHeaderToggle}
        onClick={onCollapseToggle}
      >
        {isCollapsed ? (
          <PanelRightClose className='h-4 w-4 text-gray-500 dark:text-gray-400' />
        ) : (
          <PanelRightOpen className='h-4 w-4 text-gray-500 dark:text-gray-400' />
        )}
      </button>
      {!isCollapsed && (
        <div className='ml-3 flex flex-1 items-center justify-between'>
          <span className={sidebarHeaderTitle}>{t('calendars')}</span>
        </div>
      )}
    </div>
  );
};
