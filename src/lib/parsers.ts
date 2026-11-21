import mammoth from 'mammoth';
import type { TextChunk } from '@/src/types';

export function nfc(s: string): string {
  return String(s || '').normalize('NFC');
}

export function sanitizeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function chunkChapterText(text: string): TextChunk[] {
  const out: TextChunk[] = [];
  const paragraphs = nfc(text).split(/\r?\n/);
  paragraphs.forEach((p, pi) => {
    const trimmed = p.trim();
    if (!trimmed) return;
    const parts = trimmed.match(/[^.!?…;:,]+[.!?…;:,]*["”’)]*\s*/g) || [trimmed];
    let buf = '';
    parts.forEach((s) => {
      if ((buf + s).length > 175 && buf) {
        out.push({ t: buf.trim(), p: pi });
        buf = '';
      }
      buf += s;
    });
    if (buf.trim()) {
      out.push({ t: buf.trim(), p: pi });
    }
  });
  return out;
}

export async function parseChapterFile(file: File): Promise<{
  title: string;
  text: string;
  audioBlob?: Blob;
  audioMime?: string;
  sizeBytes: number;
}> {
  const lower = file.name.toLowerCase();

  if (/\.(mp3|m4a|wav|ogg|aac|webm)$/i.test(lower) || file.type.startsWith('audio/')) {
    const baseName = nfc(file.name.replace(/\.[^.]+$/, ''));
    const placeholder = `Đây là chương âm thanh (${file.name}). Bạn có thể nghe trực tiếp kể cả khi tắt màn hình và không có kết nối mạng.`;
    return {
      title: baseName,
      text: placeholder,
      audioBlob: file,
      audioMime: file.type || 'audio/mpeg',
      sizeBytes: file.size + new Blob([placeholder]).size,
    };
  }

  let rawText = '';
  if (lower.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    rawText = nfc(result.value);
  } else if (lower.endsWith('.txt') || lower.endsWith('.md')) {
    rawText = nfc(await file.text());
  } else {
    throw new Error(`Định dạng "${file.name}" chưa được hỗ trợ. Hãy chọn .docx, .txt hoặc file âm thanh.`);
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let title = nfc(file.name.replace(/\.(docx|txt|md)$/i, ''));
  if (lines.length && lines[0].length < 140 && /^(chương|chapter|hồi|quyển|phần)\s+\S+/i.test(lines[0])) {
    title = lines.shift()!;
  }
  const text = lines.join('\n');
  if (!text.trim()) {
    throw new Error(`File "${file.name}" không có nội dung văn bản.`);
  }
  const truncatedText = text.slice(0, 595000);
  return {
    title: title.slice(0, 195),
    text: truncatedText,
    sizeBytes: new Blob([truncatedText]).size,
  };
}

export function processCoverImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được file ảnh bìa'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('File ảnh bìa không hợp lệ'));
      img.onload = () => {
        const w = 360;
        const h = 480;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Không khởi tạo được bộ xử lý ảnh'));
          return;
        }
        const scale = Math.max(w / img.width, h / img.height);
        const sw = w / scale;
        const sh = h / scale;
        ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function estimateMinutes(charCount: number): number {
  return Math.max(1, Math.round(charCount / 900));
}
