import { PanelRightClose, PanelRightOpen, Plus } from '../../common/Icons';
import { useLocale } from '@/locale';
import {
  sidebarHeader,
  sidebarHeaderToggle,
  sidebarHeaderTitle,
} from '@/styles/classNames';

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
        type="button"
        aria-label={isCollapsed ? t('expandSidebar') : t('collapseSidebar')}
        className={sidebarHeaderToggle}
        onClick={onCollapseToggle}
      >
        {isCollapsed ? (
          <PanelRightClose className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        ) : (
          <PanelRightOpen className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        )}
      </button>
      {!isCollapsed && (
        <div className="flex flex-1 justify-between items-center ml-3">
          <span className={sidebarHeaderTitle}>{t('calendars')}</span>
        </div>
      )}
    </div>
  );
};
