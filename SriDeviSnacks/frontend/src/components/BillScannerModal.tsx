import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, X, RotateCw, RefreshCw, Check, SwitchCamera, 
  ScanLine, AlertCircle, Upload, Crop, Maximize2, Move 
} from 'lucide-react';

interface BillScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureOk: (file: File) => void;
  title?: string;
}

interface CropRect {
  x: number;      // 0 to 100 percentage
  y: number;      // 0 to 100 percentage
  width: number;  // 0 to 100 percentage
  height: number; // 0 to 100 percentage
}

type DragHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e' | 'move' | null;

interface DragState {
  handle: DragHandle;
  startX: number;
  startY: number;
  startCrop: CropRect;
  containerRect: DOMRect;
}

export const BillScannerModal: React.FC<BillScannerModalProps> = ({
  isOpen,
  onClose,
  onCaptureOk,
  title = "Scan Purchase Bill"
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<'stream' | 'preview'>('stream');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [flash, setFlash] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Crop Box state (in percentage: 0 to 100)
  const defaultCrop: CropRect = { x: 4, y: 4, width: 92, height: 92 };
  const [crop, setCrop] = useState<CropRect>(defaultCrop);
  const cropRef = useRef<CropRect>(defaultCrop);
  const dragStateRef = useRef<DragState | null>(null);

  // Helper to keep cropRef in sync with state
  const updateCrop = (newCrop: CropRect) => {
    cropRef.current = newCrop;
    setCrop(newCrop);
  };

  // Stop active camera stream
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.error("Error stopping track:", e);
        }
      });
      streamRef.current = null;
    }
  };

  // Start camera stream
  const startCamera = async (deviceId?: string) => {
    stopStream();
    setError(null);
    setLoading(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser. Please use mobile camera or upload instead.');
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.log('Video play catch:', playErr);
        }
      }

      // Enumerate available video devices
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = allDevices.filter(d => d.kind === 'videoinput');
        setDevices(videoInputs);

        const currentTrack = stream.getVideoTracks()[0];
        const settings = currentTrack?.getSettings();
        if (settings?.deviceId) {
          setSelectedDeviceId(settings.deviceId);
        }
      } catch (enumErr) {
        console.warn('Could not enumerate devices:', enumErr);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Camera access error:', err);
      let msg = 'Could not access camera. Please allow camera permissions.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera permission in browser settings or use the file upload option below.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera found on this device.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      setLoading(false);
    }
  };

  // Reset & start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('stream');
      setPreviewDataUrl(null);
      updateCrop(defaultCrop);
      startCamera(selectedDeviceId || undefined);
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen]);

  // Switch camera device
  const handleSwitchCamera = (newDeviceId: string) => {
    setSelectedDeviceId(newDeviceId);
    startCamera(newDeviceId);
  };

  // Cycle through available cameras
  const handleCycleCamera = () => {
    if (devices.length < 2) return;
    const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];
    if (nextDevice) {
      handleSwitchCamera(nextDevice.deviceId);
    }
  };

  // Capture frame from video feed
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;

    // Flash animation effect
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    setPreviewDataUrl(dataUrl);
    updateCrop(defaultCrop);
    setStep('preview');
    stopStream();
  };

  // Retake scan
  const handleRetake = () => {
    setPreviewDataUrl(null);
    updateCrop(defaultCrop);
    setStep('stream');
    startCamera(selectedDeviceId || undefined);
  };

  // Rotate image 90 degrees clockwise onto canvas
  const rotateImage90 = (srcDataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalHeight;
        canvas.height = img.naturalWidth;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(srcDataUrl);

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = () => resolve(srcDataUrl);
      img.src = srcDataUrl;
    });
  };

  const handleRotate = async () => {
    if (!previewDataUrl || isProcessing) return;
    setIsProcessing(true);
    try {
      const rotatedUrl = await rotateImage90(previewDataUrl);
      setPreviewDataUrl(rotatedUrl);
      updateCrop(defaultCrop);
    } finally {
      setIsProcessing(false);
    }
  };

  // Select full image (0% to 100%)
  const handleSelectFull = () => {
    updateCrop({ x: 0, y: 0, width: 100, height: 100 });
  };

  // Reset crop to standard 4% margin
  const handleResetCrop = () => {
    updateCrop(defaultCrop);
  };

  // Pointer drag tracking for interactive crop box
  const startDrag = (handle: DragHandle, clientX: number, clientY: number) => {
    if (!cropContainerRef.current) return;
    const containerRect = cropContainerRef.current.getBoundingClientRect();
    dragStateRef.current = {
      handle,
      startX: clientX,
      startY: clientY,
      startCrop: { ...cropRef.current },
      containerRect
    };
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!dragStateRef.current) return;
      const { handle, startX, startY, startCrop, containerRect } = dragStateRef.current;
      if (containerRect.width <= 0 || containerRect.height <= 0) return;

      const deltaX = ((e.clientX - startX) / containerRect.width) * 100;
      const deltaY = ((e.clientY - startY) / containerRect.height) * 100;
      const minSize = 6; // minimum 6% width/height to avoid collapse

      let { x, y, width, height } = startCrop;

      if (handle === 'move') {
        x = Math.min(Math.max(startCrop.x + deltaX, 0), 100 - startCrop.width);
        y = Math.min(Math.max(startCrop.y + deltaY, 0), 100 - startCrop.height);
      } else {
        if (handle === 'nw' || handle === 'w' || handle === 'sw') {
          const maxX = startCrop.x + startCrop.width - minSize;
          const proposedX = Math.min(Math.max(startCrop.x + deltaX, 0), maxX);
          width = startCrop.width - (proposedX - startCrop.x);
          x = proposedX;
        }

        if (handle === 'ne' || handle === 'e' || handle === 'se') {
          const maxWidth = 100 - startCrop.x;
          width = Math.min(Math.max(startCrop.width + deltaX, minSize), maxWidth);
        }

        if (handle === 'nw' || handle === 'n' || handle === 'ne') {
          const maxY = startCrop.y + startCrop.height - minSize;
          const proposedY = Math.min(Math.max(startCrop.y + deltaY, 0), maxY);
          height = startCrop.height - (proposedY - startCrop.y);
          y = proposedY;
        }

        if (handle === 'sw' || handle === 's' || handle === 'se') {
          const maxHeight = 100 - startCrop.y;
          height = Math.min(Math.max(startCrop.height + deltaY, minSize), maxHeight);
        }
      }

      const nextCrop: CropRect = {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        width: Math.round(width * 10) / 10,
        height: Math.round(height * 10) / 10
      };
      updateCrop(nextCrop);
    };

    const onPointerUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  // Confirm OK: Crop exact selected rectangle at full native resolution and save File
  const handleConfirmCropOk = () => {
    if (!previewDataUrl || isProcessing) return;
    setIsProcessing(true);

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const currentCrop = cropRef.current;
        const naturalW = img.naturalWidth;
        const naturalH = img.naturalHeight;

        // Calculate pixel coordinates from percentages
        const cropX = Math.max(0, Math.round((currentCrop.x / 100) * naturalW));
        const cropY = Math.max(0, Math.round((currentCrop.y / 100) * naturalH));
        const cropW = Math.min(naturalW - cropX, Math.max(1, Math.round((currentCrop.width / 100) * naturalW)));
        const cropH = Math.min(naturalH - cropY, Math.max(1, Math.round((currentCrop.height / 100) * naturalH)));

        canvas.width = cropW;
        canvas.height = cropH;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

        canvas.toBlob(
          (blob) => {
            setIsProcessing(false);
            if (!blob) return;
            const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
            const file = new File([blob], `scanned_bill_${timestamp}.jpg`, { type: 'image/jpeg' });
            onCaptureOk(file);
            onClose();
          },
          'image/jpeg',
          0.92
        );
      } catch (err) {
        console.error("Cropping error:", err);
        setIsProcessing(false);
        alert("Failed to crop image. Please try again.");
      }
    };
    img.onerror = () => {
      setIsProcessing(false);
      alert("Failed to load image for cropping.");
    };
    img.src = previewDataUrl;
  };

  // Mobile camera fallback capture
  const handleMobileCaptureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewDataUrl(reader.result as string);
        updateCrop(defaultCrop);
        setStep('preview');
        stopStream();
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 z-[70] flex items-center justify-center p-2 sm:p-4 md:p-6 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-gray-900 text-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] border border-gray-800">
        
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 border-b border-gray-800 flex justify-between items-center bg-gray-900/90">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              {step === 'stream' ? (
                <ScanLine className="w-5 h-5 text-indigo-400 animate-pulse" />
              ) : (
                <Crop className="w-5 h-5 text-indigo-400" />
              )}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-100 flex items-center gap-2">
                {step === 'stream' ? title : 'Crop & Save Bill'}
              </h2>
              <p className="text-[11px] text-gray-400 hidden sm:block">
                {step === 'stream' 
                  ? 'Align document inside frame and click Scan Bill' 
                  : 'Adjust corners to crop unwanted edges, then click OK to save'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {step === 'stream' && devices.length > 1 && (
              <button
                type="button"
                onClick={handleCycleCamera}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium border border-gray-700 transition"
                title="Switch Camera"
              >
                <SwitchCamera className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Switch Camera</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder / Cropper Body */}
        <div className="relative bg-black flex-grow flex items-center justify-center overflow-hidden min-h-[340px] max-h-[64vh]">
          
          {/* Flash animation */}
          {flash && (
            <div className="absolute inset-0 bg-white z-40 transition-opacity duration-200 pointer-events-none opacity-90" />
          )}

          {step === 'stream' ? (
            /* Live Camera View */
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gray-950/80">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent mb-3" />
                  <p className="text-sm font-medium text-gray-300">Starting Scanner Camera...</p>
                </div>
              )}

              {error ? (
                <div className="p-6 text-center max-w-md">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-gray-200 mb-1">Camera Notice</h3>
                  <p className="text-xs text-gray-400 mb-5 leading-relaxed">{error}</p>
                  
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => mobileInputRef.current?.click()}
                      className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Open Device Camera / Photos
                    </button>
                    <button
                      type="button"
                      onClick={() => startCamera(selectedDeviceId || undefined)}
                      className="inline-flex items-center justify-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-xl border border-gray-700 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Try Again
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain max-h-[60vh]"
                  />

                  {/* Document Alignment Frame */}
                  <div className="absolute inset-4 md:inset-8 pointer-events-none flex flex-col items-center justify-between border-2 border-dashed border-indigo-400/50 rounded-2xl p-4 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                    {/* Top Guide */}
                    <div className="w-full flex justify-between items-start">
                      <div className="w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-md" />
                      <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-medium text-indigo-300 border border-indigo-500/30">
                        📄 Hold Bill Steady
                      </span>
                      <div className="w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-md" />
                    </div>

                    {/* Animated scanning bar */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_12px_#818cf8] animate-pulse my-auto" />

                    {/* Bottom Guide */}
                    <div className="w-full flex justify-between items-end">
                      <div className="w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-md" />
                      <span className="text-[10px] text-gray-400 bg-black/50 px-2 py-0.5 rounded">
                        Full bill should be visible
                      </span>
                      <div className="w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-md" />
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Review & Interactive Cropper View */
            <div className="relative w-full h-full flex flex-col items-center justify-center p-2 sm:p-3 bg-gray-950 overflow-hidden">
              {isProcessing && (
                <div className="absolute inset-0 z-50 bg-black/75 flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent mb-2" />
                  <p className="text-xs text-indigo-200 font-medium">Processing bill...</p>
                </div>
              )}

              {previewDataUrl && (
                <div className="relative flex flex-col items-center justify-center max-w-full max-h-full">
                  {/* Top instruction badge */}
                  <div className="mb-2 flex items-center gap-2 bg-gray-900/90 border border-indigo-500/30 px-3 py-1 rounded-full text-[11px] text-indigo-300 shadow-md">
                    <Crop className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Drag corners or edges to crop bill</span>
                    <button
                      type="button"
                      onClick={handleSelectFull}
                      className="ml-1 text-[10px] bg-indigo-600/40 hover:bg-indigo-600 px-2 py-0.5 rounded text-white font-medium transition"
                      title="Select Entire Image"
                    >
                      Full Image
                    </button>
                    <button
                      type="button"
                      onClick={handleResetCrop}
                      className="text-[10px] bg-gray-800 hover:bg-gray-700 px-2 py-0.5 rounded text-gray-300 font-medium transition"
                      title="Reset Crop Box"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Image + Crop Box Container */}
                  <div
                    ref={cropContainerRef}
                    className="relative inline-block select-none touch-none max-w-full max-h-[50vh] shadow-2xl rounded-lg overflow-hidden border border-gray-800 bg-black"
                    style={{ touchAction: 'none' }}
                  >
                    <img
                      src={previewDataUrl}
                      alt="Scanned Bill Preview"
                      className="max-h-[50vh] max-w-full object-contain block mx-auto pointer-events-none"
                      draggable={false}
                    />

                    {/* 4 Dimmed overlays outside the crop rectangle */}
                    {/* Top */}
                    <div
                      className="absolute left-0 right-0 bg-black/65 pointer-events-none"
                      style={{ top: 0, height: `${crop.y}%` }}
                    />
                    {/* Bottom */}
                    <div
                      className="absolute left-0 right-0 bg-black/65 pointer-events-none"
                      style={{ top: `${crop.y + crop.height}%`, bottom: 0 }}
                    />
                    {/* Left */}
                    <div
                      className="absolute bg-black/65 pointer-events-none"
                      style={{
                        top: `${crop.y}%`,
                        left: 0,
                        width: `${crop.x}%`,
                        height: `${crop.height}%`
                      }}
                    />
                    {/* Right */}
                    <div
                      className="absolute bg-black/65 pointer-events-none"
                      style={{
                        top: `${crop.y}%`,
                        left: `${crop.x + crop.width}%`,
                        right: 0,
                        height: `${crop.height}%`
                      }}
                    />

                    {/* Interactive Crop Window (Draggable Box) */}
                    <div
                      className="absolute border-2 border-indigo-400 cursor-move shadow-[0_0_15px_rgba(99,102,241,0.5)] z-10"
                      style={{
                        left: `${crop.x}%`,
                        top: `${crop.y}%`,
                        width: `${crop.width}%`,
                        height: `${crop.height}%`
                      }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        startDrag('move', e.clientX, e.clientY);
                      }}
                    >
                      {/* Rule of thirds grid lines */}
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                        <div className="border-r border-b border-white/25" />
                        <div className="border-r border-b border-white/25" />
                        <div className="border-b border-white/25" />
                        <div className="border-r border-b border-white/25" />
                        <div className="border-r border-b border-white/25" />
                        <div className="border-b border-white/25" />
                        <div className="border-r border-white/25" />
                        <div className="border-r border-white/25" />
                        <div className="border-white/25" />
                      </div>

                      {/* Corner Brackets */}
                      <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-white pointer-events-none" />
                      <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-white pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-white pointer-events-none" />
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-white pointer-events-none" />

                      {/* Subtle move icon in center */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 hover:opacity-80">
                        <Move className="w-5 h-5 text-white drop-shadow" />
                      </div>
                    </div>

                    {/* 4 Corner Touch / Drag Handles */}
                    {/* NW */}
                    <div
                      className="absolute w-8 h-8 flex items-center justify-center cursor-nwse-resize z-20"
                      style={{
                        left: `${crop.x}%`,
                        top: `${crop.y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startDrag('nw', e.clientX, e.clientY);
                      }}
                    >
                      <div className="w-4 h-4 rounded-full bg-white border-2 border-indigo-600 shadow-lg ring-2 ring-indigo-400/40" />
                    </div>

                    {/* NE */}
                    <div
                      className="absolute w-8 h-8 flex items-center justify-center cursor-nesw-resize z-20"
                      style={{
                        left: `${crop.x + crop.width}%`,
                        top: `${crop.y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startDrag('ne', e.clientX, e.clientY);
                      }}
                    >
                      <div className="w-4 h-4 rounded-full bg-white border-2 border-indigo-600 shadow-lg ring-2 ring-indigo-400/40" />
                    </div>

                    {/* SW */}
                    <div
                      className="absolute w-8 h-8 flex items-center justify-center cursor-nesw-resize z-20"
                      style={{
                        left: `${crop.x}%`,
                        top: `${crop.y + crop.height}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startDrag('sw', e.clientX, e.clientY);
                      }}
                    >
                      <div className="w-4 h-4 rounded-full bg-white border-2 border-indigo-600 shadow-lg ring-2 ring-indigo-400/40" />
                    </div>

                    {/* SE */}
                    <div
                      className="absolute w-8 h-8 flex items-center justify-center cursor-nwse-resize z-20"
                      style={{
                        left: `${crop.x + crop.width}%`,
                        top: `${crop.y + crop.height}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startDrag('se', e.clientX, e.clientY);
                      }}
                    >
                      <div className="w-4 h-4 rounded-full bg-white border-2 border-indigo-600 shadow-lg ring-2 ring-indigo-400/40" />
                    </div>

                    {/* 4 Edge Handles */}
                    {/* Top edge (N) */}
                    <div
                      className="absolute w-12 h-6 flex items-center justify-center cursor-ns-resize z-20"
                      style={{
                        left: `${crop.x + crop.width / 2}%`,
                        top: `${crop.y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startDrag('n', e.clientX, e.clientY);
                      }}
                    >
                      <div className="w-6 h-2 rounded-full bg-white border border-indigo-600 shadow" />
                    </div>

                    {/* Bottom edge (S) */}
                    <div
                      className="absolute w-12 h-6 flex items-center justify-center cursor-ns-resize z-20"
                      style={{
                        left: `${crop.x + crop.width / 2}%`,
                        top: `${crop.y + crop.height}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startDrag('s', e.clientX, e.clientY);
                      }}
                    >
                      <div className="w-6 h-2 rounded-full bg-white border border-indigo-600 shadow" />
                    </div>

                    {/* Left edge (W) */}
                    <div
                      className="absolute w-6 h-12 flex items-center justify-center cursor-ew-resize z-20"
                      style={{
                        left: `${crop.x}%`,
                        top: `${crop.y + crop.height / 2}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startDrag('w', e.clientX, e.clientY);
                      }}
                    >
                      <div className="w-2 h-6 rounded-full bg-white border border-indigo-600 shadow" />
                    </div>

                    {/* Right edge (E) */}
                    <div
                      className="absolute w-6 h-12 flex items-center justify-center cursor-ew-resize z-20"
                      style={{
                        left: `${crop.x + crop.width}%`,
                        top: `${crop.y + crop.height / 2}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startDrag('e', e.clientX, e.clientY);
                      }}
                    >
                      <div className="w-2 h-6 rounded-full bg-white border border-indigo-600 shadow" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hidden input for mobile native camera capture fallback */}
          <input
            type="file"
            ref={mobileInputRef}
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={handleMobileCaptureChange}
          />
        </div>

        {/* Footer Controls */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-t border-gray-800 bg-gray-900 flex items-center justify-between gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
          {step === 'stream' ? (
            <>
              {/* Left: Mobile camera / file fallback trigger */}
              <button
                type="button"
                onClick={() => mobileInputRef.current?.click()}
                className="inline-flex items-center text-xs font-medium text-gray-400 hover:text-gray-200 transition"
                title="Open Phone Camera / Gallery"
              >
                <Upload className="w-4 h-4 mr-1 text-gray-400" />
                <span className="hidden sm:inline">Phone Camera / File</span>
              </button>

              {/* Center: Big Capture / Shutter Button */}
              <div className="flex-grow flex justify-center">
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={loading || !!error}
                  className="group relative inline-flex items-center justify-center p-0.5 mb-0.5 overflow-hidden rounded-full font-medium text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  title="Capture Document"
                >
                  <span className="px-6 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 flex items-center gap-2 font-bold text-sm shadow-indigo-500/40 shadow-md">
                    <Camera className="w-5 h-5 text-white" />
                    <span>Scan Bill</span>
                  </span>
                </button>
              </div>

              {/* Right: Cancel button */}
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition"
              >
                Cancel
              </button>
            </>
          ) : (
            /* Controls in Review / Crop Mode */
            <>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={isProcessing}
                  className="inline-flex items-center px-3 py-2 rounded-xl text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 transition cursor-pointer disabled:opacity-50"
                  title="Retake photo"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1 text-gray-400" />
                  <span>Retake</span>
                </button>

                <button
                  type="button"
                  onClick={handleRotate}
                  disabled={isProcessing}
                  className="inline-flex items-center px-3 py-2 rounded-xl text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 transition cursor-pointer disabled:opacity-50"
                  title="Rotate 90 degrees clockwise"
                >
                  <RotateCw className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                  <span>Rotate 90°</span>
                </button>

                <button
                  type="button"
                  onClick={handleSelectFull}
                  disabled={isProcessing}
                  className="hidden md:inline-flex items-center px-2.5 py-2 rounded-xl text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 transition cursor-pointer disabled:opacity-50"
                  title="Select Entire Image"
                >
                  <Maximize2 className="w-3.5 h-3.5 mr-1 text-gray-400" />
                  <span>Full</span>
                </button>
              </div>

              {/* Confirm Crop & OK button */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={handleConfirmCropOk}
                  disabled={isProcessing}
                  className="inline-flex items-center px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  <span>OK / Save Bill</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillScannerModal;
