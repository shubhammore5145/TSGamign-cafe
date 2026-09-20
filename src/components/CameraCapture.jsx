import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check } from 'lucide-react';

export default function CameraCapture({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImg, setCapturedImg] = useState(null);
  const [error, setError] = useState('');

  const startCamera = async () => {
    setError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 320 } }
      });
      setStream(mediaStream);
    } catch (err) {
      setError('Could not access camera. Please check permissions.');
    }
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video to maintain aspect ratio
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 320;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to webp/jpeg to keep size small
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImg(dataUrl);
    onCapture(dataUrl);
    stopCamera();
  };

  const retake = () => {
    setCapturedImg(null);
    onCapture(null);
    startCamera();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stream]);

  return (
    <div style={{ margin: 'var(--space-md) 0' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      {!stream && !capturedImg && (
        <div style={{ textAlign: 'center', padding: 'var(--space-xl)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
          <button type="button" className="btn btn-ghost" onClick={startCamera}>
            <Camera size={20} /> Open Camera
          </button>
          {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: 8 }}>{error}</div>}
        </div>
      )}

      {stream && !capturedImg && (
        <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', maxHeight: '250px', objectFit: 'cover', display: 'block' }}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={capturePhoto}
            style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', borderRadius: '50px' }}
          >
            <Camera size={16} /> Capture
          </button>
        </div>
      )}

      {capturedImg && (
        <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <img src={capturedImg} alt="Captured" style={{ width: '100%', maxHeight: '250px', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8 }}>
            <button type="button" className="btn btn-ghost" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={retake}>
              <RefreshCw size={16} /> Retake
            </button>
            <div className="btn" style={{ background: 'var(--color-success)', color: '#fff' }}>
              <Check size={16} /> Look Good
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
