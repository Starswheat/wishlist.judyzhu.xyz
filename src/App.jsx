import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, DownloadSimple, Heart, MagnifyingGlass, PencilSimple, Plus, Trash, UploadSimple, X } from '@phosphor-icons/react';
import seedWishes from './content/wishes.json';
import { CATEGORIES, MAX_WISHES, STORAGE_KEY, mergeWishes, normalizeWish, parseWishes, serializeWishes, validateWish } from './wishes.js';

const blank = { title: '', category: 'books', note: '', price: '', url: '', image: '' };
function readInitial() {
  try { return { wishes: parseWishes(localStorage.getItem(STORAGE_KEY) ?? JSON.stringify(seedWishes)), error: '' }; }
  catch { return { wishes: parseWishes(JSON.stringify(seedWishes)), error: 'your saved collection could not be opened. import a backup to restore it.' }; }
}

function Modal({ title, children, onClose, className = '' }) {
  const ref = useRef(null); const titleId = useId();
  useEffect(() => {
    const dialog = ref.current; const previous = document.activeElement;
    dialog.showModal();
    const cancel = event => { event.preventDefault(); onClose(); };
    dialog.addEventListener('cancel', cancel);
    return () => { dialog.removeEventListener('cancel', cancel); dialog.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={`dialog ${className}`} aria-labelledby={titleId} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div className="dialog-inner">
    <header className="dialog-header"><h2 id={titleId}>{title}</h2><button className="icon-button" aria-label="close dialog" onClick={onClose}><X size={20} /></button></header>{children}
  </div></dialog>;
}

function WishForm({ wish, onSave, onClose }) {
  const [fields, setFields] = useState(wish ?? blank); const [errors, setErrors] = useState({});
  function update(event) { const { name, value } = event.target; setFields(previous => ({ ...previous, [name]: value })); setErrors(previous => ({ ...previous, [name]: '' })); }
  function submit(event) {
    event.preventDefault(); const nextErrors = validateWish(fields); setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { event.currentTarget.querySelector(`[name="${Object.keys(nextErrors)[0]}"]`)?.focus(); return; }
    const links = (fields.links || []).filter(link => link.url !== wish?.url);
    onSave(normalizeWish({ ...fields, links, id: wish?.id ?? crypto.randomUUID(), createdAt: wish?.createdAt ?? new Date().toISOString() }));
  }
  const error = name => errors[name] && <span className="field-error" id={`${name}-error`}>{errors[name]}</span>;
  return <Modal title={wish ? 'edit wish' : 'add a little wish'} onClose={onClose}><form onSubmit={submit} noValidate>
    <label className="field">name <span className="optional">required</span><input autoFocus name="title" value={fields.title} onChange={update} maxLength={140} placeholder="what caught your eye?" aria-invalid={!!errors.title} aria-describedby={errors.title ? 'title-error' : undefined} />{error('title')}</label>
    <div className="field-row"><label className="field">category<select name="category" value={fields.category} onChange={update}>{CATEGORIES.map(category => <option key={category}>{category}</option>)}</select>{error('category')}</label><label className="field">price <span className="optional">optional</span><input name="price" value={fields.price} onChange={update} maxLength={100} placeholder="e.g. $25" aria-invalid={!!errors.price} />{error('price')}</label></div>
    <label className="field">a note <span className="optional">optional</span><textarea name="note" value={fields.note} onChange={update} maxLength={2000} rows={3} placeholder="a detail to remember, a size, or why you love it" aria-invalid={!!errors.note} />{error('note')}</label>
    <label className="field">shop link <span className="optional">optional</span><input type="url" name="url" value={fields.url} onChange={update} placeholder="https://" aria-invalid={!!errors.url} aria-describedby={errors.url ? 'url-error' : undefined} />{error('url')}</label>
    <label className="field">image link <span className="optional">optional</span><input type="url" name="image" value={fields.image} onChange={update} placeholder="https://" aria-invalid={!!errors.image} aria-describedby={errors.image ? 'image-error' : undefined} />{error('image')}</label>
    <footer className="form-footer"><p>saved in this browser</p><button type="button" className="button button-quiet" onClick={onClose}>cancel</button><button className="button button-primary" type="submit">{wish ? 'save changes' : 'add wish'}<Plus size={16} /></button></footer>
  </form></Modal>;
}

function WishImage({ wish, className = '' }) {
  const [failed, setFailed] = useState(false); useEffect(() => setFailed(false), [wish.image]);
  if (!wish.image || failed) return null;
  const imageSource = wish.image.startsWith('/gifts/') ? `${import.meta.env.BASE_URL}${wish.image.slice(1)}` : wish.image;
  return <img className={className} src={imageSource} alt={wish.title} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

function WishDetail({ wish, onClose, onEdit, onToggle, onDelete }) {
  const links = [{ label: 'visit shop', url: wish.url }, ...(wish.links || []).filter(link => link.url !== wish.url)].filter(link => link.url);
  return <Modal title={wish.title.toLowerCase()} onClose={onClose} className="detail-dialog">
    <WishImage wish={wish} className="detail-image" /><div className="detail-meta"><span>{wish.category}</span>{wish.price && <span>{wish.price}</span>}</div>
    {wish.note && <p className="detail-note">{wish.note}</p>}
    <div className="detail-actions">{links.map(link => <a key={link.url} className="button button-primary" href={link.url} target="_blank" rel="noopener noreferrer">{link.label.toLowerCase()}<ArrowUpRight size={16} /></a>)}
      <button className={`button ${wish.claimed ? 'button-selected' : 'button-quiet'}`} onClick={() => onToggle(wish.id, 'claimed')}><Check size={17} />{wish.claimed ? 'claimed' : 'mark as claimed'}</button>
      <button className={`icon-button ${wish.favorite ? 'is-favorite' : ''}`} aria-label={wish.favorite ? 'remove from favorites' : 'add to favorites'} aria-pressed={wish.favorite} onClick={() => onToggle(wish.id, 'favorite')}><Heart size={21} weight={wish.favorite ? 'fill' : 'regular'} /></button>
    </div>
    {wish.claimed && <button className="text-button undo-claim" onClick={() => onToggle(wish.id, 'claimed')}>undo claim</button>}
    <p className="local-note">just for fun: claims stay in this browser and do not reserve a gift.</p>
    <div className="detail-bottom"><button className="text-button" onClick={() => onEdit(wish)}><PencilSimple size={17} />edit wish</button><button className="text-button delete-button" onClick={() => onDelete(wish)}><Trash size={17} />delete wish</button></div>
  </Modal>;
}

function ImportDialog({ current, onImport, onClose }) {
  const [incoming, setIncoming] = useState(null); const [filename, setFilename] = useState(''); const [error, setError] = useState('');
  async function choose(event) {
    const file = event.target.files?.[0]; setError(''); setIncoming(null); if (!file) return; setFilename(file.name);
    if (file.size > 2_000_000) { setError('choose a json file smaller than 2 mb.'); return; }
    try { const items = parseWishes(await file.text()); mergeWishes(current, items); setIncoming(items); }
    catch (e) { setError(e.message || 'this file could not be opened.'); }
  }
  const updated = incoming?.filter(wish => current.some(item => item.id === wish.id)).length ?? 0;
  return <Modal title="bring your wishes along" onClose={onClose}>
    <p className="dialog-description">choose a wishlist export. existing wishes stay unless the imported file updates the same wish.</p>
    <label className="import-picker"><UploadSimple size={26} /><span>choose a json file</span><input type="file" accept="application/json,.json" onChange={choose} autoFocus /></label>
    {filename && <p className="filename">{filename}</p>}{error && <p className="field-error" role="alert">{error}</p>}
    {incoming && <p className="import-summary">{incoming.length - updated} new wishes · {updated} updates</p>}
    <div className="form-footer"><button className="button button-quiet" onClick={onClose}>cancel</button><button className="button button-primary" disabled={!incoming?.length} onClick={() => onImport(incoming)}>import wishes<UploadSimple size={16} /></button></div>
  </Modal>;
}

export function App() {
  const [initial] = useState(readInitial); const [wishes, setWishes] = useState(initial.wishes); const [storageError, setStorageError] = useState(initial.error);
  const [category, setCategory] = useState('all'); const [query, setQuery] = useState(''); const [status, setStatus] = useState('all');
  const [modal, setModal] = useState(null); const [toast, setToast] = useState(null); const [hasChanged, setHasChanged] = useState(false); const timer = useRef(null);
  useEffect(() => { if (!hasChanged) return; try { localStorage.setItem(STORAGE_KEY, serializeWishes(wishes)); setStorageError(''); } catch { setStorageError('your browser could not save these changes. export a copy to keep them.'); } }, [wishes, hasChanged]);
  useEffect(() => () => clearTimeout(timer.current), []);
  function notify(message, undo) { clearTimeout(timer.current); setToast({ message, undo }); if (!undo) timer.current = setTimeout(() => setToast(null), 4500); }
  function change(next) { setHasChanged(true); setWishes(next); }
  function save(wish) {
    const existing = wishes.some(item => item.id === wish.id);
    if (!existing && wishes.length >= MAX_WISHES) { notify(`your collection can hold up to ${MAX_WISHES} wishes.`); return; }
    change(existing ? wishes.map(item => item.id === wish.id ? wish : item) : [wish, ...wishes]); setModal(null); notify(existing ? 'wish updated.' : 'a little wish, saved.');
  }
  function toggle(id, key) { change(wishes.map(wish => wish.id === id ? { ...wish, [key]: !wish[key] } : wish)); }
  function remove(wish) {
    const index = wishes.findIndex(item => item.id === wish.id); change(wishes.filter(item => item.id !== wish.id)); setModal(null);
    notify('wish removed.', () => { setHasChanged(true); setWishes(current => { if (current.some(item => item.id === wish.id)) return current; const next = [...current]; next.splice(Math.min(index, next.length), 0, wish); return next; }); notify('wish restored.'); });
  }
  function exportFile() {
    const url = URL.createObjectURL(new Blob([serializeWishes(wishes)], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'judys-wishlist.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notify('your wishlist export is ready.');
  }
  const active = modal?.type === 'detail' ? wishes.find(wish => wish.id === modal.id) : null;
  const filtered = wishes.filter(wish => (category === 'all' || wish.category === category) && (status === 'all' || status === 'favorite' && wish.favorite || status === 'claimed' && wish.claimed || status === 'open' && !wish.claimed) && `${wish.title} ${wish.note} ${wish.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  const openCount = wishes.filter(wish => !wish.claimed).length;
  return <>
    <a className="skip-link" href="#main">skip to wishlist</a><div className="page-shell">
    <header className="site-header"><a className="back-link" href="https://judyzhu.xyz"><ArrowLeft size={16} /><span>back to judy</span></a><span className="header-note">a small personal project</span></header>
    <main id="main"><section className="intro" aria-labelledby="page-title"><div><p className="eyebrow">things to look forward to</p><h1 id="page-title">judy’s wishlist<span className="title-dot">.</span></h1><p className="intro-description">a little place for things i’d love.<br />books, beautiful objects, and new experiences.</p></div><button className="button glass-action" onClick={() => setModal({ type: 'add' })}><Plus size={18} />add a wish</button></section>
      <div className="collection-bar"><p><span>{wishes.length}</span> {wishes.length === 1 ? 'wish' : 'wishes'}<span className="count-separator">/</span>{openCount} still open</p><span className="local-indicator" title="claims only affect this browser. no gift is reserved.">saved in this browser</span></div>
      {storageError && <p className="storage-warning" role="alert">{storageError}</p>}
      <section className="collection" aria-label="your wishlist"><div className="collection-tools">
        <div className="filters" role="group" aria-label="filter by category">{['all', ...CATEGORIES].map(item => <button key={item} className={`filter ${category === item ? 'active' : ''}`} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
        <div className="search-controls"><label className="search"><MagnifyingGlass size={18} /><input type="search" placeholder="find a wish" aria-label="search wishes" value={query} onChange={event => setQuery(event.target.value)} /></label><label className="status-filter"><span className="sr-only">filter by status</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="all">all wishes</option><option value="open">still open</option><option value="favorite">favorites</option><option value="claimed">claimed</option></select></label></div>
      </div>
      {!wishes.length ? <div className="empty-state"><Heart size={30} weight="light" /><h2>a little room for wishing.</h2><p>nothing here just yet.<br />start with something that caught your eye.</p><button className="text-button" onClick={() => setModal({ type: 'add' })}>add your first wish<Plus size={16} /></button></div>
      : !filtered.length ? <div className="empty-state"><MagnifyingGlass size={28} weight="light" /><h2>no wishes found.</h2><p>try another word or a different category.</p><button className="text-button" onClick={() => { setCategory('all'); setStatus('all'); setQuery(''); }}>clear filters</button></div>
      : <div className="wish-grid">{filtered.map(wish => <article className={`wish-card ${wish.claimed ? 'claimed' : ''}`} key={wish.id}>
        <button className="wish-open" onClick={() => setModal({ type: 'detail', id: wish.id })} aria-label={`view ${wish.title}`}><WishImage wish={wish} className="wish-image" /><div className="wish-copy"><div className="wish-meta"><span>{wish.category}</span>{wish.claimed && <span className="claimed-tag"><Check size={13} />claimed</span>}</div><h2>{wish.title}</h2>{wish.note && <p>{wish.note}</p>}</div></button>
        <div className="wish-footer"><span>{wish.price || wish.by || 'a little wish'}</span><div><button className={`icon-button ${wish.favorite ? 'is-favorite' : ''}`} aria-label={`${wish.favorite ? 'unfavorite' : 'favorite'} ${wish.title}`} aria-pressed={wish.favorite} onClick={() => toggle(wish.id, 'favorite')}><Heart size={19} weight={wish.favorite ? 'fill' : 'regular'} /></button><button className="icon-button" aria-label={`edit ${wish.title}`} onClick={() => setModal({ type: 'edit', wish })}><PencilSimple size={18} /></button></div></div>
      </article>)}</div>}</section>
      <div className="collection-bottom"><p>your wishes, at your own pace.</p><div><button className="text-button" onClick={() => setModal({ type: 'import' })}><UploadSimple size={16} />import</button><button className="text-button" onClick={exportFile} disabled={!wishes.length}><DownloadSimple size={16} />export</button></div></div>
    </main><footer className="site-footer"><p>made by <a href="https://judyzhu.xyz">judy xīngyǐng</a></p><p>claims are just for fun and stay in this browser.</p></footer></div>
    {modal?.type === 'add' && <WishForm onSave={save} onClose={() => setModal(null)} />}{modal?.type === 'edit' && <WishForm wish={modal.wish} onSave={save} onClose={() => setModal(null)} />}
    {active && <WishDetail wish={active} onClose={() => setModal(null)} onEdit={wish => setModal({ type: 'edit', wish })} onToggle={toggle} onDelete={remove} />}
    {modal?.type === 'import' && <ImportDialog current={wishes} onClose={() => setModal(null)} onImport={incoming => { change(mergeWishes(wishes, incoming)); setModal(null); notify(`${incoming.length} ${incoming.length === 1 ? 'wish' : 'wishes'} imported.`); }} />}
    <div className="toast-region" aria-live="polite" aria-atomic="true">{toast && <div className="toast"><span>{toast.message}</span>{toast.undo && <button onClick={toast.undo}>undo</button>}<button className="toast-close" aria-label="dismiss notification" onClick={() => setToast(null)}><X size={15} /></button></div>}</div>
  </>;
}
