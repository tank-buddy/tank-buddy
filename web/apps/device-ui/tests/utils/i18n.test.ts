import { expect, test } from 'vitest'
import de from '../../src/lang/de.json'
import en from '../../src/lang/en.json'
import { t } from '../../src/utils/i18n'

test('translates a known key', () => {
  expect(t('button.save')).toBe(en['button.save'])
})

test('falls back to the key itself when a string is missing', () => {
  expect(t('does.not.exist')).toBe('does.not.exist')
})

test('both languages define exactly the same keys', () => {
  // A missing translation would silently render the raw key in the UI.
  expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort())
})

test('no translation is left empty', () => {
  const empty = Object.entries({ ...de, ...en })
    .filter(([, value]) => value.trim().length === 0)
    .map(([key]) => key)

  expect(empty).toEqual([])
})
