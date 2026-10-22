'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CATEGORIES,
  COLLECTION_LOCATION,
  MAX_PHOTO_BYTES,
} from '../lib/constants.js';

function Icon({ name, size = 18 }) {
  const paths = {
    school: (
      <>
        <path d="m3 10 9-7 9 7v11H3Z" />
        <path d="M9 21v-7h6v7M6 11v3m12-3v3M12 7v3" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
      </>
    ),
    pin: (
      <>
        <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2m-8 3h2" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    back: <path d="M19 12H5m6-6-6 6 6 6" />,
    diagonal: <path d="M6 18 18 6M7 6h11v11" />,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    box: (
      <>
        <path d="m12 2 9 5v10l-9 5-9-5V7Zm0 10v10M3 7l9 5 9-5M7 4l10 6" />
      </>
    ),
    shield: (
      <>
        <path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8" cy="8" r="1.5" />
        <path d="m3 17 6-6 4 4 3-3 5 5" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.box}
    </svg>
  );
}
const formatDate = (value) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date not set';
function Badge({ returned }) {
  return (
    <span className={`badge${returned ? ' returned' : ''}`}>
      <span aria-hidden="true">•</span>{' '}
      {returned ? 'Returned' : 'Awaiting collection'}
    </span>
  );
}
function Photo({ src, title, className = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? (
    <img
      className={className}
      src={src}
      alt={title}
      onError={() => setFailed(true)}
    />
  ) : (
    <div className={`photo-placeholder ${className}`}>
      <Icon name="image" size={32} />
      <span>{src ? 'Photo unavailable' : 'Add an item photo'}</span>
    </div>
  );
}
function ItemCard({ item, preview = false }) {
  const content = (
    <>
      <Photo
        src={item.photo_url}
        title={item.title || 'Item preview'}
        className="card-photo"
      />
      <div className="item-details">
        <div className="item-meta">
          <span>{item.category}</span>
          <Badge returned={item.returned} />
        </div>
        <h3>{item.title || 'Your item name'}</h3>
        {preview ? (
          <p className="preview-description">
            {item.description || 'Your public description will appear here.'}
          </p>
        ) : (
          <>
            <p className="preview-description">{item.description}</p>
            <p className="item-location">
              <Icon name="pin" size={14} />
              {item.collection_location}
            </p>
          </>
        )}
        <div className="item-bottom">
          <span>Found {formatDate(item.date_found)}</span>
        </div>
      </div>
    </>
  );
  return (
    <article className={`item-card${preview ? ' preview-card' : ''}`}>
      {content}
    </article>
  );
}

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [view, setView] = useState('browse');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All items');
  const [sort, setSort] = useState('newest');
  const [showReturned, setShowReturned] = useState(true);
  const [draft, setDraft] = useState({
    title: '',
    category: CATEGORIES[0],
    description: '',
    date_found: '',
  });
  const [photo, setPhoto] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const fileInput = useRef(null);
  const mainRef = useRef(null);

  useEffect(() => {
    if (!photo) {
      setPhotoUrl('');
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  useEffect(() => {
    const sync = () => {
      const [page] = window.location.hash.slice(1).split('/');
      setView(['post', 'staff'].includes(page) ? page : 'browse');
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  function navigate(page) {
    setView(page);
    setMessage('');
    window.location.hash = page;
    window.scrollTo({ top: 0, behavior: 'instant' });
    mainRef.current?.focus({ preventScroll: true });
  }
  async function api(options) {
    const response = await fetch('/api/items', {
      cache: 'no-store',
      ...options,
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Request failed.');
    return body;
  }
  async function load() {
    setLoading(true);
    setError('');
    try {
      const body = await api();
      setItems(body.items);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function create(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    if (!photo || photo.size > MAX_PHOTO_BYTES) {
      setError('Choose a JPEG, PNG or WebP photo smaller than 2 MiB.');
      return;
    }
    const data = new FormData();
    for (const [key, value] of Object.entries(draft)) data.set(key, value);
    data.set('photo', photo);
    setBusy(true);
    try {
      const body = await api({
        method: 'POST',
        headers: { 'x-staff-password': password },
        body: data,
      });
      setItems((items) => [body.item, ...items]);
      setDraft({
        title: '',
        category: CATEGORIES[0],
        description: '',
        date_found: '',
      });
      setPhoto(null);
      navigate('browse');
      setMessage('Item added to the lost and found.');
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function changeReturned(item) {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const body = await api({
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-password': password,
        },
        body: JSON.stringify({ id: item.id, returned: !item.returned }),
      });
      setItems((items) =>
        items.map((existing) =>
          existing.id === item.id ? body.item : existing,
        ),
      );
      setMessage(
        `${item.title} marked as ${body.item.returned ? 'returned' : 'awaiting collection'}.`,
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  function choosePhoto(event) {
    const next = event.target.files?.[0];
    if (!next) return;
    if (
      next.size > MAX_PHOTO_BYTES ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(next.type)
    ) {
      setError('Choose a JPEG, PNG or WebP photo smaller than 2 MiB.');
      event.target.value = '';
      return;
    }
    setError('');
    setPhoto(next);
  }
  const updateDraft = (event) =>
    setDraft((draft) => ({
      ...draft,
      [event.target.name]: event.target.value,
    }));
  const visibleItems = items
    .filter(
      (item) =>
        (showReturned || !item.returned) &&
        (category === 'All items' || item.category === category) &&
        `${item.title} ${item.description} ${item.collection_location}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.title.localeCompare(b.title)
        : sort === 'oldest'
          ? a.created_at.localeCompare(b.created_at)
          : b.created_at.localeCompare(a.created_at),
    );
  const passwordField = (
    <label className="password-field">
      Staff password
      <input
        type="password"
        value={password}
        autoComplete="off"
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Enter your staff password"
        required
      />
      <span className="help">Required to post items or record a return.</span>
    </label>
  );

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a
            className="brand"
            href="#browse"
            onClick={() => navigate('browse')}
          >
            <span className="brand-icon">
              <Icon name="school" size={26} />
            </span>
            <span>
              <small>FOUNDIT · SCHOOL CAMPUS</small>
              <strong>Lost &amp; found</strong>
            </span>
          </a>
          <nav aria-label="Main navigation">
            <a
              href="#browse"
              className={view === 'browse' ? 'active' : ''}
              onClick={() => navigate('browse')}
            >
              Browse items
            </a>
            <a
              href="#post"
              className={view === 'post' ? 'active' : ''}
              onClick={() => navigate('post')}
            >
              Post a found item
            </a>
          </nav>
          <a
            className={`staff-link ${view === 'staff' ? 'active' : ''}`}
            href="#staff"
            onClick={() => navigate('staff')}
          >
            <Icon name="lock" />
            <span>{view === 'staff' ? 'Staff workspace' : 'Staff panel'}</span>
          </a>
        </div>
      </header>
      <div className="campus-strip">
        <div className="container">
          <strong>SCHOOL CAMPUS</strong>
          <span>Helping lost things find their way home.</span>
        </div>
      </div>
      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        className={`container page-${view}`}
      >
        {error && (
          <div className="notice error" role="alert">
            {error}
            <button
              className="text-button"
              onClick={load}
              disabled={loading || busy}
            >
              Retry loading items
            </button>
          </div>
        )}
        <div role="status" aria-live="polite">
          {message && <p className="notice">{message}</p>}
        </div>
        {view === 'browse' && (
          <section aria-label="Found items" aria-busy={loading}>
            <div className="page-heading">
              <div>
                <h1>Lost something? Start here.</h1>
                <p>
                  Browse what’s been found around campus. A familiar item could
                  be yours.
                </p>
              </div>
              <button onClick={() => navigate('post')}>
                <Icon name="plus" />
                Post a found item
              </button>
            </div>
            <div className="search-row">
              <label className="search-field">
                <span className="sr-only">Search items</span>
                <Icon name="search" />
                <input
                  type="search"
                  placeholder="Search items, descriptions or collection locations"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label>
                <span className="sr-only">Sort items</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Name A–Z</option>
                </select>
              </label>
            </div>
            <div
              className="category-filters"
              role="group"
              aria-label="Filter by category"
            >
              {['All items', ...CATEGORIES].map((name) => (
                <button
                  key={name}
                  className={`chip ${category === name ? 'selected' : ''}`}
                  aria-pressed={category === name}
                  onClick={() => setCategory(name)}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="list-options">
              <h2>
                {loading
                  ? 'Loading items…'
                  : `${visibleItems.length} found ${visibleItems.length === 1 ? 'item' : 'items'}`}
              </h2>
              <p>
                <Icon name="lock" size={14} />
                Items can be collected from {COLLECTION_LOCATION}.
              </p>
            </div>
            {loading ? (
              <div className="item-grid" aria-hidden="true">
                {[1, 2, 3, 4, 5, 6].map((key) => (
                  <div className="skeleton" key={key}>
                    <div />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            ) : (
              <div className="item-grid">
                {visibleItems.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
            {!loading && !error && !visibleItems.length && (
              <div className="empty-state">
                <Icon name="box" size={36} />
                <h2>
                  {items.length ? 'No matching items' : 'Nothing here yet'}
                </h2>
                <p>
                  {items.length
                    ? 'Try another search or category.'
                    : 'Found items will appear here when staff add them.'}
                </p>
                {items.length > 0 && (
                  <button
                    className="secondary"
                    onClick={() => {
                      setSearch('');
                      setCategory('All items');
                      setShowReturned(true);
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
            <div className="browse-bottom">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showReturned}
                  onChange={(event) => setShowReturned(event.target.checked)}
                />
                Include returned items
              </label>
              <button
                className="text-button"
                disabled={loading || busy}
                onClick={load}
              >
                Refresh items
              </button>
            </div>
            {!loading && visibleItems.length > 0 && (
              <p className="end-note">
                <Icon name="check" size={15} />
                You’re all caught up. These are all the matching items.
              </p>
            )}
          </section>
        )}
        {view === 'post' && (
          <>
            <button className="back-link" onClick={() => navigate('browse')}>
              <Icon name="back" size={16} />
              Browse items
            </button>
            <div className="page-heading">
              <div>
                <h1>Post a found item</h1>
                <p>
                  Help it find its way back. Share a clear photo and a
                  description of what was found.
                </p>
              </div>
            </div>
            <div className="post-layout">
              <form onSubmit={create}>
                <fieldset disabled={busy}>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>Public information</h2>
                      <span>* Required</span>
                    </div>
                    <label htmlFor="item-photo">Item photo *</label>
                    <div className="upload-box">
                      {photo && <Photo src={photoUrl} title="Selected item" />}
                      <div>
                        <strong>
                          {photo
                            ? photo.name
                            : 'Choose a photo of the found item'}
                        </strong>
                        <p className="help">
                          {photo
                            ? `${(photo.size / 1024 / 1024).toFixed(2)} MiB · Photo added`
                            : 'JPEG, PNG or WebP · Up to 2 MiB'}
                        </p>
                        <input
                          id="item-photo"
                          ref={fileInput}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={choosePhoto}
                          aria-describedby="photo-help"
                        />
                        {photo && (
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => {
                              setPhoto(null);
                              if (fileInput.current)
                                fileInput.current.value = '';
                            }}
                          >
                            Remove photo
                          </button>
                        )}
                      </div>
                    </div>
                    <p id="photo-help" className="help">
                      Show only the item, without student faces, names or ID
                      cards.
                    </p>
                    <div className="form-grid">
                      <label>
                        Item name *
                        <input
                          name="title"
                          value={draft.title}
                          onChange={updateDraft}
                          placeholder="e.g. Canvas tote bag"
                          required
                          maxLength={100}
                        />
                      </label>
                      <label>
                        Category *
                        <select
                          name="category"
                          value={draft.category}
                          onChange={updateDraft}
                        >
                          {CATEGORIES.map((name) => (
                            <option key={name}>{name}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Date found *
                        <input
                          name="date_found"
                          type="date"
                          value={draft.date_found}
                          onChange={updateDraft}
                          required
                        />
                      </label>
                      <label>
                        Collection point
                        <input value={COLLECTION_LOCATION} readOnly />
                      </label>
                      <label className="full-width">
                        Public description *
                        <textarea
                          name="description"
                          value={draft.description}
                          onChange={updateDraft}
                          placeholder="Describe the item and where it was found."
                          required
                          maxLength={1000}
                          rows={4}
                        />
                        <span className="help">
                          Visible to everyone. Leave out private identifying
                          details.
                        </span>
                      </label>
                    </div>
                  </section>
                  <section className="panel staff-access">
                    <h2>
                      <Icon name="lock" />
                      Staff access
                    </h2>
                    <p>Only school staff can publish found items.</p>
                    {passwordField}
                  </section>
                  <div className="form-actions">
                    <p className="help">
                      Your item will appear in Browse after posting.
                    </p>
                    <button
                      type="submit"
                      disabled={busy || !password.trim() || !photo}
                    >
                      <Icon name="plus" />
                      {busy ? 'Posting…' : 'Post found item'}
                    </button>
                  </div>
                </fieldset>
              </form>
              <aside>
                <section className="panel preview-panel">
                  <h3>
                    <Icon name="eye" size={16} />
                    What everyone will see
                  </h3>
                  <ItemCard
                    preview
                    item={{
                      ...draft,
                      photo_url: photoUrl,
                      collection_location: COLLECTION_LOCATION,
                      returned: false,
                    }}
                  />
                </section>
                <div className="callout">
                  <Icon name="shield" />
                  <div>
                    <strong>Keep the proof out of sight</strong>
                    <p>
                      Check both your photo and public description. Keep names
                      and unique identifying details out of public view.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
        {view === 'staff' && (
          <>
            <div className="page-heading">
              <div>
                <h1>Pickup &amp; returns</h1>
                <p>
                  Manage found items and record collection after an item has
                  been returned.
                </p>
              </div>
              <span className="workspace-label">
                <Icon name="shield" />
                Staff workspace
              </span>
            </div>
            <div className="stats">
              {[
                ['box', items.length, 'Total items'],
                [
                  'pin',
                  items.filter((item) => !item.returned).length,
                  'Awaiting collection',
                ],
                [
                  'check',
                  items.filter((item) => item.returned).length,
                  'Returned',
                ],
              ].map(([icon, count, label]) => (
                <div className="stat panel" key={label}>
                  <span className="stat-icon">
                    <Icon name={icon} size={22} />
                  </span>
                  <div>
                    <strong>{loading ? '—' : count}</strong>
                    <span>{label}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="staff-layout staff-layout-single">
              <section className="panel">
                <h2>
                  <Icon name="lock" />
                  Staff tools
                </h2>
                <p className="muted">
                  Enter the staff password to post items or record collection.
                </p>
                {passwordField}
                <button className="secondary" onClick={() => navigate('post')}>
                  <Icon name="plus" />
                  Post a found item
                </button>
              </section>
            </div>
            <div className="section-heading">
              <h2>Pickup &amp; returns</h2>
              <button
                className="text-button"
                onClick={load}
                disabled={loading || busy}
              >
                {loading ? 'Loading…' : 'Refresh items'}
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Collection point</th>
                    <th>Status</th>
                    <th>Collection</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="table-item">
                          <Photo src={item.photo_url} title={item.title} />
                          <span>
                            <strong>{item.title}</strong>
                            <small>{item.category}</small>
                          </span>
                        </div>
                      </td>
                      <td>{item.collection_location}</td>
                      <td>
                        <Badge returned={item.returned} />
                      </td>
                      <td>
                        <button
                          className="secondary"
                          disabled={busy || !password.trim()}
                          onClick={() => changeReturned(item)}
                        >
                          <Icon
                            name={item.returned ? 'back' : 'check'}
                            size={16}
                          />
                          {item.returned
                            ? 'Mark not returned'
                            : 'Mark returned'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!items.length && (
                <div className="empty-state">
                  <p>
                    {loading ? 'Loading items…' : 'No items to manage yet.'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
      <footer>
        <div className="container">
          <span>FoundIt · School lost &amp; found</span>
          <span>Collection point: {COLLECTION_LOCATION}</span>
          <span>Found items are managed by school staff.</span>
        </div>
      </footer>
    </>
  );
}
