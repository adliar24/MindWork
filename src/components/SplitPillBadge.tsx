import React from 'react';
import {
  Link2,
  ExternalLink as ExternalLinkIcon,
  Archive,
  FileSpreadsheet,
  Headphones,
  FileText,
  Image as ImageIcon,
  X,
  Download,
} from 'lucide-react';
import { Attachment, ExternalLink } from '../types';
import {
  detectCloudService,
  isImageAttachment,
  isAudioAttachment,
  triggerDownload,
} from '../utils/fileHelpers';

interface SplitPillBadgeProps {
  attachment?: Attachment;
  link?: ExternalLink;
  size?: 'xs' | 'sm' | 'md';
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
  maxTitleWidth?: string;
}

export const SplitPillBadge: React.FC<SplitPillBadgeProps> = ({
  attachment,
  link,
  size = 'sm',
  onRemove,
  onClick,
  className = '',
  maxTitleWidth,
}) => {
  // If it's a web/cloud link
  if (link) {
    const cloud = detectCloudService(link.url);
    const displayTitle = link.title || cloud.name || 'Tautan';
    const isSm = size === 'sm' || size === 'xs';

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onClick) {
        onClick();
      } else {
        window.open(link.url, '_blank', 'noopener,noreferrer');
      }
    };

    return (
      <div
        onClick={handleClick}
        title={`Buka ${displayTitle}: ${link.url}`}
        className={`group/pill inline-flex items-stretch rounded-full border border-blue-300/80 dark:border-blue-800/70 bg-blue-50/70 dark:bg-blue-950/30 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xs active:scale-95 transition-all max-w-full cursor-pointer overflow-hidden ${
          isSm ? 'text-[11px]' : 'text-xs'
        } ${className}`}
      >
        {/* Left Compartment: Link Icon with vertical dividing border line */}
        <div
          className={`${
            isSm ? 'px-2 py-0.5' : 'px-2.5 py-1'
          } bg-blue-100/90 dark:bg-blue-900/50 border-r border-blue-300/80 dark:border-blue-800/70 flex items-center justify-center shrink-0`}
        >
          <Link2 className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-blue-600 dark:text-blue-400`} />
        </div>

        {/* Right Compartment: Link Title */}
        <div className={`${isSm ? 'px-2 py-0.5' : 'px-2.5 py-1'} flex items-center gap-1 min-w-0`}>
          <span
            className={`truncate font-bold text-blue-950 dark:text-blue-100 ${
              maxTitleWidth || (isSm ? 'max-w-[130px] sm:max-w-[180px]' : 'max-w-[180px] sm:max-w-[240px]')
            }`}
          >
            {displayTitle}
          </span>
          <ExternalLinkIcon className="w-2.5 h-2.5 text-blue-500 opacity-60 shrink-0" />
        </div>

        {/* Optional Remove button */}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="px-1.5 flex items-center justify-center text-blue-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 border-l border-blue-200 dark:border-blue-900 transition-colors"
            title="Hapus tautan ini"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // If it's an uploaded file attachment
  if (attachment) {
    const ext = (attachment.extension || '').toLowerCase();
    const isZip = attachment.type === 'archive' || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext);
    const isSheet = attachment.type === 'spreadsheet' || ['xls', 'xlsx', 'csv'].includes(ext);
    const isAudio = isAudioAttachment(attachment);
    const isImg = isImageAttachment(attachment);
    const isSm = size === 'sm' || size === 'xs';

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onClick) {
        onClick();
      } else if (attachment.url) {
        triggerDownload(attachment.name, attachment.url);
      }
    };

    return (
      <div
        onClick={handleClick}
        title={`Berkas: ${attachment.name} (${attachment.size || ext.toUpperCase()}) • Klik untuk unduh`}
        className={`group/pill inline-flex items-stretch rounded-full border transition-all max-w-full cursor-pointer overflow-hidden hover:shadow-xs active:scale-95 ${
          isSm ? 'text-[11px]' : 'text-xs'
        } ${
          isZip
            ? 'border-amber-300 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/30 hover:border-amber-400'
            : isSheet
            ? 'border-emerald-300 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/30 hover:border-emerald-400'
            : isAudio
            ? 'border-purple-300 dark:border-purple-800/70 bg-purple-50/70 dark:bg-purple-950/30 hover:border-purple-400'
            : isImg
            ? 'border-sky-300 dark:border-sky-800/70 bg-sky-50/70 dark:bg-sky-950/30 hover:border-sky-400'
            : 'border-neutral-300 dark:border-[#303448] bg-neutral-100/90 dark:bg-[#1a1c27] hover:border-neutral-400 dark:hover:border-neutral-600'
        } ${className}`}
      >
        {/* Left Compartment: Icon with vertical dividing border line */}
        <div
          className={`${
            isSm ? 'px-2 py-0.5' : 'px-2.5 py-1'
          } border-r flex items-center justify-center shrink-0 ${
            isZip
              ? 'bg-amber-100/90 dark:bg-amber-900/50 border-amber-300 dark:border-amber-800/70 text-amber-700 dark:text-amber-300'
              : isSheet
              ? 'bg-emerald-100/90 dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-300'
              : isAudio
              ? 'bg-purple-100/90 dark:bg-purple-900/50 border-purple-300 dark:border-purple-800/70 text-purple-700 dark:text-purple-300'
              : isImg
              ? 'bg-sky-100/90 dark:bg-sky-900/50 border-sky-300 dark:border-sky-800/70 text-sky-700 dark:text-sky-300'
              : 'bg-neutral-200/90 dark:bg-[#252838] border-neutral-300 dark:border-[#303448] text-neutral-700 dark:text-neutral-300'
          }`}
        >
          {isZip ? (
            <Archive className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          ) : isSheet ? (
            <FileSpreadsheet className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          ) : isAudio ? (
            <Headphones className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          ) : isImg ? (
            <ImageIcon className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          ) : (
            <FileText className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          )}
        </div>

        {/* Right Compartment: File Title & Extension */}
        <div className={`${isSm ? 'px-2 py-0.5' : 'px-2.5 py-1'} flex items-center gap-1.5 min-w-0`}>
          <span
            className={`truncate font-bold text-neutral-900 dark:text-neutral-100 ${
              maxTitleWidth || (isSm ? 'max-w-[120px] sm:max-w-[170px]' : 'max-w-[160px] sm:max-w-[220px]')
            }`}
          >
            {attachment.name}
          </span>
          <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 font-bold shrink-0">
            {attachment.extension || attachment.size}
          </span>
          <Download className="w-2.5 h-2.5 text-neutral-400 opacity-60 shrink-0 ml-0.5 group-hover/pill:text-neutral-700 dark:group-hover/pill:text-neutral-200" />
        </div>

        {/* Optional Remove button */}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="px-1.5 flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 border-l border-neutral-200 dark:border-neutral-800 transition-colors"
            title="Hapus berkas ini"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return null;
};
