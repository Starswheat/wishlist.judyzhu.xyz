export const CATEGORIES = ['books', 'art', 'home', 'experiences', 'other'];
export const STORAGE_KEY = 'judy-wishlist-v1';
export const MAX_WISHES = 500;

export function validUrl(value, image = false) {
  if (!value) return true;
  if (image && /^\/gifts\/[a-zA-Z0-9._-]+$/.test(value)) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

export function validateWish(wish) {
  const errors = {};
  if (typeof wish.title !== 'string' || !wish.title.trim()) errors.title = 'give this wish a name.';
  else if (wish.title.length > 140) errors.title = 'keep the name under 140 characters.';
  if (!CATEGORIES.includes(wish.category)) errors.category = 'choose a category.';
  if (typeof wish.note !== 'string' || wish.note.length > 2000) errors.note = 'keep your note under 2,000 characters.';
  if (typeof wish.price !== 'string' || wish.price.length > 100) errors.price = 'keep the price under 100 characters.';
  if (typeof wish.url !== 'string' || !validUrl(wish.url.trim())) errors.url = 'use a full http or https shop link.';
  if (typeof wish.image !== 'string' || !validUrl(wish.image.trim(), true)) errors.image = 'use a full http or https image link.';
  if (wish.links !== undefined && (!Array.isArray(wish.links) || wish.links.some(link => !link || typeof link.label !== 'string' || typeof link.url !== 'string' || !validUrl(link.url)))) errors.links = 'each shop link needs a label and a valid web address.';
  return errors;
}

export function normalizeWish(wish) {
  return {
    id: wish.id, title: wish.title.trim(), category: wish.category,
    note: (wish.note || '').trim(), price: (wish.price || '').trim(),
    url: (wish.url || '').trim(), image: (wish.image || '').trim(),
    links: wish.links || [], by: typeof wish.by === 'string' ? wish.by : '',
    favorite: wish.favorite === true, claimed: wish.claimed === true,
    createdAt: typeof wish.createdAt === 'string' && !Number.isNaN(Date.parse(wish.createdAt)) ? wish.createdAt : new Date().toISOString(),
  };
}

export function parseWishes(text) {
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('this file is not valid json. try a wishlist export.'); }
  const items = Array.isArray(value) ? value : value?.version === 1 ? value.wishes : null;
  if (!Array.isArray(items)) throw new Error('use a wishlist export or an array of wishes.');
  if (items.length > MAX_WISHES) throw new Error(`import up to ${MAX_WISHES} wishes at a time.`);
  const seen = new Set();
  return items.map((item, i) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`wish ${i + 1} is not a valid item.`);
    if (typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(item.id)) throw new Error(`wish ${i + 1} needs a valid unique id.`);
    if (seen.has(item.id)) throw new Error(`wish ${i + 1} repeats another id.`);
    seen.add(item.id);
    const candidate = { note: '', price: '', url: '', image: '', ...item };
    const errors = validateWish(candidate);
    if (Object.keys(errors).length) throw new Error(`wish ${i + 1}: ${Object.values(errors)[0]}`);
    for (const flag of ['favorite', 'claimed']) if (flag in item && typeof item[flag] !== 'boolean') throw new Error(`wish ${i + 1} has an invalid ${flag} value.`);
    return normalizeWish(candidate);
  });
}

export function mergeWishes(current, incoming) {
  const next = new Map(current.map(wish => [wish.id, wish]));
  incoming.forEach(wish => next.set(wish.id, wish));
  if (next.size > MAX_WISHES) throw new Error(`keep your collection under ${MAX_WISHES} wishes.`);
  return [...next.values()];
}
export function serializeWishes(wishes) { return JSON.stringify({ version: 1, wishes }, null, 2); }

// Rebase each edit on storage, rather than a tab's possibly stale React state.
// A broken/unavailable store never replaces the user's recoverable stored data.
export function mutateStoredWishes(storage, fallback, update) {
  let current = fallback;
  let readable = true;
  let error = '';
  try {
    const saved = storage.getItem(STORAGE_KEY);
    if (saved !== null) current = parseWishes(saved);
  } catch {
    readable = false;
    error = 'your saved collection could not be updated. export a copy to keep these changes.';
  }
  const wishes = update(current);
  if (readable) {
    try { storage.setItem(STORAGE_KEY, serializeWishes(wishes)); }
    catch { error = 'your browser could not save these changes. export a copy to keep them.'; }
  }
  return { wishes, error };
}
