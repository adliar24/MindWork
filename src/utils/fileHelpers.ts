import { FileType, Language, LinkType } from '../types';

export function getFileTypeFromExtension(filename: string): { type: FileType; extension: string } {
  const parts = filename.split('.');
  const extension = parts.length > 1 ? parts.pop()!.toUpperCase() : 'FILE';

  const extLower = extension.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extLower)) {
    return { type: 'image', extension };
  }
  if (['doc', 'docx', 'pdf', 'txt', 'rtf', 'odt', 'md'].includes(extLower)) {
    return { type: 'document', extension };
  }
  if (['xls', 'xlsx', 'csv', 'ods', 'tsv'].includes(extLower)) {
    return { type: 'spreadsheet', extension };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'pkg'].includes(extLower)) {
    return { type: 'archive', extension };
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'].includes(extLower)) {
    return { type: 'audio', extension };
  }
  return { type: 'other', extension };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDateLocale(dateStr: string, lang: Language = 'id'): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateIndonesian(dateStr: string): string {
  return formatDateLocale(dateStr, 'id');
}

export function triggerDownload(filename: string, content?: string) {
  if (!content) return;
  if (content.startsWith('data:')) {
    const blob = dataURLtoBlob(content);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }
  if (content.startsWith('blob:') || content.startsWith('http')) {
    const a = document.createElement('a');
    a.href = content;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }
  const blob = new Blob([`Contoh konten berkas: ${filename}\nDiunduh dari MindWork Kanban System`], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Optimizes and compresses images client-side using HTML5 Canvas.
 * Resizes images exceeding maxDimension and converts to compressed WebP/JPEG,
 * shrinking 5MB-10MB files down to ~120KB-250KB while maintaining HD visual crispness.
 */
export function compressImageFile(
  file: File,
  maxDimension = 1440,
  quality = 0.82
): Promise<{ dataUrl: string; size: string; rawBytes: number }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            dataUrl: e.target?.result as string,
            size: formatFileSize(file.size),
            rawBytes: file.size,
          });
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        let outputType = 'image/webp';
        let dataUrl = canvas.toDataURL(outputType, quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          outputType = 'image/jpeg';
          dataUrl = canvas.toDataURL(outputType, quality);
        }

        // Calculate approximate byte size of base64
        const stringLength = dataUrl.length - dataUrl.indexOf(',') - 1;
        const byteSize = Math.round((stringLength * 3) / 4);

        resolve({
          dataUrl,
          size: formatFileSize(byteSize),
          rawBytes: byteSize,
        });
      };
      img.onerror = () => {
        resolve({
          dataUrl: e.target?.result as string,
          size: formatFileSize(file.size),
          rawBytes: file.size,
        });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      resolve({
        dataUrl: '',
        size: formatFileSize(file.size),
        rawBytes: file.size,
      });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Detects cloud service provider and brand colors from a given URL
 */
export function detectCloudService(url: string): {
  name: string;
  provider: 'drive' | 'dropbox' | 'onedrive' | 'box' | 'cloud';
  badgeClass: string;
  domain: string;
  type: LinkType;
} {
  let domain = '';
  try {
    domain = new URL(url).hostname;
  } catch {
    domain = '';
  }

  const lower = url.toLowerCase();
  if (lower.includes('drive.google.com')) {
    return {
      name: 'Google Drive',
      provider: 'drive',
      type: 'drive',
      domain,
      badgeClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    };
  }
  if (lower.includes('docs.google.com/document')) {
    return {
      name: 'Google Docs',
      provider: 'drive',
      type: 'doc',
      domain,
      badgeClass: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
    };
  }
  if (lower.includes('docs.google.com/spreadsheets')) {
    return {
      name: 'Google Sheets',
      provider: 'drive',
      type: 'sheet',
      domain,
      badgeClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    };
  }
  if (lower.includes('figma.com')) {
    return {
      name: 'Figma',
      provider: 'cloud',
      type: 'figma',
      domain,
      badgeClass: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
    };
  }
  if (lower.includes('canva.com')) {
    return {
      name: 'Canva',
      provider: 'cloud',
      type: 'canva',
      domain,
      badgeClass: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    };
  }
  if (lower.includes('dropbox.com')) {
    return {
      name: 'Dropbox',
      provider: 'dropbox',
      type: 'link',
      domain,
      badgeClass: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
    };
  }
  if (lower.includes('onedrive') || lower.includes('1drv.ms') || lower.includes('sharepoint.com')) {
    return {
      name: 'OneDrive',
      provider: 'onedrive',
      type: 'link',
      domain,
      badgeClass: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
    };
  }
  if (lower.includes('box.com')) {
    return {
      name: 'Box Cloud',
      provider: 'box',
      type: 'link',
      domain,
      badgeClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    };
  }
  return {
    name: 'Tautan Web',
    provider: 'cloud',
    type: 'link',
    domain: domain || url,
    badgeClass: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
  };
}

export function isImageAttachment(att: {
  type?: string;
  name?: string;
  url?: string;
  extension?: string;
  isCover?: boolean;
}): boolean {
  if (att.isCover) return true;
  if (att.type === 'image') return true;
  if (att.url && (att.url.startsWith('data:image/') || att.url.startsWith('blob:'))) return true;
  const target = ((att.name || '') + ' ' + (att.extension || '') + ' ' + (att.url || '')).toLowerCase();
  return /\.(jpg|jpeg|png|webp|gif|svg|bmp|avif)(\?.*)?$/i.test(target);
}

export function isAudioAttachment(att: {
  type?: string;
  name?: string;
  url?: string;
  extension?: string;
}): boolean {
  if (att.type === 'audio') return true;
  if (att.url && (att.url.startsWith('data:audio/') || att.url.startsWith('blob:audio'))) return true;
  const target = ((att.name || '') + ' ' + (att.extension || '') + ' ' + (att.url || '')).toLowerCase();
  return /\.(mp3|wav|ogg|m4a|flac|aac|wma)(\?.*)?$/i.test(target);
}


