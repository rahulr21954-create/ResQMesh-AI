import numpy as np
from scipy import signal

def extract_features(audio_samples, vib_samples_x, vib_samples_y, vib_samples_z, sample_rate=16000, vib_rate=200):
    """
    Extracts multimodal acoustic and vibration features from raw window buffers.
    """
    audio = np.array(audio_samples, dtype=float)
    if len(audio) == 0:
        audio = np.zeros(1600)
    
    # Normalize audio
    if np.max(np.abs(audio)) > 0:
        audio_norm = audio / (np.max(np.abs(audio)) + 1e-9)
    else:
        audio_norm = audio

    # 1. Acoustic Features
    audio_rms = float(np.sqrt(np.mean(audio ** 2)))
    audio_peak = float(np.max(np.abs(audio)))
    sound_energy_db = float(20 * np.log10(max(audio_rms, 1e-6)) + 94) # Approx SPL dB
    
    # Zero Crossing Rate
    zcr = float(np.mean(np.abs(np.diff(np.sign(audio_norm)))) / 2.0) if len(audio_norm) > 1 else 0.0

    # FFT & Spectral Centroid
    n_fft = len(audio)
    if n_fft > 16:
        fft_vals = np.abs(np.fft.rfft(audio))
        freqs = np.fft.rfftfreq(n_fft, d=1.0/sample_rate)
        sum_fft = np.sum(fft_vals)
        spectral_centroid = float(np.sum(freqs * fft_vals) / (sum_fft + 1e-9))
        
        # Energy in human voice band (300Hz - 3400Hz)
        voice_mask = (freqs >= 300) & (freqs <= 3400)
        voice_band_ratio = float(np.sum(fft_vals[voice_mask]) / (sum_fft + 1e-9))
    else:
        spectral_centroid = 0.0
        voice_band_ratio = 0.0

    # Tapping Periodicity via Autocorrelation (looking for 0.5Hz - 4Hz regular hits)
    tapping_periodicity = 0.0
    dominant_bpm = 0.0
    if len(audio_norm) > 100:
        # Envelope of audio
        analytic_signal = np.abs(audio_norm)
        # Downsample envelope to ~100Hz
        step = max(1, len(analytic_signal) // 200)
        envelope = analytic_signal[::step]
        env_norm = envelope - np.mean(envelope)
        
        if np.std(env_norm) > 1e-4:
            autocorr = np.correlate(env_norm, env_norm, mode='full')
            autocorr = autocorr[len(autocorr)//2:]
            
            # Search lag corresponding to 0.5 Hz to 4 Hz
            env_fs = sample_rate / step
            min_lag = int(env_fs / 4.0)
            max_lag = int(env_fs / 0.5)
            if max_lag < len(autocorr) and min_lag < max_lag:
                search_window = autocorr[min_lag:max_lag]
                peak_idx = np.argmax(search_window) + min_lag
                peak_val = autocorr[peak_idx] / (autocorr[0] + 1e-9)
                if peak_val > 0.25:
                    tapping_periodicity = float(np.clip(peak_val, 0.0, 1.0))
                    dominant_freq = env_fs / peak_idx
                    dominant_bpm = float(dominant_freq * 60)

    # 2. Vibration Features
    vx = np.array(vib_samples_x, dtype=float) if len(vib_samples_x) else np.zeros(20)
    vy = np.array(vib_samples_y, dtype=float) if len(vib_samples_y) else np.zeros(20)
    vz = np.array(vib_samples_z, dtype=float) if len(vib_samples_z) else np.zeros(20)

    # Total dynamic acceleration magnitude (removing 1g gravity)
    v_mag = np.sqrt(vx**2 + vy**2 + vz**2)
    dyn_vib = v_mag - np.mean(v_mag)

    vib_rms = float(np.sqrt(np.mean(dyn_vib ** 2)))
    vib_peak = float(np.max(np.abs(dyn_vib)))
    
    # Crest Factor (Peak / RMS) - High crest factor indicates sharp impulsive impacts (tapping/hammering)
    crest_factor = float(vib_peak / (vib_rms + 1e-6))
    
    # Kurtosis of vibration (detecting impulse sharpness)
    if vib_rms > 1e-5:
        vib_kurtosis = float(np.mean((dyn_vib / vib_rms)**4) - 3.0)
    else:
        vib_kurtosis = 0.0

    return {
        "audio_rms": round(audio_rms, 4),
        "audio_peak": round(audio_peak, 4),
        "sound_energy_db": round(sound_energy_db, 1),
        "zcr": round(zcr, 4),
        "spectral_centroid": round(spectral_centroid, 1),
        "voice_band_ratio": round(voice_band_ratio, 4),
        "tapping_periodicity": round(tapping_periodicity, 3),
        "dominant_bpm": round(dominant_bpm, 1),
        "vib_rms": round(vib_rms, 4),
        "vib_peak": round(vib_peak, 4),
        "crest_factor": round(crest_factor, 2),
        "vib_kurtosis": round(vib_kurtosis, 2)
    }

def extract_features_from_telemetry(telemetry):
    """
    Extracts/consolidates features directly from summarized node telemetry if raw buffer is absent.
    """
    audio_db = float(telemetry.get("audio_level", 35.0))
    vib_magnitude = float(telemetry.get("vibration_rms", 0.02))
    peak_vib = float(telemetry.get("vibration_peak", vib_magnitude * 1.5))
    dominant_freq = float(telemetry.get("dominant_freq", 120.0))
    tapping_detected = bool(telemetry.get("tapping_detected", False))

    crest = peak_vib / max(vib_magnitude, 1e-4)

    return {
        "sound_energy_db": audio_db,
        "vib_rms": vib_magnitude,
        "vib_peak": peak_vib,
        "crest_factor": round(crest, 2),
        "dominant_freq": dominant_freq,
        "tapping_periodicity": 0.85 if tapping_detected else float(telemetry.get("periodicity", 0.1)),
        "voice_band_ratio": float(telemetry.get("voice_band_ratio", 0.2)),
        "temperature": float(telemetry.get("temperature", 24.5))
    }
