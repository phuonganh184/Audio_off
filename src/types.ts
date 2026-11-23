export type ThemeMode = 'light' | 'dark' | 'auto';

export type AmbientMode = 'silent' | 'rain' | 'brown';

export type NavTab = 'library' | 'playlists' | 'offline' | 'sync';

export interface ChapterSummary {
  id: string;
  index: number;
  title: string;
  charCount: number;
  hasAudioBlob?: boolean;
  downloadedOffline: boolean;
  sizeBytes: number;
  updatedAt: number;
}

export const STORY_GENRES = [
  'Kinh dị',
  'Tình cảm',
  'Kiếm hiệp',
  'Tiên hiệp',
  'Ngôn tình',
  'Trinh thám',
  'Huyền huyễn',
  'Đô thị',
  'Khoa huyễn',
  'Lịch sử',
  'Khác',
] as const;

export interface Story {
  id: string;
  title: string;
  author?: string;
  genre?: string;
  cover?: string;
  chapters: ChapterSummary[];
  createdAt: number;
  updatedAt: number;
  syncedAt?: number;
  cloudOnly?: boolean;
}

export interface ChapterContent {
  id: string;
  storyId: string;
  index: number;
  title: string;
  text: string;
  charCount: number;
  audioBlob?: Blob;
  audioMime?: string;
  audioDuration?: number;
  downloadedOffline: boolean;
  sizeBytes: number;
  updatedAt: number;
}

export interface TextChunk {
  t: string;
  p: number;
}

export interface ListeningProgress {
  storyId: string;
  chapterIndex: number;
  chunkIndex: number;
  audioTime: number;
  totalChunks: number;
  chapterTitle?: string;
  deviceName?: string;
  updatedAt: number;
}

export interface PlaylistItem {
  storyId: string;
  chapterIndex: number;
  storyTitle: string;
  chapterTitle: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  items: PlaylistItem[];
  createdAt: number;
  updatedAt: number;
}

export interface SyncQueueItem {
  id: string;
  kind: 'story' | 'delete_story' | 'progress' | 'playlist' | 'delete_playlist';
  targetId: string;
  createdAt: number;
}

export interface PlaybackContext {
  mode: 'story' | 'playlist';
  playlistId?: string;
  playlistIndex?: number;
}
