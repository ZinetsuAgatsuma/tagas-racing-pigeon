import React, { useEffect, useRef, useState, FormEvent } from 'react';
import { Camera, CheckCircle, Loader2, MapPin, RefreshCw, ShieldAlert, X } from 'lucide-react';

interface PlayerSelfRegisterProps {
  apiUrl: (path: string) => string;
  onBack: () => void;
}

interface GpsFix {
  latitude: number;
  longitude: number;
  accuracy: number;
}

const MAX_ACCURACY_METERS = 100;

function stampLivePhoto(video: HTMLVideoElement, fix: GpsFix, takenAt: Date): string {
  const maxWidth = 960;
  const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
  const width = Math.max(1, Math.round((video.videoWidth || maxWidth) * scale));
  const height = Math.max(1, Math.round((video.videoHeight || 720) * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not prepare the photo.');
  }

  ctx.drawImage(video, 0, 0, width, height);
  const barHeight = 78;
  ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
  ctx.fillRect(0, height - barHeight, width, barHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`LAT ${fix.latitude.toFixed(6)}   LNG ${fix.longitude.toFixed(6)}`, 16, height - 42);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#a7f3d0';
  ctx.fillText(
    `GPS ±${Math.round(fix.accuracy)}m   ${takenAt.toLocaleString()}`,
    16,
    height - 18
  );

  return canvas.toDataURL('image/jpeg', 0.72);
}

export default function PlayerSelfRegister({ apiUrl, onBack }: PlayerSelfRegisterProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loftName, setLoftName] = useState('');
  const [gps, setGps] = useState<GpsFix | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [photo, setPhoto] = useState('');
  const [photoTakenAt, setPhotoTakenAt] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  };

  const startCamera = async () => {
    setCameraError('');
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('This device cannot open a live camera.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch {
      setCameraError('Camera permission is required. Allow the camera and try again.');
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('This device cannot read GPS location.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      position => {
        setGps({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setGpsError('');
      },
      () => {
        setGps(null);
        setGpsError('Location permission is required. Allow GPS and stand at your loft.');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );

    startCamera();

    return () => {
      navigator.geolocation.clearWatch(watchId);
      stopCamera();
    };
  }, []);

  const gpsReady = !!gps && gps.accuracy > 0 && gps.accuracy <= MAX_ACCURACY_METERS;

  const handleCapture = () => {
    setFormError('');
    if (!videoRef.current || !cameraReady) {
      setFormError('Open the live camera before taking the photo.');
      return;
    }
    if (!gps || !gpsReady) {
      setFormError('Wait for an accurate GPS fix at your loft, then take the photo.');
      return;
    }

    const takenAt = new Date();
    try {
      const stamped = stampLivePhoto(videoRef.current, gps, takenAt);
      setPhoto(stamped);
      setPhotoTakenAt(takenAt.toISOString());
    } catch (error: any) {
      setFormError(error.message || 'Could not capture the photo.');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');

    if (!fullName.trim() || !username.trim() || !password || !loftName.trim()) {
      setFormError('Full name, loft name, username, and password are required.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    if (!photo || !photoTakenAt || !gps || !gpsReady) {
      setFormError('Take a live photo at your loft. The photo must include an accurate GPS location.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(apiUrl('/api/public/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          address: address.trim(),
          contactNumber: contactNumber.trim(),
          email: email.trim(),
          username: username.trim(),
          password,
          loftName: loftName.trim(),
          photo,
          latitude: gps.latitude,
          longitude: gps.longitude,
          accuracyMeters: gps.accuracy,
          photoTakenAt
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Registration failed.');
      } else {
        setSuccessMessage(data.message || 'Registration submitted for approval.');
        stopCamera();
      }
    } catch {
      setFormError('Unable to reach the registration server.');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-xs font-bold text-slate-400 hover:text-white"
        >
          Back to login
        </button>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:p-8">
          <h2 className="text-2xl font-extrabold text-white">Register as a player</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Stand at your loft. Take a live photo so the GPS coordinates on the photo become your loft location. An administrator must approve the account before you can log in.
          </p>

          {successMessage ? (
            <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-200">
              <div className="mb-2 flex items-center gap-2 font-bold text-emerald-300">
                <CheckCircle className="h-5 w-5" />
                Registration submitted
              </div>
              <p>{successMessage}</p>
              <button
                type="button"
                onClick={onBack}
                className="mt-4 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white"
              >
                Return to login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {(formError || gpsError || cameraError) && (
                <div className="flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{formError || gpsError || cameraError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-300">
                  Full name *
                  <input value={fullName} onChange={e => setFullName(e.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-emerald-500" />
                </label>
                <label className="block text-xs font-bold text-slate-300">
                  Loft name *
                  <input value={loftName} onChange={e => setLoftName(e.target.value)} required placeholder="e.g. Cruz Loft" className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-emerald-500" />
                </label>
                <label className="block text-xs font-bold text-slate-300">
                  Contact number
                  <input value={contactNumber} onChange={e => setContactNumber(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-emerald-500" />
                </label>
                <label className="block text-xs font-bold text-slate-300">
                  Email
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-emerald-500" />
                </label>
                <label className="block text-xs font-bold text-slate-300 sm:col-span-2">
                  Address
                  <input value={address} onChange={e => setAddress(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-emerald-500" />
                </label>
                <label className="block text-xs font-bold text-slate-300">
                  Username *
                  <input value={username} onChange={e => setUsername(e.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-emerald-500" />
                </label>
                <label className="block text-xs font-bold text-slate-300">
                  Password *
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-emerald-500" />
                </label>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-white">Live loft photo *</p>
                    <p className="mt-1 text-[11px] text-slate-400">Gallery uploads are not accepted. The photo is stamped with the GPS reading.</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${gpsReady ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                    <MapPin className="h-3.5 w-3.5" />
                    {gpsReady ? `GPS ±${Math.round(gps!.accuracy)}m` : 'Waiting for GPS'}
                  </span>
                </div>

                {photo ? (
                  <div className="space-y-3">
                    <img src={photo} alt="Live loft photo with GPS stamp" className="w-full rounded-xl border border-slate-800" />
                    <p className="font-mono text-[11px] text-emerald-300">
                      {gps?.latitude.toFixed(6)}, {gps?.longitude.toFixed(6)}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setPhoto('');
                        setPhotoTakenAt('');
                        startCamera();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200"
                    >
                      <X className="h-3.5 w-3.5" />
                      Retake live photo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <video ref={videoRef} playsInline muted autoPlay className="aspect-[4/3] w-full rounded-xl bg-black object-cover" />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleCapture}
                        disabled={!cameraReady || !gpsReady}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white disabled:opacity-40"
                      >
                        <Camera className="h-4 w-4" />
                        Take live photo
                      </button>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-xs font-bold text-slate-200"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Restart camera
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || !photo || !gpsReady}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-xs font-bold text-white disabled:opacity-40"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit for admin approval
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
