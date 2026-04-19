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
    <div className='df-sidebar-header'>
      <button
        type='button'
        aria-label={isCollapsed ? t('expandSidebar') : t('collapseSidebar')}
        className='df-sidebar-toggle'
        onClick={onCollapseToggle}
      >
        {isCollapsed ? (
          <PanelRightClose className='df-sidebar-toggle-icon' />
        ) : (
          <PanelRightOpen className='df-sidebar-toggle-icon' />
        )}
      </button>
      {!isCollapsed && (
        <div className='df-sidebar-header-main'>
          <span className='df-sidebar-header-title'>{t('calendars')}</span>
        </div>
      )}
    </div>
  );
};
