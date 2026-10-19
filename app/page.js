'use client';

import { useEffect, useState } from 'react';
import { CATEGORIES, COLLECTION_LOCATION } from '../lib/constants.js';

export default function TestingPage() {
  const [items, setItems] = useState([]);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('Loading items…');
  const [busy, setBusy] = useState(false);

  async function api(options) {
    const response = await fetch('/api/items', { cache: 'no-store', ...options });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Request failed.');
    return body;
  }
  async function load() {
    const body = await api();
    setItems(body.items);
  }
  useEffect(() => { load().then(() => setMessage('')).catch((error) => setMessage(error.message)); }, []);

  async function create(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    try {
      await api({ method: 'POST', headers: { 'x-staff-password': password }, body: new FormData(form) });
      form.reset();
      setMessage('Item saved.');
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function changeReturned(item) {
    setBusy(true);
    try {
      await api({ method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-staff-password': password },
        body: JSON.stringify({ id: item.id, returned: !item.returned }) });
      setMessage('Returned status saved.');
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <main>
    <h1>FoundIt: School lost and found</h1>
    <p>Collection point: {COLLECTION_LOCATION}.</p>
    <p>Photos are public. Use item-only photos without student faces, names, or ID cards.</p>
    <p><label>Staff password <input type="password" value={password} autoComplete="off" onChange={(e) => setPassword(e.target.value)} /></label></p>
    <h2>Add an item</h2>
    <form onSubmit={create}>
      <p><label>Title <input name="title" required maxLength={100} /></label></p>
      <p><label>Description <textarea name="description" required maxLength={1000} /></label></p>
      <p><label>Category <select name="category">{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label></p>
      <p><label>Date found <input name="date_found" type="date" required /></label></p>
      <p><label>Photo (JPEG, PNG, WebP; at most 2 MiB) <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required /></label></p>
      <button disabled={busy} type="submit">Save item</button>
    </form>
    <p role="status" aria-live="polite">{message}</p>
    <h2>Items, newest first</h2>
    <button disabled={busy} onClick={() => load().then(() => setMessage('Items refreshed.')).catch((error) => setMessage(error.message))}>Refresh items</button>
    {items.length === 0 && <p>No items loaded.</p>}
    {items.map((item) => <article key={item.id}>
      <h3>{item.title}</h3>
      <img src={item.photo_url} alt={item.title} width="240" />
      <p>{item.description}</p>
      <p>{item.category} · Found {item.date_found} · {item.collection_location}</p>
      <p>Status: {item.returned ? 'Returned' : 'Awaiting collection'}</p>
      <button disabled={busy} onClick={() => changeReturned(item)}>Mark {item.returned ? 'not returned' : 'returned'}</button>
    </article>)}
  </main>;
}
