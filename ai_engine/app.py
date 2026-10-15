import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from feature_extraction import extract_features, extract_features_from_telemetry
from classifier import SurvivorSignalClassifier
from fusion_spatial import SensorFusionEngine

app = Flask(__name__)
CORS(app)

classifier = SurvivorSignalClassifier()
fusion_engine = SensorFusionEngine()

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "online",
        "service": "RescueMesh AI Fusion Service",
        "version": "1.0.0",
        "supported_patterns": classifier.CLASSES
    })

@app.route("/api/ai/analyze_node", methods=["POST"])
def analyze_node():
    data = request.json or {}
    
    # If raw samples provided, compute deep features
    if "audio_samples" in data and "vib_samples_x" in data:
        features = extract_features(
            data["audio_samples"],
            data.get("vib_samples_x", []),
            data.get("vib_samples_y", []),
            data.get("vib_samples_z", [])
        )
    else:
        # Compute from summarized telemetry
        features = extract_features_from_telemetry(data)

    analysis = classifier.analyze_node_features(features)
    
    return jsonify({
        "features": features,
        "analysis": analysis
    })

@app.route("/api/ai/fuse_mesh", methods=["POST"])
def fuse_mesh():
    data = request.json or {}
    nodes = data.get("nodes", [])
    history = data.get("history", [])

    fusion_result = fusion_engine.fuse_mesh_evidence(nodes, history)
    return jsonify(fusion_result)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"RescueMesh AI Fusion Engine running on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
