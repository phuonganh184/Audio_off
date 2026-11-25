import type {
  ChapterBookmark,
  ChapterContent,
  ListeningProgress,
  Playlist,
  Story,
  SyncQueueItem,
} from '@/src/types';

const DB_NAME = 'truyen-audio-v2';
const DB_VERSION = 3;

const STORES = {
  STORIES: 'stories',
  CHAPTERS: 'chapters',
  PLAYLISTS: 'playlists',
  PROGRESS: 'progress',
  SYNC_QUEUE: 'syncQueue',
  TTS_CACHE: 'ttsCache',
  BOOKMARKS: 'bookmarks',
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
      if (!db.objectStoreNames.contains(STORES.TTS_CACHE)) {
        const ttsStore = db.createObjectStore(STORES.TTS_CACHE, { keyPath: 'key' });
        ttsStore.createIndex('byChapter', 'chapterId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.BOOKMARKS)) {
        const bmStore = db.createObjectStore(STORES.BOOKMARKS, { keyPath: 'id' });
        bmStore.createIndex('byStory', 'storyId', { unique: false });
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
  const tx = db.transaction(
    [STORES.STORIES, STORES.CHAPTERS, STORES.PROGRESS, STORES.BOOKMARKS],
    'readwrite'
  );
  tx.objectStore(STORES.STORIES).delete(storyId);
  tx.objectStore(STORES.PROGRESS).delete(storyId);

  const chIndex = tx.objectStore(STORES.CHAPTERS).index('byStory');
  const keys = await txRequest<IDBValidKey[]>(chIndex.getAllKeys(storyId));
  for (const key of keys) {
    tx.objectStore(STORES.CHAPTERS).delete(key);
  }

  const bmIndex = tx.objectStore(STORES.BOOKMARKS).index('byStory');
  const bmKeys = await txRequest<IDBValidKey[]>(bmIndex.getAllKeys(storyId));
  for (const key of bmKeys) {
    tx.objectStore(STORES.BOOKMARKS).delete(key);
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

export async function getAllBookmarks(): Promise<ChapterBookmark[]> {
  const db = await openLocalDB();
  const tx = db.transaction(STORES.BOOKMARKS, 'readonly');
  const list = await txRequest<ChapterBookmark[]>(tx.objectStore(STORES.BOOKMARKS).getAll());
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export async function putBookmark(bookmark: ChapterBookmark): Promise<void> {
  const db = await openLocalDB();
  const tx = db.transaction(STORES.BOOKMARKS, 'readwrite');
  tx.objectStore(STORES.BOOKMARKS).put(bookmark);
  await txDone(tx);
}

export async function deleteBookmarkLocal(bookmarkId: string): Promise<void> {
  const db = await openLocalDB();
  const tx = db.transaction(STORES.BOOKMARKS, 'readwrite');
  tx.objectStore(STORES.BOOKMARKS).delete(bookmarkId);
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

export interface CachedTtsAudioEntry {
  key: string;
  chapterId: string;
  voiceProfileId: string;
  blob: Blob;
  updatedAt: number;
}

export function makeTtsCacheKey(voiceProfileId: string, text: string): string {
  const normalized = text.trim();
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${voiceProfileId}_${normalized.length}_${(hash >>> 0).toString(36)}`;
}

export async function getCachedTtsAudio(key: string): Promise<Blob | undefined> {
  const db = await openLocalDB();
  const tx = db.transaction(STORES.TTS_CACHE, 'readonly');
  const entry = await txRequest<CachedTtsAudioEntry | undefined>(
    tx.objectStore(STORES.TTS_CACHE).get(key)
  );
  return entry?.blob;
}

export async function putCachedTtsAudio(entry: CachedTtsAudioEntry): Promise<void> {
  const db = await openLocalDB();
  const tx = db.transaction(STORES.TTS_CACHE, 'readwrite');
  tx.objectStore(STORES.TTS_CACHE).put(entry);
  await txDone(tx);
}

export async function clearAllOfflineChapters(): Promise<void> {
  const db = await openLocalDB();
  const stories = await getAllStories();
  const tx = db.transaction([STORES.STORIES, STORES.CHAPTERS, STORES.TTS_CACHE], 'readwrite');
  tx.objectStore(STORES.CHAPTERS).clear();
  tx.objectStore(STORES.TTS_CACHE).clear();
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

export interface BackupBundle {
  version: 1;
  exportedAt: number;
  stories: Story[];
  chapters: Array<Omit<ChapterContent, 'audioBlob'>>;
  playlists: Playlist[];
  progress: ListeningProgress[];
  bookmarks?: ChapterBookmark[];
}

export async function exportBackupData(): Promise<BackupBundle> {
  const [stories, allChapters, playlists, progressMap, bookmarks] = await Promise.all([
    getAllStories(),
    getAllChapters(),
    getAllPlaylists(),
    getAllProgress(),
    getAllBookmarks(),
  ]);

  const textChapters = allChapters
    .filter((ch) => !ch.audioBlob && ch.text)
    .map(({ audioBlob: _blob, ...rest }) => rest);

  return {
    version: 1,
    exportedAt: Date.now(),
    stories,
    chapters: textChapters,
    playlists,
    progress: Object.values(progressMap),
    bookmarks,
  };
}

export async function importBackupData(rawJson: string): Promise<{
  storiesImported: number;
  chaptersImported: number;
  playlistsImported: number;
}> {
  const parsed = JSON.parse(rawJson) as Partial<BackupBundle>;
  if (!parsed || !Array.isArray(parsed.stories)) {
    throw new Error('File sao lưu không hợp lệ.');
  }

  const existingStories = new Map((await getAllStories()).map((s) => [s.id, s]));
  const existingPlaylists = new Map((await getAllPlaylists()).map((p) => [p.id, p]));
  const existingProgress = await getAllProgress();
  const existingBookmarks = new Map((await getAllBookmarks()).map((b) => [b.id, b]));

  let storiesImported = 0;
  let chaptersImported = 0;
  let playlistsImported = 0;

  if (Array.isArray(parsed.chapters)) {
    for (const ch of parsed.chapters) {
      if (!ch?.id || !ch?.storyId || typeof ch.text !== 'string') continue;
      await putChapterContent({
        ...ch,
        downloadedOffline: true,
        sizeBytes: ch.sizeBytes || new Blob([ch.text]).size,
      });
      chaptersImported++;
    }
  }

  for (const st of parsed.stories) {
    if (!st?.id || !st?.title) continue;
    const prev = existingStories.get(st.id);
    if (!prev || st.updatedAt >= prev.updatedAt) {
      await putStory({
        ...st,
        chapters: st.chapters.map((c) => {
          const hasTextInBundle =
            Array.isArray(parsed.chapters) && parsed.chapters.some((bc) => bc.id === c.id);
          return hasTextInBundle ? { ...c, downloadedOffline: true } : c;
        }),
      });
      storiesImported++;
    }
  }

  if (Array.isArray(parsed.playlists)) {
    for (const pl of parsed.playlists) {
      if (!pl?.id || !pl?.name) continue;
      const prev = existingPlaylists.get(pl.id);
      if (!prev || pl.updatedAt >= prev.updatedAt) {
        await putPlaylist(pl);
        playlistsImported++;
      }
    }
  }

  if (Array.isArray(parsed.progress)) {
    for (const pr of parsed.progress) {
      if (!pr?.storyId) continue;
      const prev = existingProgress[pr.storyId];
      if (!prev || pr.updatedAt > prev.updatedAt) {
        await putProgress(pr);
      }
    }
  }

  if (Array.isArray(parsed.bookmarks)) {
    for (const bm of parsed.bookmarks) {
      if (!bm?.id || !bm?.storyId || !bm?.chapterId) continue;
      if (!existingBookmarks.has(bm.id)) {
        await putBookmark(bm);
      }
    }
  }

  return { storiesImported, chaptersImported, playlistsImported };
}

