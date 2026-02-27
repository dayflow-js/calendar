/* oxlint-disable typescript/no-duplicate-enum-values */
/**
 * Common IANA TimeZone identifiers.
 * This enum provides a convenient way for users to specify secondary timezones
 * without having to look up the exact Temporal/Intl TimeZone strings.
 */
export enum TimeZone {
  // UTC/GMT
  UTC = 'UTC',

  // North America
  NEW_YORK = 'America/New_York',
  CHICAGO = 'America/Chicago',
  DENVER = 'America/Denver',
  LOS_ANGELES = 'America/Los_Angeles',
  TORONTO = 'America/Toronto',
  VANCOUVER = 'America/Vancouver',
  PHOENIX = 'America/Phoenix',
  ANCHORAGE = 'America/Anchorage',
  HONOLULU = 'Pacific/Honolulu',
  MEXICO_CITY = 'America/Mexico_City',
  WINNIPEG = 'America/Winnipeg',
  HALIFAX = 'America/Halifax',
  ST_JOHNS = 'America/St_Johns',
  DETROIT = 'America/Detroit',
  MIAMI = 'America/Miami',
  SEATTLE = 'America/Los_Angeles',
  ATLANTA = 'America/New_York',
  DALLAS = 'America/Chicago',
  HOUSTON = 'America/Chicago',
  LAS_VEGAS = 'America/Los_Angeles',
  SAN_FRANCISCO = 'America/Los_Angeles',

  // Europe
  LONDON = 'Europe/London',
  PARIS = 'Europe/Paris',
  BERLIN = 'Europe/Berlin',
  MADRID = 'Europe/Madrid',
  ROME = 'Europe/Rome',
  AMSTERDAM = 'Europe/Amsterdam',
  ZURICH = 'Europe/Zurich',
  STOCKHOLM = 'Europe/Stockholm',
  OSLO = 'Europe/Oslo',
  COPENHAGEN = 'Europe/Copenhagen',
  MOSCOW = 'Europe/Moscow',
  ISTANBUL = 'Europe/Istanbul',
  DUBLIN = 'Europe/Dublin',
  LISBON = 'Europe/Lisbon',
  PRAGUE = 'Europe/Prague',
  VIENNA = 'Europe/Vienna',
  WARSAW = 'Europe/Warsaw',
  BRUSSELS = 'Europe/Brussels',
  ATHENS = 'Europe/Athens',
  BUCHAREST = 'Europe/Bucharest',
  HELSINKI = 'Europe/Helsinki',
  KYIV = 'Europe/Kyiv',
  BUDAPEST = 'Europe/Budapest',
  BELGRADE = 'Europe/Belgrade',
  LUXEMBOURG = 'Europe/Luxembourg',
  MONACO = 'Europe/Monaco',
  REYKJAVIK = 'Atlantic/Reykjavik',

  // Asia
  TOKYO = 'Asia/Tokyo',
  SHANGHAI = 'Asia/Shanghai',
  BEIJING = 'Asia/Shanghai',
  HONG_KONG = 'Asia/Hong_Kong',
  TAIPEI = 'Asia/Taipei',
  SEOUL = 'Asia/Seoul',
  SINGAPORE = 'Asia/Singapore',
  HANOI = 'Asia/Ho_Chi_Minh',
  BANGKOK = 'Asia/Bangkok',
  JAKARTA = 'Asia/Jakarta',
  KUALA_LUMPUR = 'Asia/Kuala_Lumpur',
  MANILA = 'Asia/Manila',
  DUBAI = 'Asia/Dubai',
  KOLKATA = 'Asia/Kolkata',
  MUMBAI = 'Asia/Kolkata',
  RIYADH = 'Asia/Riyadh',
  TEHRAN = 'Asia/Tehran',
  JERUSALEM = 'Asia/Jerusalem',
  TEL_AVIV = 'Asia/Tel_Aviv',
  BAGHDAD = 'Asia/Baghdad',
  DHAKA = 'Asia/Dhaka',
  KARA_CHI = 'Asia/Karachi',
  KABUL = 'Asia/Kabul',
  KATHMANDU = 'Asia/Kathmandu',
  COLOMBO = 'Asia/Colombo',
  TASHKENT = 'Asia/Tashkent',
  ALMATY = 'Asia/Almaty',
  PHNOM_PENH = 'Asia/Phnom_Penh',
  VIENTIANE = 'Asia/Vientiane',
  MUSCAT = 'Asia/Muscat',

  // Oceania
  SYDNEY = 'Australia/Sydney',
  MELBOURNE = 'Australia/Melbourne',
  BRISBANE = 'Australia/Brisbane',
  PERTH = 'Australia/Perth',
  ADELAIDE = 'Australia/Adelaide',
  DARWIN = 'Australia/Darwin',
  HOBART = 'Australia/Hobart',
  AUCKLAND = 'Pacific/Auckland',
  FIJI = 'Pacific/Fiji',
  GUAM = 'Pacific/Guam',
  NOUMEA = 'Pacific/Noumea',
  PAGO_PAGO = 'Pacific/Pago_Pago',
  PORT_MORESBY = 'Pacific/Port_Moresby',

  // South America
  SAO_PAULO = 'America/Sao_Paulo',
  RIO_DE_JANEIRO = 'America/Sao_Paulo',
  BUENOS_AIRES = 'America/Argentina/Buenos_Aires',
  SANTIAGO = 'America/Santiago',
  LIMA = 'America/Lima',
  BOGOTA = 'America/Bogota',
  CARACAS = 'America/Caracas',
  LA_PAZ = 'America/La_Paz',
  MONTEVIDEO = 'America/Montevideo',
  QUITO = 'America/Quito',
  ASUNCION = 'America/Asuncion',
  GEORGETOWN = 'America/Guyana',

  // Africa
  CAIRO = 'Africa/Cairo',
  JOHANNESBURG = 'Africa/Johannesburg',
  LAGOS = 'Africa/Lagos',
  NAIROBI = 'Africa/Nairobi',
  CASABLANCA = 'Africa/Casablanca',
  ALGIERS = 'Africa/Algiers',
  TUNIS = 'Africa/Tunis',
  ADDIS_ABABA = 'Africa/Addis_Ababa',
  ACCRA = 'Africa/Accra',
  DAKAR = 'Africa/Dakar',
  LUANDA = 'Africa/Luanda',
  ANTANANARIVO = 'Indian/Antananarivo',
  KINSHASA = 'Africa/Kinshasa',
  DAR_ES_SALAAM = 'Africa/Dar_es_Salaam',

  // Antarctica
  MCMURDO = 'Antarctica/McMurdo',
  CASEY = 'Antarctica/Casey',
}

/**
 * Type helper for secondaryTimeZone configuration
 * Allows using either the TimeZone enum or a raw IANA string.
 */
export type TimeZoneValue = TimeZone | string;
