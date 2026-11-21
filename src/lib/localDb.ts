import type {
  ChapterContent,
  ListeningProgress,
  Playlist,
  Story,
  SyncQueueItem,
} from '@/src/types';

const DB_NAME = 'truyen-audio-v2';
const DB_VERSION = 1;

const STORES = {
  STORIES: 'stories',
  CHAPTERS: 'chapters',
  PLAYLISTS: 'playlists',
  PROGRESS: 'progress',
  SYNC_QUEUE: 'syncQueue',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openLocalDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.STORIES)) {
        db.createObjectStore(STORES.STORIES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.CHAPTERS)) {
        const chStore = db.createObjectStore(STORES.CHAPTERS, { keyPath: 'id' });
        chStore.createIndex('byStory', 'storyId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.PLAYLISTS)) {
        db.createObjectStore(STORES.PLAYLISTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.PROGRESS)) {
        db.createObjectStore(STORES.PROGRESS, { keyPath: 'storyId' });
      }
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function txRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getAllStories(): Promise<Story[]> {
  const db = await openLocalDB();
  const tx = db.transaction(STORES.STORIES, 'readonly');
  const items = await txRequest<Story[]>(tx.objectStore(STORES.STORIES).getAll());
  return items.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getStory(storyId: string): Promise<Story | undefined> {
  const db = await openLocalDB();
  const tx = db.transaction(STORES.STORIES, 'readonly');
  return txRequest<Story | undefined>(tx.objectStore(STORES.STORIES).get(storyId));
}

export async function putStory(story: Story): Promise<void> {
  const db = await openLocalDB();
  const tx = db.transaction(STORES.STORIES, 'readwrite');
  tx.objectStore(STORES.STORIES).put(story);
  await txDone(tx);
}

export async function deleteStoryLocal(storyId: string): Promise<void> {
  const db = await openLocalDB();
  const tx = db.transaction([STORES.STORIES, STORES.CHAPTERS, STORES.PROGRESS], 'readwrite');
  tx.objectStore(STORES.STORIES).delete(storyId);
  tx.objectStore(STORES.PROGRESS).delete(storyId);

  const chIndex = tx.objectStore(STORES.CHAPTERS).index('byStory');
  const keys = await txRequest<IDBValidKey[]>(chIndex.getAllKeys(storyId));
  for (const key of keys) {
    tx.objectStore(STORES.CHAPTERS).delete(key);
  }
  await txDone(tx);
}

export async function getChapterContent(chapterId: string): Promise<ChapterContent | undefined> {
  const db = await openLocalDB();
  const tx = db.transaction(STORES.CHAPTERS, 'readonly');
  return txRequest<ChapterContent | undefined>(tx.objectStore(STORES.CHAPTERS).get(chapterId));
}

export async function getStoryChapters(storyId: string): Promise<ChapterContent[]> {
  const db = await openLocalDB();
  const tx = db.transaction(STORES.CHAPTERS, 'readonly');
  const idx = tx.objectStore(STORES.CHAPTERS).index('byStory');
  const items = await txRequest<ChapterContent[]>(idx.getAll(storyId));
  return items.sort((a, b) => a.index - b.index);
}

export async function getAllChapters(): Promise<ChapterContent[]> {
  const db = await openLocalDB();
  const tx = db.transaction(STORES.CHAPTERS, 'readonly');
  return txRequest<ChapterContent[]>(tx.objectStore(STORES.CHAPTERS).getAll());
}

export async function putChapterContent(chapter: ChapterContent): Promise<void> {
  const db = await openLocalDB();
  const tx = db.transaction(STORES.CHAPTERS, 'readwrite');
  tx.objectStore(STORES.CHAPTERS).put(chapter);
  await txDone(tx);
}

export async function deleteChapterContent(chapterId: string): Promise<void> {
  const db = await openLocalDB();
  const tx = db.transaction(STORES.CHAPTERS, 'readwrite');
  tx.objectStore(STORES.CHAPTERS).delete(chapterId);
  await txDone(tx);
}

export async function getAllProgress(): Promise<Record<string, ListeningProgress>> {
  const db = await openLocalDB();
  const tx = db.transaction(STORES.PROGRESS, 'readonly');
  const rows = await txRequest<ListeningProgress[]>(tx.objectStore(STORES.PROGRESS).getAll());
  const map: Record<string, ListeningProgress> = {};
  for (const r of rows) map[r.storyId] = r;
  return map;
}

export async function putProgress(progress: ListeningProgress): Promise<void> {
  const db = await openLocalDB();
  const tx = db.transaction(STORES.PROGRESS, 'readwrite');
  tx.objectStore(STORES.PROGRESS).put(progress);
  await txDone(tx);
}

export async function getAllPlaylists(): Promise<Playlist[]> {
  const db = await openLocalDB();
  const tx = db.transaction(STORES.PLAYLISTS, 'readonly');
  const list = await txRequest<Playlist[]>(tx.objectStore(STORES.PLAYLISTS).getAll());
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function putPlaylist(playlist: Playlist): Promise<void> {
  const db = await openLocalDB();
  const tx = db.transaction(STORES.PLAYLISTS, 'readwrite');
  tx.objectStore(STORES.PLAYLISTS).put(playlist);
  await txDone(tx);
}

export async function deletePlaylistLocal(playlistId: string): Promise<void> {
  const db = await openLocalDB();
  const tx = db.transaction(STORES.PLAYLISTS, 'readwrite');
  tx.objectStore(STORES.PLAYLISTS).delete(playlistId);
  await txDone(tx);
}

export async function enqueueSync(item: SyncQueueItem): Promise<void> {
  const db = await openLocalDB();
  const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
  tx.objectStore(STORES.SYNC_QUEUE).put(item);
  await txDone(tx);
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await openLocalDB();
  const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
  const items = await txRequest<SyncQueueItem[]>(tx.objectStore(STORES.SYNC_QUEUE).getAll());
  return items.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await openLocalDB();
  const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
  tx.objectStore(STORES.SYNC_QUEUE).delete(id);
  await txDone(tx);
}

export async function clearAllOfflineChapters(): Promise<void> {
  const db = await openLocalDB();
  const stories = await getAllStories();
  const tx = db.transaction([STORES.STORIES, STORES.CHAPTERS], 'readwrite');
  tx.objectStore(STORES.CHAPTERS).clear();
  for (const s of stories) {
    const updated: Story = {
      ...s,
      chapters: s.chapters.map((c) => ({ ...c, downloadedOffline: false })),
    };
    tx.objectStore(STORES.STORIES).put(updated);
  }
  await txDone(tx);
}

export async function getStorageStats(): Promise<{
  usedBytes: number;
  quotaBytes: number;
  offlineChaptersBytes: number;
  offlineChapterCount: number;
}> {
  const chapters = await getAllChapters();
  let offlineChaptersBytes = 0;
  let offlineChapterCount = 0;
  for (const ch of chapters) {
    if (ch.downloadedOffline) {
      offlineChapterCount++;
      offlineChaptersBytes += ch.sizeBytes || 0;
    }
  }
  let usedBytes = offlineChaptersBytes;
  let quotaBytes = 0;
  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      usedBytes = est.usage ?? offlineChaptersBytes;
      quotaBytes = est.quota ?? 0;
    } catch {
      // Ignore storage estimate failure on restricted browsers
    }
  }
  return { usedBytes, quotaBytes, offlineChaptersBytes, offlineChapterCount };
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
