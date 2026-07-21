import { useState, useRef, useCallback } from 'react';
import { extractTrackingNumber } from '../lib/ocr';
import { compressImage } from '../lib/image';

export default function CameraCapture({ onResult, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [status, setStatus] = useState('idle');
  const [preview, setPreview] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const streamRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = async () => {
    try {
      setStatus('starting');
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = s;
      setStream(s);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  const runOCR = async (imageData) => {
    setStatus('ocr');
    const result = await extractTrackingNumber(imageData);
    setExtracted(result);
    setStatus('ocr-done');
  };

  const capture = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const raw = canvas.toDataURL('image/jpeg', 0.85);
    stopCamera();
    setStream(null);
    const compressed = await compressImage(raw);
    setPreview(compressed);
    runOCR(compressed);
  };

  const retake = () => {
    setPreview(null);
    setExtracted(null);
    startCamera();
  };

  const confirm = () => {
    onResult({ trackingNumber: extracted || '', photo: preview });
    onClose();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target.result);
      setPreview(compressed);
      runOCR(compressed);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">ស្កេនលេខស្នើសុំ</h3>
          <button onClick={() => { stopCamera(); onClose(); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {status === 'error' && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center">
            មិនអាចចូលប្រើកាមេរ៉ាបានទេ។ សូមប្រើការជ្រើសរើសរូបភាពជំនួសវិញ។
          </div>
        )}

        {!stream && !preview && (
          <div className="space-y-3">
            <button onClick={startCamera} className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              បើកកាមេរ៉ា
            </button>
            <div className="text-center text-gray-400 text-sm">ឬ</div>
            <label className="block w-full py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-center cursor-pointer">
              ជ្រើសរើសរូបភាព
              <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}

        {stream && (
          <div className="space-y-3">
            <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg bg-black"
              onLoadedMetadata={() => videoRef.current?.play()} />
            <button onClick={capture} className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              ថត
            </button>
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <img src={preview} alt="Captured" className="w-full rounded-lg" />
            {status === 'ocr' && (
              <div className="text-center text-blue-600 animate-pulse">
                កំពុងស្កេនរកលេខស្នើសុំ...
              </div>
            )}
            {extracted && (
              <div className="bg-green-50 text-green-700 p-3 rounded-lg break-all">
                លទ្ធផល៖ <strong>{extracted}</strong>
              </div>
            )}
            {status === 'ocr-done' && !extracted && (
              <div className="bg-yellow-50 text-yellow-700 p-3 rounded-lg">
                រកមិនឃើញលេខស្នើសុំ។ អ្នកអាចវាយបញ្ចូលដោយខ្លួនឯង។
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {(status === 'ocr-done' || status === 'ocr') && (
                <button onClick={confirm} className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                  {extracted ? 'ប្រើលទ្ធផលនេះ' : 'បន្ត (វាយដោយខ្លួនឯង)'}
                </button>
              )}
              {status !== 'ocr' && (
                <button onClick={retake} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                  ថតឡើងវិញ
                </button>
              )}
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
