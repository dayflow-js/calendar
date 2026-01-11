/**
 * Localization Utilities
 * 
 * Provides a unified way to handle translations using native Intl APIs where possible,
 * and a dictionary fallback for application-specific terms.
 */

export type LocaleCode = string;

export type TranslationKey =
  | 'allDay'
  | 'noEvents'
  | 'more'
  | 'eventTitle'
  | 'dateRange'
  | 'timeRange'
  | 'note'
  | 'addNotePlaceholder'
  | 'setAsAllDay'
  | 'setAsTimed'
  | 'delete'
  | 'confirm'
  | 'cancel'
  | 'today'
  | 'day'
  | 'week'
  | 'month'
  | 'year'
  | 'newEvent'
  | 'newAllDayEvent'
  | 'newCalendarEvent'
  | 'newAllDayCalendarEvent'
  | 'save'
  | 'deleteCalendar'
  | 'deleteCalendarMessage'
  | 'merge'
  | 'confirmDeleteTitle'
  | 'confirmDeleteMessage'
  | 'mergeConfirmTitle'
  | 'mergeConfirmMessage'
  | 'expandSidebar'
  | 'collapseSidebar'
  | 'calendars'
  | 'createCalendar'
  | 'calendarNamePlaceholder'
  | 'customColor'
  | 'create'
  | 'calendarOptions'
  | 'untitled';

const TRANSLATIONS: Record<string, Partial<Record<TranslationKey, string>>> = {
  'zh': {
    allDay: '全天',
    noEvents: '今日无日程',
    more: '个',
    eventTitle: '事件标题',
    dateRange: '日期范围',
    timeRange: '时间范围',
    note: '备注',
    addNotePlaceholder: '添加备注...',
    setAsAllDay: '设为全天',
    setAsTimed: '设为普通事件',
    delete: '删除',
    confirm: '确认',
    cancel: '取消',
    today: '今天',
    day: '日',
    week: '周',
    month: '月',
    year: '年',
    newEvent: '新建日程',
    newAllDayEvent: '新建全天日程',
    newCalendarEvent: '新建 {calendarName} 日程',
    newAllDayCalendarEvent: '新建 {calendarName} 全天日程',
    save: '保存',
    deleteCalendar: '删除日历 "{calendarName}"?',
    deleteCalendarMessage: '您想删除日历 "{calendarName}" 还是将其事件合并到另一个现有日历中？',
    merge: '合并',
    confirmDeleteTitle: '您确定要删除日历 "{calendarName}" 吗？',
    confirmDeleteMessage: '如果您删除此日历，与其关联的所有事件也将被删除。',
    mergeConfirmTitle: '将 "{sourceName}" 合并到 "{targetName}"?',
    mergeConfirmMessage: '您确定要将 "{sourceName}" 合并到 "{targetName}" 吗？这样做会将 "{sourceName}" 中的所有事件移动到 "{targetName}"，并且 "{sourceName}" 将被删除。此操作无法撤销。',
    expandSidebar: '展开日历侧边栏',
    collapseSidebar: '收起日历侧边栏',
    calendars: '日历',
    createCalendar: '创建新日历',
    calendarNamePlaceholder: '例如：工作',
    customColor: '自定义颜色...',
    create: '创建',
    calendarOptions: '日历选项',
    untitled: '未命名',
  },
  'ja': {
    allDay: '終日',
    noEvents: '本日は予定がありません',
    more: '件',
    eventTitle: '予定名',
    dateRange: '日付範囲',
    timeRange: '時間範囲',
    note: 'メモ',
    addNotePlaceholder: 'メモを追加...',
    setAsAllDay: '終日予定に設定',
    setAsTimed: '時間指定の予定に設定',
    delete: '削除',
    confirm: '確認',
    cancel: 'キャンセル',
    today: '今日',
    day: '日',
    week: '週',
    month: '月',
    year: '年',
    newEvent: '新規予定',
    newAllDayEvent: '新規終日予定',
    newCalendarEvent: '新規 {calendarName} 予定',
    newAllDayCalendarEvent: '新規 {calendarName} 終日予定',
    save: '保存',
    deleteCalendar: 'カレンダー "{calendarName}" を削除しますか？',
    deleteCalendarMessage: 'カレンダー "{calendarName}" を削除しますか？それともイベントを別の既存のカレンダーにマージしますか？',
    merge: 'マージ',
    confirmDeleteTitle: 'カレンダー "{calendarName}" を削除してもよろしいですか？',
    confirmDeleteMessage: 'このカレンダーを削除すると、関連するすべてのイベントも削除されます。',
    mergeConfirmTitle: '"{sourceName}" を "{targetName}" にマージしますか？',
    mergeConfirmMessage: '"{sourceName}" を "{targetName}" にマージしてもよろしいですか？これにより、"{sourceName}" のすべてのイベントが "{targetName}" に移動し、"{sourceName}" は削除されます。この操作は元に戻せません。',
    expandSidebar: 'カレンダーサイドバーを展開',
    collapseSidebar: 'カレンダーサイドバーを折りたたむ',
    calendars: 'カレンダー',
    createCalendar: '新しいカレンダーを作成',
    calendarNamePlaceholder: '例：仕事',
    customColor: 'カスタムカラー...',
    create: '作成',
    calendarOptions: 'カレンダーオプション',
    untitled: '無題',
  },
  'es': {
    allDay: 'Todo el día',
    noEvents: 'No hay eventos hoy',
    more: 'más',
    eventTitle: 'Título del evento',
    dateRange: 'Rango de fechas',
    timeRange: 'Rango de tiempo',
    note: 'Nota',
    addNotePlaceholder: 'Añadir una nota...',
    setAsAllDay: 'Establecer como todo el día',
    setAsTimed: 'Establecer como evento con horario',
    delete: 'Eliminar',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    today: 'Hoy',
    day: 'Día',
    week: 'Semana',
    month: 'Mes',
    year: 'Año',
    newEvent: 'Nuevo evento',
    newAllDayEvent: 'Nuevo evento de todo el día',
    newCalendarEvent: 'Nuevo evento en {calendarName}',
    newAllDayCalendarEvent: 'Nuevo evento de todo el día en {calendarName}',
    save: 'Guardar',
    deleteCalendar: '¿Eliminar "{calendarName}"?',
    deleteCalendarMessage: '¿Quieres eliminar "{calendarName}" o fusionar sus eventos en otro calendario existente?',
    merge: 'Fusionar',
    confirmDeleteTitle: '¿Seguro que quieres eliminar el calendario "{calendarName}"?',
    confirmDeleteMessage: 'Si eliminas este calendario, también se eliminarán todos los eventos asociados.',
    mergeConfirmTitle: '¿Fusionar "{sourceName}" con "{targetName}"?',
    mergeConfirmMessage: '¿Seguro que quieres fusionar "{sourceName}" con "{targetName}"? Esto moverá todos los eventos de "{sourceName}" a "{targetName}" y se eliminará "{sourceName}". Esta acción no se puede deshacer.',
    expandSidebar: 'Expandir barra lateral del calendario',
    collapseSidebar: 'Contraer barra lateral del calendario',
    calendars: 'Calendarios',
    createCalendar: 'Crear nuevo calendario',
    calendarNamePlaceholder: 'ej. Trabajo',
    customColor: 'Color personalizado...',
    create: 'Crear',
    calendarOptions: 'Opciones de calendario',
    untitled: 'Sin título',
  },
  'de': {
    allDay: 'Ganztägig',
    noEvents: 'Heute keine Termine',
    more: 'mehr',
    eventTitle: 'Ereignistitel',
    dateRange: 'Datumsbereich',
    timeRange: 'Zeitbereich',
    note: 'Notiz',
    addNotePlaceholder: 'Notiz hinzufügen...',
    setAsAllDay: 'Als ganztägig festlegen',
    setAsTimed: 'Als zeitlich begrenztes Ereignis festlegen',
    delete: 'Löschen',
    confirm: 'Bestätigen',
    cancel: 'Abbrechen',
    today: 'Heute',
    day: 'Tag',
    week: 'Woche',
    month: 'Monat',
    year: 'Jahr',
    newEvent: 'Neues Ereignis',
    newAllDayEvent: 'Neues ganztägiges Ereignis',
    newCalendarEvent: 'Neues Ereignis in {calendarName}',
    newAllDayCalendarEvent: 'Neues ganztägiges Ereignis in {calendarName}',
    save: 'Speichern',
    deleteCalendar: '"{calendarName}" löschen?',
    deleteCalendarMessage: 'Möchten Sie "{calendarName}" löschen oder dessen Ereignisse in einen anderen bestehenden Kalender zusammenführen?',
    merge: 'Zusammenführen',
    confirmDeleteTitle: 'Sind Sie sicher, dass Sie den Kalender "{calendarName}" löschen möchten?',
    confirmDeleteMessage: 'Wenn Sie diesen Kalender löschen, werden auch alle damit verbundenen Ereignisse gelöscht.',
    mergeConfirmTitle: '"{sourceName}" mit "{targetName}" zusammenführen?',
    mergeConfirmMessage: 'Sind Sie sicher, dass Sie "{sourceName}" mit "{targetName}" zusammenführen möchten? Dadurch werden alle Ereignisse von "{sourceName}" nach "{targetName}" verschoben und "{sourceName}" wird gelöscht. Dies kann nicht rückgängig gemacht werden.',
    expandSidebar: 'Kalender-Seitenleiste erweitern',
    collapseSidebar: 'Kalender-Seitenleiste einklappen',
    calendars: 'Kalender',
    createCalendar: 'Neuen Kalender erstellen',
    calendarNamePlaceholder: 'z.B. Arbeit',
    customColor: 'Benutzerdefinierte Farbe...',
    create: 'Erstellen',
    calendarOptions: 'Kalenderoptionen',
    untitled: 'Unbenannt',
  },
  'ko': {
    allDay: '종일',
    noEvents: '오늘 일정이 없습니다',
    more: '개',
    eventTitle: '일정 제목',
    dateRange: '날짜 범위',
    timeRange: '시간 범위',
    note: '메모',
    addNotePlaceholder: '메모 추가...',
    setAsAllDay: '종일 일정으로 설정',
    setAsTimed: '시간 지정 일정으로 설정',
    delete: '삭제',
    confirm: '확인',
    cancel: '취소',
    today: '오늘',
    day: '일',
    week: '주',
    month: '월',
    year: '년',
    newEvent: '새 일정',
    newAllDayEvent: '새 종일 일정',
    newCalendarEvent: '{calendarName}의 새 일정',
    newAllDayCalendarEvent: '{calendarName}의 새 종일 일정',
    save: '저장',
    deleteCalendar: '"{calendarName}" 삭제?',
    deleteCalendarMessage: '"{calendarName}"을(를) 삭제하시겠습니까, 아니면 이벤트를 다른 기존 캘린더로 병합하시겠습니까?',
    merge: '병합',
    confirmDeleteTitle: '"{calendarName}" 캘린더를 삭제하시겠습니까?',
    confirmDeleteMessage: '이 캘린더를 삭제하면 연결된 모든 이벤트도 삭제됩니다.',
    mergeConfirmTitle: '"{sourceName}"을(를) "{targetName}"(으)로 병합?',
    mergeConfirmMessage: '"{sourceName}"을(를) "{targetName}"(으)로 병합하시겠습니까? 이렇게 하면 "{sourceName}"의 모든 이벤트가 "{targetName}"(으)로 이동하고 "{sourceName}"은(는) 삭제됩니다. 이 작업은 취소할 수 없습니다.',
    expandSidebar: '캘린더 사이드바 펼치기',
    collapseSidebar: '캘린더 사이드바 접기',
    calendars: '캘린더',
    createCalendar: '새 캘린더 만들기',
    calendarNamePlaceholder: '예: 업무',
    customColor: '사용자 지정 색상...',
    create: '만들기',
    calendarOptions: '캘린더 옵션',
    untitled: '무제',
  },
  'fr': {
    allDay: 'Toute la journée',
    noEvents: "Aucun événement aujourd'hui",
    more: 'de plus',
    eventTitle: "Titre de l'événement",
    dateRange: 'Plage de dates',
    timeRange: 'Plage horaire',
    note: 'Note',
    addNotePlaceholder: 'Ajouter une note...',
    setAsAllDay: 'Définir comme toute la journée',
    setAsTimed: 'Définir comme événement horaire',
    delete: 'Supprimer',
    confirm: 'Confirmer',
    cancel: 'Annuler',
    today: "Aujourd'hui",
    day: 'Jour',
    week: 'Semaine',
    month: 'Mois',
    year: 'Année',
    newEvent: 'Nouvel événement',
    newAllDayEvent: 'Nouvel événement toute la journée',
    newCalendarEvent: 'Nouvel événement dans {calendarName}',
    newAllDayCalendarEvent: 'Nouvel événement toute la journée dans {calendarName}',
    save: 'Enregistrer',
    deleteCalendar: 'Supprimer "{calendarName}" ?',
    deleteCalendarMessage: 'Voulez-vous supprimer "{calendarName}" ou fusionner ses événements dans un autre calendrier existant ?',
    merge: 'Fusionner',
    confirmDeleteTitle: 'Êtes-vous sûr de vouloir supprimer le calendrier "{calendarName}" ?',
    confirmDeleteMessage: 'Si vous supprimez ce calendrier, tous les événements associés seront également supprimés.',
    mergeConfirmTitle: 'Fusionner "{sourceName}" avec "{targetName}" ?',
    mergeConfirmMessage: 'Êtes-vous sûr de vouloir fusionner "{sourceName}" avec "{targetName}" ? Cela déplacera tous les événements de "{sourceName}" vers "{targetName}" et "{sourceName}" sera supprimé. Cette action est irréversible.',
    expandSidebar: 'Développer la barre latérale',
    collapseSidebar: 'Réduire la barre latérale',
    calendars: 'Calendriers',
    createCalendar: 'Créer un nouveau calendrier',
    calendarNamePlaceholder: 'ex. Travail',
    customColor: 'Couleur personnalisée...',
    create: 'Créer',
    calendarOptions: 'Options du calendrier',
    untitled: 'Sans titre',
  },
  // English is the default fallback, explicit definition optional but good for structure
  'en': {
    allDay: 'All day',
    noEvents: 'No events for this day',
    more: 'more',
    eventTitle: 'Event Title',
    dateRange: 'Date Range',
    timeRange: 'Time Range',
    note: 'Note',
    addNotePlaceholder: 'Add a note...',
    setAsAllDay: 'Set as All-day',
    setAsTimed: 'Set as Timed Event',
    delete: 'Delete',
    confirm: 'Confirm',
    cancel: 'Cancel',
    today: 'Today',
    day: 'Day',
    week: 'Week',
    month: 'Month',
    year: 'Year',
    newEvent: 'New Event',
    newAllDayEvent: 'New All-day Event',
    newCalendarEvent: 'New {calendarName} Event',
    newAllDayCalendarEvent: 'New {calendarName} All-day Event',
    save: 'Save',
    deleteCalendar: 'Delete "{calendarName}"?',
    deleteCalendarMessage: 'Do you want to delete "{calendarName}" or merge its events into another existing calendar?',
    merge: 'Merge',
    confirmDeleteTitle: 'Are you sure you want to delete the calendar "{calendarName}"?',
    confirmDeleteMessage: 'If you delete this calendar, all events associated with the calendar will also be deleted.',
    mergeConfirmTitle: 'Merge "{sourceName}" with "{targetName}"?',
    mergeConfirmMessage: 'Are you sure you want to merge "{sourceName}" with "{targetName}"? Doing so will move all the events from "{sourceName}" to "{targetName}" and "{sourceName}" will be deleted. This cannot be undone.',
    expandSidebar: 'Expand calendar sidebar',
    collapseSidebar: 'Collapse calendar sidebar',
    calendars: 'Calendars',
    createCalendar: 'Create New Calendar',
    calendarNamePlaceholder: 'e.g. Work',
    customColor: 'Custom Color...',
    create: 'Create',
    calendarOptions: 'Calendar Options',
    untitled: 'Untitled',
  }
};

/**
 * Get a localized label.
 * Prioritizes Intl APIs for standard terms, falls back to dictionary.
 */
export const t = (key: TranslationKey, locale: LocaleCode = 'en-US'): string => {
  const lang = locale.split('-')[0].toLowerCase();

  // 1. Try Native Intl APIs for standard calendar terms
  try {
    if (key === 'today') {
      // Intl.RelativeTimeFormat can return "today", "aujourd’hui", "今日", "今天"
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      const parts = rtf.formatToParts(0, 'day');
      const value = parts.find(p => p.type === 'literal')?.value || 'Today';
      // Capitalize first letter
      return value.charAt(0).toUpperCase() + value.slice(1);
    }

    if (['day', 'week', 'month', 'year'].includes(key)) {
      // Intl.DisplayNames returns "Day", "Jour", "日"
      const dn = new Intl.DisplayNames([locale], { type: 'dateTimeField' });
      const value = dn.of(key);
      if (value) {
        return value.charAt(0).toUpperCase() + value.slice(1);
      }
    }
  } catch (e) {
    // Fallback if Intl is not supported or fails
    console.warn(`Intl API failed for key ${key} in locale ${locale}`, e);
  }

  // 2. Dictionary Lookup
  const dict = TRANSLATIONS[lang] || TRANSLATIONS['en'];
  const text = dict[key];

  if (text) return text;

  // 3. Absolute Fallback to English
  return TRANSLATIONS['en'][key] || key;
};

/**
 * Get localized weekday labels (Mon, Tue, etc.)
 */
export const getWeekDaysLabels = (locale: LocaleCode, format: 'long' | 'short' | 'narrow' = 'short'): string[] => {
  const labels: string[] = [];
  // Use a known Monday to start (2024-01-01 was a Monday)
  const baseDate = new Date(2024, 0, 1);
  for (let i = 0; i < 7; i++) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + i);
    labels.push(date.toLocaleDateString(locale, { weekday: format }));
  }
  return labels;
};

/**
 * Get localized month labels
 */
export const getMonthLabels = (locale: LocaleCode, format: 'long' | 'short' | 'narrow' | 'numeric' | '2-digit' = 'long'): string[] => {
  const labels: string[] = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date(2024, i, 1);
    labels.push(date.toLocaleDateString(locale, { month: format }));
  }
  return labels;
};
