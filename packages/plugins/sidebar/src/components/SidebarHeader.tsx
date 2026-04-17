import { PanelRightClose, PanelRightOpen, useLocale } from '@dayflow/core';

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
    <div className='df-sidebar__header'>
      <button
        type='button'
        aria-label={isCollapsed ? t('expandSidebar') : t('collapseSidebar')}
        className='df-sidebar__toggle'
        onClick={onCollapseToggle}
      >
        {isCollapsed ? (
          <PanelRightClose className='df-sidebar__toggle-icon' />
        ) : (
          <PanelRightOpen className='df-sidebar__toggle-icon' />
        )}
      </button>
      {!isCollapsed && (
        <div className='df-sidebar__header-main'>
          <span className='df-sidebar__header-title'>{t('calendars')}</span>
        </div>
      )}
    </div>
  );
};
