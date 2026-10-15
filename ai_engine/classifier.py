import numpy as np

class SurvivorSignalClassifier:
    """
    Multimodal signal classifier and anomaly detection engine for disaster search-and-rescue.
    """

    CLASSES = [
        "NORMAL_BACKGROUND",
        "STRUCTURAL_SETTLING",
        "SURVIVOR_RHYTHMIC_TAPPING",
        "SURVIVOR_VOCALIZATION",
        "SURVIVOR_SCRATCHING_MOVEMENT",
        "EXTERIOR_INTERFERENCE"
    ]

    def __init__(self):
        # Calibrated baseline thresholds for search-and-rescue rubble environments
        self.baseline_sound_db = 42.0
        self.baseline_vib_rms = 0.04

    def analyze_node_features(self, feat):
        """
        Takes extracted features dictionary and returns classification, anomaly score,
        and evidence confidence.
        """
        sound_db = feat.get("sound_energy_db", 35.0)
        vib_rms = feat.get("vib_rms", 0.02)
        crest_factor = feat.get("crest_factor", 1.2)
        tapping_periodicity = feat.get("tapping_periodicity", 0.0)
        dominant_bpm = feat.get("dominant_bpm", 0.0)
        voice_ratio = feat.get("voice_band_ratio", 0.1)
        zcr = feat.get("zcr", 0.05)

        # 1. Anomaly Score (0.0 to 1.0)
        sound_delta = max(0.0, sound_db - self.baseline_sound_db) / 50.0
        vib_delta = max(0.0, vib_rms - self.baseline_vib_rms) / 0.8
        raw_anomaly = 0.5 * min(1.0, sound_delta) + 0.5 * min(1.0, vib_delta)
        
        # Boost anomaly if rhythmic tapping detected
        if tapping_periodicity > 0.4:
            raw_anomaly = max(raw_anomaly, 0.7 + 0.25 * tapping_periodicity)

        anomaly_score = float(np.clip(raw_anomaly, 0.0, 1.0))

        # 2. Heuristic and Feature Rule Analysis
        probabilities = {
            "NORMAL_BACKGROUND": 0.0,
            "STRUCTURAL_SETTLING": 0.0,
            "SURVIVOR_RHYTHMIC_TAPPING": 0.0,
            "SURVIVOR_VOCALIZATION": 0.0,
            "SURVIVOR_SCRATCHING_MOVEMENT": 0.0,
            "EXTERIOR_INTERFERENCE": 0.0
        }

        # Check for Rhythmic Tapping (Key Survivor Indicator)
        if tapping_periodicity > 0.35 and (sound_db > 48.0 or crest_factor > 2.8):
            tap_score = 0.4 + (tapping_periodicity * 0.4) + min(0.2, (crest_factor / 15.0))
            probabilities["SURVIVOR_RHYTHMIC_TAPPING"] = min(0.98, tap_score)

        # Check for Survivor Vocalization / Cry
        if voice_ratio > 0.45 and sound_db > 52.0 and vib_rms < 0.15:
            voc_score = 0.3 + (voice_ratio * 0.5) + min(0.2, (sound_db - 50) / 40.0)
            probabilities["SURVIVOR_VOCALIZATION"] = min(0.95, voc_score)

        # Check for Scratching / Rubble Movement
        if zcr > 0.15 and sound_db > 45.0 and 0.03 < vib_rms < 0.25:
            scratch_score = 0.35 + (zcr * 0.3) + (vib_rms * 1.5)
            probabilities["SURVIVOR_SCRATCHING_MOVEMENT"] = min(0.90, scratch_score)

        # Check for Structural Settling (high vibration, heavy low rumbling, no periodicity)
        if vib_rms > 0.18 and tapping_periodicity < 0.25 and sound_db < 60.0:
            settling_score = min(0.92, 0.4 + (vib_rms * 1.8))
            probabilities["STRUCTURAL_SETTLING"] = settling_score

        # Check for Exterior Noise (heavy vehicle / generator / siren)
        if sound_db > 75.0 and vib_rms > 0.25 and tapping_periodicity < 0.2:
            probabilities["EXTERIOR_INTERFERENCE"] = 0.85

        # Normal background fallback
        if max(probabilities.values()) < 0.3:
            probabilities["NORMAL_BACKGROUND"] = 0.85

        # Normalize probabilities
        prob_sum = sum(probabilities.values())
        if prob_sum > 0:
            probabilities = {k: round(v / prob_sum, 3) for k, v in probabilities.items()}

        top_class = max(probabilities, key=probabilities.get)
        confidence = probabilities[top_class]

        # Calculate survivor evidence index (0 to 100)
        survivor_prob = (
            probabilities["SURVIVOR_RHYTHMIC_TAPPING"] * 1.0 +
            probabilities["SURVIVOR_VOCALIZATION"] * 0.95 +
            probabilities["SURVIVOR_SCRATCHING_MOVEMENT"] * 0.8
        )
        evidence_index = int(np.clip(survivor_prob * 100, 0, 100))

        # Explainable reasons
        explanations = []
        if tapping_periodicity > 0.35:
            explanations.append(f"Periodic rhythm detected at {dominant_bpm:.0f} BPM (periodicity metric: {tapping_periodicity:.2f})")
        if crest_factor > 3.0:
            explanations.append(f"Sharp impulsive crest factor: {crest_factor:.1f} (indicates mechanical impact on solid structure)")
        if voice_ratio > 0.45:
            explanations.append(f"Elevated acoustic energy in 300-3400Hz human vocal band ({int(voice_ratio*100)}%)")
        if vib_rms > 0.1:
            explanations.append(f"Physical surface vibration: {vib_rms:.3f}g RMS")
        if not explanations:
            explanations.append("Acoustic and vibration levels match nominal rubble baseline conditions.")

        return {
            "top_pattern": top_class,
            "confidence": round(float(confidence), 3),
            "anomaly_score": round(anomaly_score, 3),
            "evidence_index": evidence_index,
            "probabilities": probabilities,
            "explanations": explanations
        }
