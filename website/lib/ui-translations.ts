import type { Translations } from 'fumadocs-ui/i18n';

import type { LanguageCode } from '@/lib/i18n';

/**
 * Chrome around the docs — search box, table of contents, pager, theme and
 * language pickers. English is fumadocs' built-in default, so it is omitted;
 * a locale missing from this map simply falls back to those English strings,
 * which keeps adding a language from being blocked on translating the shell.
 *
 * Keys are fumadocs' English source strings suffixed with the usage note it
 * registers them under, which is how fumadocs-ui 16.15 addresses translations.
 */
export const uiTranslations: Partial<
  Record<LanguageCode, Partial<Translations>>
> = {
  zh: {
    'Search(search trigger)': '搜索',
    'Search(search dialog)': '搜索',
    'No results found(search dialog)': '没有找到结果',
    'On this page(table of contents)': '本页内容',
    'No Headings(table of contents)': '本页没有标题',
    'Last updated on(page footer)': '最后更新于',
    'Choose a language(language switcher)': '选择语言',
    'Next Page(pagination)': '下一页',
    'Previous Page(pagination)': '上一页',
    'Toggle Theme(theme switcher)(aria-label)': '主题',
    'Edit on GitHub(edit page)': '在 GitHub 上编辑',
  },
  ja: {
    'Search(search trigger)': '検索',
    'Search(search dialog)': '検索',
    'No results found(search dialog)': '結果が見つかりません',
    'On this page(table of contents)': '目次',
    'No Headings(table of contents)': '見出しがありません',
    'Last updated on(page footer)': '最終更新',
    'Choose a language(language switcher)': '言語を選択',
    'Next Page(pagination)': '次のページ',
    'Previous Page(pagination)': '前のページ',
    'Toggle Theme(theme switcher)(aria-label)': 'テーマ',
    'Edit on GitHub(edit page)': 'GitHub で編集',
  },
  es: {
    'Search(search trigger)': 'Buscar',
    'Search(search dialog)': 'Buscar',
    'No results found(search dialog)': 'No se encontraron resultados',
    'On this page(table of contents)': 'En esta página',
    'No Headings(table of contents)': 'Sin encabezados',
    'Last updated on(page footer)': 'Última actualización',
    'Choose a language(language switcher)': 'Elegir idioma',
    'Next Page(pagination)': 'Página siguiente',
    'Previous Page(pagination)': 'Página anterior',
    'Toggle Theme(theme switcher)(aria-label)': 'Tema',
    'Edit on GitHub(edit page)': 'Editar en GitHub',
  },
  fr: {
    'Search(search trigger)': 'Rechercher',
    'Search(search dialog)': 'Rechercher',
    'No results found(search dialog)': 'Aucun résultat',
    'On this page(table of contents)': 'Dans cette page',
    'No Headings(table of contents)': 'Aucun titre',
    'Last updated on(page footer)': 'Dernière mise à jour',
    'Choose a language(language switcher)': 'Choisir la langue',
    'Next Page(pagination)': 'Page suivante',
    'Previous Page(pagination)': 'Page précédente',
    'Toggle Theme(theme switcher)(aria-label)': 'Thème',
    'Edit on GitHub(edit page)': 'Modifier sur GitHub',
  },
  de: {
    'Search(search trigger)': 'Suchen',
    'Search(search dialog)': 'Suchen',
    'No results found(search dialog)': 'Keine Ergebnisse gefunden',
    'On this page(table of contents)': 'Auf dieser Seite',
    'No Headings(table of contents)': 'Keine Überschriften',
    'Last updated on(page footer)': 'Zuletzt aktualisiert',
    'Choose a language(language switcher)': 'Sprache wählen',
    'Next Page(pagination)': 'Nächste Seite',
    'Previous Page(pagination)': 'Vorherige Seite',
    'Toggle Theme(theme switcher)(aria-label)': 'Erscheinungsbild',
    'Edit on GitHub(edit page)': 'Auf GitHub bearbeiten',
  },
  ko: {
    'Search(search trigger)': '검색',
    'Search(search dialog)': '검색',
    'No results found(search dialog)': '검색 결과가 없습니다',
    'On this page(table of contents)': '이 페이지의 내용',
    'No Headings(table of contents)': '제목이 없습니다',
    'Last updated on(page footer)': '최종 업데이트',
    'Choose a language(language switcher)': '언어 선택',
    'Next Page(pagination)': '다음 페이지',
    'Previous Page(pagination)': '이전 페이지',
    'Toggle Theme(theme switcher)(aria-label)': '테마',
    'Edit on GitHub(edit page)': 'GitHub에서 편집',
  },
};
