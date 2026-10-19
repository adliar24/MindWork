import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Upload, Camera, AlertCircle } from 'lucide-react';
import {
  compressImageFile,
  captureAndCompressVideoFrame,
} from '../utils/imageCompressor';

export const PROFILE_ICONS: string[] = Array.from(
  { length: 17 },
  (_, i) => `/icon/${i + 1}.png`
);

interface AvatarPickerModalProps {
  isOpen: boolean;
  selectedAvatar: string;
  onSelectAvatar: (avatarPath: string) => void;
  onClose: () => void;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  selectedAvatar,
  onSelectAvatar,
  onClose,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up camera stream when modal closes or unmounts
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Perangkat tidak mendukung akses kamera langsung');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 480 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Kamera tidak dapat diakses. Pastikan izin kamera aktif.';
      setCameraError(errorMsg);
    }
  };

  // Re-attach video stream if ref mounts after stream initialized
  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive]);

  const takePhoto = () => {
    if (!videoRef.current) return;
    try {
      setIsProcessing(true);
      const compressedDataUrl = captureAndCompressVideoFrame(videoRef.current, 200, 0.82);
      stopCamera();
      onSelectAvatar(compressedDataUrl);
      onClose();
    } catch {
      setCameraError('Gagal mengambil gambar dari kamera.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|svg|heic|heif)$/i.test(file.name);
    if (!isImage) {
      alert('Silakan pilih berkas gambar (JPG, PNG, WebP, dsb).');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      setIsProcessing(true);
      const compressedDataUrl = await compressImageFile(file, 200, 0.82);
      onSelectAvatar(compressedDataUrl);
      onClose();
    } catch {
      alert('Gagal memproses gambar. Gunakan format JPG, PNG, atau WebP.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!isOpen) return null;

  const isCustomAvatar = selectedAvatar.startsWith('data:image/');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-in fade-in"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#12141a] border border-neutral-200 dark:border-[#272a35] shadow-2xl overflow-hidden flex flex-col text-neutral-900 dark:text-neutral-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden File Input - allow flexible browsing (Photos, Gallery & File Manager/Folder) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.heic,*/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Simple Header */}
        <div className="px-5 py-3.5 border-b border-neutral-200 dark:border-[#272a35] flex items-center justify-between bg-neutral-50/50 dark:bg-[#161820]">
          <h3 className="text-xs font-bold text-neutral-900 dark:text-white">
            {isCameraActive ? 'Ambil Foto' : 'Pilih Avatar'}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Viewfinder Mode */}
        {isCameraActive ? (
          <div className="p-5 flex flex-col items-center">
            {cameraError ? (
              <div className="w-full py-8 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium px-4">
                  {cameraError}
                </p>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-[#1e212b] text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-[#272a35] transition-colors cursor-pointer"
                >
                  Kembali
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center space-y-4">
                <div className="relative w-44 h-44 rounded-full overflow-hidden border-2 border-red-500 shadow-xl bg-black flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover -scale-x-100"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={takePhoto}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isProcessing ? 'Memproses...' : 'Ambil Foto'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Normal Selection Mode: Upload, Camera, & Icons */
          <div className="flex flex-col">
            {/* Quick Actions: Upload File & Camera */}
            <div className="grid grid-cols-2 gap-2.5 p-3.5 pb-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-neutral-200 dark:border-[#272a35] hover:border-red-500/50 hover:bg-neutral-50 dark:hover:bg-[#181a22] text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer group"
              >
                <Upload className="w-3.5 h-3.5 text-neutral-400 group-hover:text-red-500 transition-colors" />
                <span>Upload Foto</span>
              </button>

              <button
                type="button"
                onClick={startCamera}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-neutral-200 dark:border-[#272a35] hover:border-red-500/50 hover:bg-neutral-50 dark:hover:bg-[#181a22] text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer group"
              >
                <Camera className="w-3.5 h-3.5 text-neutral-400 group-hover:text-red-500 transition-colors" />
                <span>Buka Kamera</span>
              </button>
            </div>

            {/* Custom Active Avatar Preview if currently selected */}
            {isCustomAvatar && (
              <div className="px-3.5 pb-1">
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-red-500/5 border border-red-500/30">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-red-500 shrink-0">
                    <img
                      src={selectedAvatar}
                      alt="Foto Kustom"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                      Foto Kustom Aktif
                    </p>
                  </div>
                  <div className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                </div>
              </div>
            )}

            {/* Subtle Divider */}
            <div className="flex items-center gap-3 px-4 py-1.5">
              <div className="h-px flex-1 bg-neutral-200 dark:border-[#272a35] bg-neutral-100 dark:bg-[#1f222d]" />
              <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
                Atau Pilih Karakter
              </span>
              <div className="h-px flex-1 bg-neutral-200 dark:border-[#272a35] bg-neutral-100 dark:bg-[#1f222d]" />
            </div>

            {/* Icons Grid */}
            <div className="p-3.5 pt-1 overflow-y-auto max-h-[50vh]">
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {PROFILE_ICONS.map((iconPath, index) => {
                  const isSelected = selectedAvatar === iconPath;
                  return (
                    <button
                      key={iconPath}
                      type="button"
                      onClick={() => {
                        onSelectAvatar(iconPath);
                        onClose();
                      }}
                      className={`relative group aspect-square rounded-xl p-1.5 transition-all cursor-pointer flex items-center justify-center border ${
                        isSelected
                          ? 'bg-red-500/10 border-red-500 ring-2 ring-red-500 scale-105 shadow-xs'
                          : 'bg-neutral-50 dark:bg-[#181a22] border-neutral-200 dark:border-[#272a35] hover:border-neutral-400 dark:hover:border-neutral-600 hover:scale-105'
                      }`}
                    >
                      <img
                        src={iconPath}
                        alt={`Avatar ${index + 1}`}
                        className="w-full h-full object-contain select-none"
                        loading="lazy"
                      />

                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
