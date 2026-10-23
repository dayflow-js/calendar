import { LOCALES as PACKS } from '../../../../plugins/localization/src/locales';
import en from '../locales/en';

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).toSorted();

describe('localization packs', () => {
  const enKeys = Object.keys(en.messages).toSorted();
  const schedulerKeys = new Set(
    Object.values(PACKS).flatMap(pack =>
      Object.keys(pack.packages?.scheduler ?? {})
    )
  );

  it.each(Object.entries(PACKS))('%s has every core message key', (_, pack) => {
    expect(Object.keys(pack.messages).toSorted()).toEqual(enKeys);
  });

  it.each(Object.entries(PACKS))(
    '%s keeps the placeholders of each English message',
    (_, pack) => {
      for (const key of enKeys) {
        const source = en.messages[key as keyof typeof en.messages] ?? '';
        expect([key, placeholders(pack.messages[key])]).toEqual([
          key,
          placeholders(source),
        ]);
      }
    }
  );

  it.each(Object.entries(PACKS))(
    '%s translates the same scheduler keys as the other packs',
    (_, pack) => {
      expect(Object.keys(pack.packages?.scheduler ?? {}).toSorted()).toEqual(
        [...schedulerKeys].toSorted()
      );
    }
  );
});
