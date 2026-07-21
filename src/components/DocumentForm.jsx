import { useState, useEffect, useRef, useCallback } from 'react';
import { addDocument, updateDocument, getDistinctValues } from '../lib/db';
import { calculateDueDate } from '../lib/dueDateCheck';
import CameraCapture from './CameraCapture';

function ZoomableImage({ src, alt }) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  const clampPan = useCallback((newZoom, newPan) => {
    const maxPan = Math.max(0, (newZoom - 1) * 150);
    return {
      x: Math.max(-maxPan, Math.min(maxPan, newPan.x)),
      y: Math.max(-maxPan, Math.min(maxPan, newPan.y)),
    };
  }, []);

  const handleMouseDown = (e) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const newPan = { x: panStart.current.x + dx, y: panStart.current.y + dy };
    setPan(clampPan(zoom, newPan));
  };

  const handleMouseUp = () => setDragging(false);

  const zoomIn = () => {
    const newZoom = Math.min(5, zoom + 0.5);
    setZoom(newZoom);
    if (newZoom === 1) setPan({ x: 0, y: 0 });
    else setPan((p) => clampPan(newZoom, p));
  };

  const zoomOut = () => {
    const newZoom = Math.max(1, zoom - 0.5);
    setZoom(newZoom);
    if (newZoom === 1) setPan({ x: 0, y: 0 });
    else setPan((p) => clampPan(newZoom, p));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">ឯកសារភ្ជាប់</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={zoomOut} disabled={zoom <= 1}
            className="px-2.5 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed font-medium">
            −
          </button>
          <span className="text-xs text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={zoomIn} disabled={zoom >= 5}
            className="px-2.5 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed font-medium">
            +
          </button>
          {zoom > 1 && (
            <button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="ml-2 text-xs text-blue-600 hover:text-blue-800 font-medium">
              ទំហំដើម
            </button>
          )}
        </div>
      </div>
      <div
        ref={containerRef}
        className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100 cursor-grab active:cursor-grabbing"
        style={{ width: '520px', height: '520px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="w-full h-full object-contain select-none pointer-events-none"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'center center',
            transition: dragging ? 'none' : 'transform 0.15s ease-out',
          }}
        />
      </div>
      <p className="text-xs text-gray-400 text-center">
        អូសដើម្បីផ្លាស់ទី | ប្រើប៊ូតុង +/− ដើម្បីពង្រីក
      </p>
    </div>
  );
}

const DOC_TYPES = [
  { value: 'LandSplit', label: 'ស្នើសុំលេខបំបែក' },
  { value: 'FindBoundary', label: 'ស្នើរកព្រំ' },
  { value: 'PV_Check', label: 'ពិនិត្យក្បាលដីក្នុង GIS' },
  { value: 'Sporadic', label: 'ស្នើសុំដាច់ដោយដុំ ធ្វើប្លង់សុរិយោដី' },
  { value: 'RequestShp', label: 'ស្នើសុំទិន្នន័យ' },
];

const DISTRICTS = [
  'បរិបូណ៌',
  'ជលគិរី',
  'កំពង់ឆ្នាំង',
  'កំពង់លែង',
  'កំពង់ត្រឡាច',
  'រលាប្អៀរ',
  'សាមគ្គីមានជ័យ',
  'ទឹកផុស',
];

export default function DocumentForm({ editDoc, onSaved, onCancel }) {
  const [showCamera, setShowCamera] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previousNames, setPreviousNames] = useState([]);
  const [savedId, setSavedId] = useState(null);

  const [form, setForm] = useState({
    trackingNumber: '',
    photo: null,
    requestorName: '',
    documentType: '',
    district: '',
    receiveDate: new Date().toISOString().split('T')[0],
    dueDate: calculateDueDate(new Date().toISOString().split('T')[0]),
  });

  useEffect(() => {
    getDistinctValues('requestorName').then(setPreviousNames);
  }, []);

  useEffect(() => {
    if (editDoc) {
      setForm({
        trackingNumber: editDoc.trackingNumber || '',
        photo: editDoc.photoBlob || null,
        requestorName: editDoc.requestorName || '',
        documentType: editDoc.documentType || '',
        district: editDoc.district || '',
        receiveDate: editDoc.receiveDate || '',
        dueDate: editDoc.dueDate || '',
      });
    }
  }, [editDoc]);

  const updateField = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'receiveDate') {
        next.dueDate = calculateDueDate(value);
      }
      return next;
    });
  };

  const handleCameraResult = (result) => {
    setForm((prev) => ({
      ...prev,
      trackingNumber: result.trackingNumber || prev.trackingNumber,
      photo: result.photo || prev.photo,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.requestorName.trim()) return;

    setSaving(true);
    try {
      const doc = {
        trackingNumber: form.trackingNumber.trim(),
        photoBlob: form.photo,
        requestorName: form.requestorName.trim(),
        documentType: form.documentType,
        district: form.district,
        receiveDate: form.receiveDate,
        dueDate: form.dueDate,
      };

      if (editDoc) {
        await updateDocument(editDoc.id, doc);
        setSavedId(editDoc.id);
      } else {
        const id = await addDocument(doc);
        setSavedId(id);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleNew = () => {
    setSavedId(null);
    setForm({
      trackingNumber: '',
      photo: null,
      requestorName: '',
      documentType: '',
      district: '',
      receiveDate: new Date().toISOString().split('T')[0],
      dueDate: calculateDueDate(new Date().toISOString().split('T')[0]),
    });
  };

  if (savedId !== null) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center space-y-4">
        <div className="text-4xl">&#10003;</div>
        <h3 className="text-xl font-semibold text-green-800">
          {editDoc ? 'កែប្រែរួចរាល់!' : 'រក្សាទុករួចរាល់!'}
        </h3>
        <p className="text-green-600">
          Document ID: <strong>DOC-{new Date().getFullYear()}-{String(savedId).padStart(4, '0')}</strong>
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={handleNew} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            បន្ថែមថ្មី
          </button>
          <button onClick={onSaved} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
            មើលឯកសារទាំងអស់
          </button>
        </div>
      </div>
    );
  }

  const hasPhoto = !!form.photo;
  const photoUrl = form.photo
    ? (typeof form.photo === 'string' ? form.photo : URL.createObjectURL(form.photo))
    : null;

  return (
    <div>
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${hasPhoto ? 'flex gap-6 items-start justify-center flex-wrap' : ''}`}>
        <form onSubmit={handleSubmit} className={`space-y-5 ${hasPhoto ? 'w-80 flex-shrink-0' : 'max-w-md'}`}>
          <h3 className="text-lg font-semibold text-gray-800">
            {editDoc ? 'កែប្រែឯកសារ' : 'ឯកសារថ្មី'}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">លេខស្នើសុំ</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.trackingNumber}
                onChange={(e) => updateField('trackingNumber', e.target.value)}
                placeholder="លេខស្នើសុំ"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <button type="button" onClick={() => setShowCamera(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm whitespace-nowrap">
                ស្កេន
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">ឈ្មោះអ្នកស្នើសុំ *</label>
            <input
              type="text"
              value={form.requestorName}
              onChange={(e) => updateField('requestorName', e.target.value)}
              required
              placeholder="ឈ្មោះអ្នកស្នើសុំ"
              list="name-suggestions"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <datalist id="name-suggestions">
              {previousNames.map((n) => (<option key={n} value={n} />))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">ប្រភេទឯកសារ</label>
            <select
              value={form.documentType}
              onChange={(e) => updateField('documentType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="">-- ជ្រើសរើសប្រភេទ --</option>
              {DOC_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">ស្រុក</label>
            <select
              value={form.district}
              onChange={(e) => updateField('district', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="">-- ជ្រើសរើសស្រុក --</option>
              {DISTRICTS.map((d) => (<option key={d} value={d}>{d}</option>))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">ថ្ងៃទទួល</label>
              <input
                type="date"
                value={form.receiveDate}
                onChange={(e) => updateField('receiveDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">ថ្ងៃផុតកំណត់</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => updateField('dueDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
              {saving ? 'កំពុងរក្សាទុក...' : editDoc ? 'កែប្រែ' : 'រក្សាទុក'}
            </button>
            {onCancel && (
              <button type="button" onClick={onCancel}
                className="px-6 py-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                បោះបង់
              </button>
            )}
          </div>
          {hasPhoto && (
            <button type="button" onClick={() => updateField('photo', null)}
              className="w-full py-1.5 text-red-500 hover:text-red-700 text-sm font-medium text-center border border-red-200 rounded-lg hover:bg-red-50">
              ដករូបចេញ
            </button>
          )}
        </form>

        {hasPhoto && (
          <div className="flex-1 flex justify-center min-h-[500px]">
            <ZoomableImage src={photoUrl} alt="Document preview" />
          </div>
        )}
      </div>

      {showCamera && (
        <CameraCapture
          onResult={handleCameraResult}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
