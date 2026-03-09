/**
 * ImageUpload Component
 * Upload → Crop (drag handles on each side & corner) → Solve workflow.
 * Uses react-image-crop for an intuitive, handle-based crop experience.
 */

import { useState, useRef, useCallback } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Camera, Crop, X, Search } from 'lucide-react';

// ---- helper: produce a cropped Blob from the crop selection ----
function getCroppedBlob(image, crop) {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
    );

    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
    });
}

// ---- main component ----
export default function ImageUpload({ onUpload, loading }) {
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState(undefined);
    const [completedCrop, setCompletedCrop] = useState(null);
    const [croppedPreview, setCroppedPreview] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const imgRef = useRef(null);
    const fileInputRef = useRef(null);

    // Step 1 — pick file
    const handleFile = (f) => {
        if (!f || !f.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            setImageSrc(e.target.result);
            setCroppedPreview(null);
            setCrop(undefined);
            setCompletedCrop(null);
        };
        reader.readAsDataURL(f);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    };

    // When image loads, set a default crop (80% center)
    const onImageLoad = useCallback((e) => {
        imgRef.current = e.currentTarget;
        const { width, height } = e.currentTarget;
        const defaultCrop = {
            unit: 'px',
            x: width * 0.1,
            y: height * 0.1,
            width: width * 0.8,
            height: height * 0.8,
        };
        setCrop(defaultCrop);
        setCompletedCrop(defaultCrop);
    }, []);

    // Step 2 — confirm crop
    const confirmCrop = async () => {
        if (!imgRef.current || !completedCrop?.width || !completedCrop?.height) return;
        const blob = await getCroppedBlob(imgRef.current, completedCrop);
        setCroppedPreview(URL.createObjectURL(blob));
    };

    // Step 3 — submit cropped image to solver
    const handleSubmit = async () => {
        if (!croppedPreview) return;
        const resp = await fetch(croppedPreview);
        const blob = await resp.blob();
        const file = new File([blob], 'cropped-question.jpg', { type: 'image/jpeg' });
        onUpload?.(file);
    };

    // Reset everything
    const reset = () => {
        setImageSrc(null);
        setCroppedPreview(null);
        setCompletedCrop(null);
        setCrop(undefined);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Go back to cropper
    const recrop = () => setCroppedPreview(null);

    return (
        <div className="space-y-5">
            {/* ---- Phase A: No image yet — drop zone ---- */}
            {!imageSrc && (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`glass-card p-10 text-center cursor-pointer transition-all duration-300 ${dragOver ? 'border-brand-500 bg-brand-500/10 scale-[1.02]' : 'hover:bg-white/5'
                        }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFile(e.target.files[0])}
                    />
                    <Camera size={48} className="mx-auto mb-4 text-brand-400" />
                    <p className="text-lg font-medium text-gray-300">Drop your question image here</p>
                    <p className="text-sm text-gray-500 mt-1">or click to browse • JPG, PNG, WEBP</p>
                </div>
            )}

            {/* ---- Phase B: Crop mode — drag handles on all sides & corners ---- */}
            {imageSrc && !croppedPreview && (
                <div className="space-y-4 animate-fade-in-up">
                    <div className="glass-card p-4 flex justify-center overflow-auto"
                        style={{ maxHeight: 500 }}>
                        <ReactCrop
                            crop={crop}
                            onChange={(c) => setCrop(c)}
                            onComplete={(c) => setCompletedCrop(c)}
                            minWidth={30}
                            minHeight={30}
                            keepSelection
                            style={{ maxWidth: '100%' }}
                        >
                            <img
                                src={imageSrc}
                                alt="Upload"
                                onLoad={onImageLoad}
                                style={{ maxHeight: 460, width: 'auto' }}
                            />
                        </ReactCrop>
                    </div>

                    <p className="text-center text-xs text-gray-500">
                        Drag the handles on each side and corner to adjust the crop area
                    </p>

                    <div className="flex gap-3 justify-center">
                        <button onClick={confirmCrop} className="btn-primary flex items-center gap-2">
                            <Crop size={16} /> Crop &amp; Preview
                        </button>
                        <button onClick={reset} className="btn-secondary flex items-center gap-2">
                            <X size={16} /> Clear
                        </button>
                    </div>
                </div>
            )}

            {/* ---- Phase C: Cropped preview — confirm or re-crop ---- */}
            {croppedPreview && (
                <div className="space-y-5 animate-fade-in-up">
                    <div className="glass-card p-6 text-center">
                        <p className="text-sm font-semibold text-brand-400 uppercase tracking-wide mb-4">
                            Cropped Preview
                        </p>
                        <img
                            src={croppedPreview}
                            alt="Cropped question"
                            className="max-h-72 mx-auto rounded-lg shadow-lg border border-white/10"
                        />
                    </div>

                    <div className="flex gap-3 justify-center">
                        <button onClick={handleSubmit} disabled={loading} className="btn-primary">
                            {loading ? (
                                <>
                                    <div className="spinner" />
                                    Solving…
                                </>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Search size={16} /> Solve This Question
                                </span>
                            )}
                        </button>
                        <button onClick={recrop} className="btn-secondary flex items-center gap-2">
                            <Crop size={16} /> Re-crop
                        </button>
                        <button onClick={reset} className="btn-secondary flex items-center gap-2">
                            <X size={16} /> Clear
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
