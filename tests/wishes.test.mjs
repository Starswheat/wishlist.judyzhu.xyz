import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mergeWishes, mutateStoredWishes, parseWishes, serializeWishes, validUrl } from '../src/wishes.js';

const item = { id: 'test-wish', title: 'a book', category: 'books', note: '', price: '', url: 'https://example.com/book', image: '', claimed: false, favorite: false };

test('import rejects executable links and embedded login credentials', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'file:///tmp/test', 'https://user:password@example.com']) {
    assert.equal(validUrl(url), false);
    assert.throws(() => parseWishes(JSON.stringify([{ ...item, url }])), /shop link/);
  }
  assert.equal(validUrl('https://example.com/book?size=large'), true);
});

test('image paths are confined to the local gifts directory or web URLs', () => {
  assert.equal(validUrl('/gifts/noguchi.avif', true), true);
  assert.equal(validUrl('/gifts/../../secret', true), false);
  assert.equal(validUrl('//unknown.example/image.jpg', true), false);
});

test('malformed, duplicate, oversized and incorrectly typed imports are rejected', () => {
  assert.throws(() => parseWishes('{no'), /valid json/);
  assert.throws(() => parseWishes(JSON.stringify({ version: 2, wishes: [] })), /wishlist export/);
  assert.throws(() => parseWishes(JSON.stringify([item, item])), /repeats another id/);
  assert.throws(() => parseWishes(JSON.stringify([{ ...item, claimed: 'yes' }])), /invalid claimed/);
  assert.throws(() => parseWishes(JSON.stringify([{ ...item, category: 'secret' }])), /choose a category/);
  assert.throws(() => parseWishes(JSON.stringify(Array.from({ length: 501 }, (_, i) => ({ ...item, id: `item-${i}` })))), /500/);
});

test('an export round trip preserves personal claim and favorite states', () => {
  const result = parseWishes(serializeWishes([{ ...item, claimed: true, favorite: true }]));
  assert.equal(result[0].claimed, true);
  assert.equal(result[0].favorite, true);
  assert.equal(result[0].title, 'a book');
});

test('merging updates matching ids without deleting unrelated wishes', () => {
  const second = { ...item, id: 'second', title: 'a lamp' };
  const merged = mergeWishes([item, second], [{ ...item, note: 'updated' }]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].note, 'updated');
  assert.equal(merged[1].title, 'a lamp');
});

test('all published wishes are valid and local images exist', async () => {
  const items = parseWishes(await readFile(new URL('../src/content/wishes.json', import.meta.url), 'utf8'));
  assert.equal(items.length, 18);
  for (const wish of items) {
    assert.ok(wish.image.startsWith('/gifts/'));
    const bytes = await readFile(new URL(`../public${wish.image}`, import.meta.url));
    assert.ok(bytes.length > 100);
  }
});

test('an edit from a stale tab preserves additions made in another tab', () => {
  let saved = serializeWishes([item]);
  const storage = { getItem: () => saved, setItem: (_key, value) => { saved = value; } };
  const staleTab = [item];
  const newWish = { ...item, id: 'new-wish', title: 'another book' };
  mutateStoredWishes(storage, [item], current => [...current, newWish]);
  mutateStoredWishes(storage, staleTab, current => current.map(wish => wish.id === item.id ? { ...wish, favorite: true } : wish));
  const final = parseWishes(saved);
  assert.equal(final.length, 2);
  assert.equal(final[0].favorite, true);
  assert.equal(final[1].id, 'new-wish');
});

test('an unreadable saved collection is not overwritten by an edit', () => {
  let saved = '{broken';
  const storage = { getItem: () => saved, setItem: (_key, value) => { saved = value; } };
  const result = mutateStoredWishes(storage, [item], current => current.map(wish => ({ ...wish, claimed: true })));
  assert.equal(saved, '{broken');
  assert.equal(result.wishes[0].claimed, true);
  assert.match(result.error, /export a copy/);
});
