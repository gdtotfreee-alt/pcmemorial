// Medicine Master - API + cache based medicine template storage
// Uses the server-side database so medicine data is shared across all devices.

export interface MedicineMAEN {
  m: boolean;
  a: boolean;
  e: boolean;
  n: boolean;
}

export interface MedicineTemplate {
  id: string;
  name: string;
  nameHi: string;
  dosage: string;
  dosageHi: string;
  frequency: string;
  duration: string;
  durationHi: string;
  instructions: string;
  instructionsHi: string;
  category: string;
  maen?: MedicineMAEN;
}

// --- In-memory cache for the current session ---
let cache: MedicineTemplate[] | null = null;
let cacheLoading: Promise<MedicineTemplate[]> | null = null;

/** Invalidate the local cache so the next fetch goes to the server. */
export function invalidateMedicineCache(): void {
  cache = null;
}

/**
 * Refresh the cache in the background WITHOUT clearing it first.
 * The old data keeps serving search results until the new data has
 * actually arrived, so search never sees an empty list mid-refresh.
 */
export async function refreshMedicineTemplatesInBackground(): Promise<void> {
  try {
    const res = await fetch('/api/medicines?limit=50000');
    if (res.ok) {
      const data = await res.json();
      cache = data.medicines || [];
    }
  } catch {
    // Network hiccup — keep serving the existing cache.
  }
}

/** Fetch all medicine templates from the server (with cache). */
export async function getMedicineTemplates(): Promise<MedicineTemplate[]> {
  if (cache) return cache;
  if (cacheLoading) return cacheLoading;

  cacheLoading = _fetchMedicines().finally(() => { cacheLoading = null; });
  return cacheLoading;
}

async function _fetchMedicines(): Promise<MedicineTemplate[]> {
  try {
    const res = await fetch('/api/medicines?limit=50000');
    if (res.ok) {
      const data = await res.json();
      cache = data.medicines || [];
    } else {
      cache = [];
    }
  } catch {
    cache = [];
  }
  return cache;
}

/** Save (upsert) a medicine template via the API and refresh cache. */
export async function saveMedicineTemplates(templates: MedicineTemplate[]): Promise<void> {
  // This is a bulk-replace used during backup import.
  // We delete all existing and recreate.
  try {
    // Fetch existing IDs
    const existing = await getMedicineTemplates();
    const existingIds = new Set(existing.map(t => t.id));

    // Delete medicines not in the new set
    for (const id of existingIds) {
      if (!templates.find(t => t.id === id)) {
        await fetch(`/api/medicines/${id}`, { method: 'DELETE' });
      }
    }

    // Upsert each template
    for (const template of templates) {
      const isNew = !existingIds.has(template.id);
      const method = isNew ? 'POST' : 'PUT';
      await fetch('/api/medicines', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });
    }

    // Refresh cache
    invalidateMedicineCache();
    await getMedicineTemplates();
  } catch (err) {
    console.error('Failed to save medicine templates:', err);
  }
}

/** Add a new medicine template via the API. */
export async function addMedicineTemplate(template: Omit<MedicineTemplate, 'id'>): Promise<MedicineTemplate> {
  const res = await fetch('/api/medicines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  });
  if (!res.ok) throw new Error('Failed to add medicine');
  const created = await res.json();

  // Update cache
  if (cache) {
    cache.unshift(created);
  }

  return created;
}

/** Update a medicine template via the API. */
export async function updateMedicineTemplate(id: string, updates: Partial<MedicineTemplate>): Promise<MedicineTemplate | null> {
  const res = await fetch('/api/medicines', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  });
  if (!res.ok) return null;
  const updated = await res.json();

  // Update cache
  if (cache) {
    const index = cache.findIndex(t => t.id === id);
    if (index !== -1) cache[index] = updated;
  }

  return updated;
}

/** Delete a medicine template via the API. */
export async function deleteMedicineTemplate(id: string): Promise<boolean> {
  const res = await fetch(`/api/medicines/${id}`, { method: 'DELETE' });
  if (!res.ok) return false;

  // Update cache
  if (cache) {
    cache = cache.filter(t => t.id !== id);
  }

  return true;
}

/** Search medicine templates (uses cache). */
export function searchMedicineTemplates(query: string): MedicineTemplate[] {
  if (!cache) return [];
  if (!query.trim()) return cache.slice(0, 30);
  const s = query.toLowerCase();
  return cache.filter(
    (t) =>
      t.name.toLowerCase().includes(s) ||
      t.nameHi.toLowerCase().includes(s) ||
      t.category.toLowerCase().includes(s) ||
      t.dosage.toLowerCase().includes(s) ||
      t.instructions.toLowerCase().includes(s)
  ).slice(0, 20);
}
/** Get the full, unfiltered, uncapped list of cached medicine templates — for full listing pages. */
export function getAllMedicineTemplates(): MedicineTemplate[] {
  return cache ? [...cache] : [];
}

/** Search medicine templates with no result cap — for full listing pages (not the autocomplete dropdown). */
export function searchMedicineTemplatesUnlimited(query: string): MedicineTemplate[] {
  if (!cache) return [];
  if (!query.trim()) return cache;
  const s = query.toLowerCase();
  return cache.filter(
    (t) =>
      t.name.toLowerCase().includes(s) ||
      t.nameHi.toLowerCase().includes(s) ||
      t.category.toLowerCase().includes(s) ||
      t.dosage.toLowerCase().includes(s) ||
      t.instructions.toLowerCase().includes(s)
  );
}

/** Get unique categories from the cache. */
export function getMedicineCategories(): string[] {
  if (!cache) return [];
  const categories = new Set(cache.map((t) => t.category).filter(Boolean));
  return Array.from(categories).sort();
}

/** Get the count of medicine templates in cache. */
export function getMedicineCount(): number {
  return cache?.length || 0;
}

/**
 * Migrate any existing localStorage data to the server database.
 * Called once on app startup. Returns the number of medicines migrated.
 */
export async function migrateLocalStorageToServer(): Promise<number> {
  if (typeof window === 'undefined') return 0;

  const STORAGE_KEY = 'pcm-medicine-master';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return 0;
    const localMedicines: MedicineTemplate[] = JSON.parse(stored);
    if (!Array.isArray(localMedicines) || localMedicines.length === 0) return 0;

    // Check if server already has data
    const res = await fetch('/api/medicines?limit=1');
    if (res.ok) {
      const data = await res.json();
      if (data.total > 0) {
        // Server already has data, don't overwrite — just clear localStorage
        localStorage.removeItem(STORAGE_KEY);
        return 0;
      }
    }

    // Server is empty — migrate localStorage data
    let migrated = 0;
    for (const med of localMedicines) {
      const postRes = await fetch('/api/medicines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(med),
      });
      if (postRes.ok) migrated++;
    }

    // Clear localStorage after successful migration
    if (migrated > 0) {
      localStorage.removeItem(STORAGE_KEY);
    }

    // Refresh cache
    invalidateMedicineCache();
    await getMedicineTemplates();

    return migrated;
  } catch {
    return 0;
  }
}