import numpy as np

class SensorFusionEngine:
    """
    Combines evidence across distributed sensor nodes and time windows.
    Estimates spatial priority zones using signal attenuation models and
    cross-node spatial correlation.
    """

    def __init__(self, site_width=60.0, site_height=60.0, grid_resolution=15):
        self.site_width = site_width
        self.site_height = site_height
        self.grid_res = grid_resolution
        
        # Sector definitions: Rows A-D, Cols 1-4
        self.sector_rows = ['A', 'B', 'C', 'D']
        self.sector_cols = [1, 2, 3, 4]

    def get_sector_name(self, x, y):
        col_idx = int(np.clip(x / (self.site_width / len(self.sector_cols)), 0, len(self.sector_cols) - 1))
        # Tactical North orientation: Row A is North (top, 45-60m), Row B is (30-45m), Row C is (15-30m), Row D is South (0-15m)
        row_idx = int(np.clip((self.site_height - y) / (self.site_height / len(self.sector_rows)), 0, len(self.sector_rows) - 1))
        return f"Sector {self.sector_rows[row_idx]}{self.sector_cols[col_idx]}"

    def fuse_mesh_evidence(self, nodes, history_window=None):
        """
        nodes: list of dicts:
        [
          {
            "id": "node-01",
            "name": "Node A (North Rubble)",
            "x": 18.0,
            "y": 42.0,
            "evidence_index": 85,
            "sound_energy_db": 68.5,
            "vib_rms": 0.14,
            "top_pattern": "SURVIVOR_RHYTHMIC_TAPPING",
            "confidence": 0.88,
            "online": True
          }, ...
        ]
        """
        active_nodes = [n for n in nodes if n.get("online", True)]
        if not active_nodes:
            return self._empty_result()

        # Build 2D probabilistic evidence grid
        xs = np.linspace(0, self.site_width, self.grid_res)
        ys = np.linspace(0, self.site_height, self.grid_res)
        heat_grid = np.zeros((self.grid_res, self.grid_res))

        elevated_nodes = []
        for n in active_nodes:
            # Check either direct or nested inside latest_telemetry
            tel = n.get("latest_telemetry", {})
            ev = n.get("evidence_index", tel.get("evidence_index", 0))
            if ev > 40:
                elevated_nodes.append(n)
        num_elevated = len(elevated_nodes)

        # Signal attenuation parameter (rubble attenuation factor alpha ~ 1.6 to 2.2)
        alpha = 1.8

        weights = []
        node_coords = []

        for node in active_nodes:
            nx = float(node.get("x", 20.0))
            ny = float(node.get("y", 20.0))
            tel = node.get("latest_telemetry", {})
            ev = float(node.get("evidence_index", tel.get("evidence_index", 0)))
            sound = float(node.get("sound_energy_db", tel.get("audio_level", 35.0)))
            vib = float(node.get("vib_rms", tel.get("vibration_rms", 0.02)))

            # Composite node signal weight
            sig_weight = (ev / 100.0) * 0.6 + (min(1.0, max(0.0, (sound - 35) / 45.0))) * 0.2 + (min(1.0, vib / 0.3)) * 0.2
            weights.append(sig_weight)
            node_coords.append([nx, ny])

            # Project probability cloud from this node into grid
            for i, gy in enumerate(ys):
                for j, gx in enumerate(xs):
                    dist = np.sqrt((gx - nx)**2 + (gy - ny)**2) + 1.5
                    # Inverse distance decay
                    contribution = sig_weight / (dist ** alpha)
                    heat_grid[i, j] += contribution

        weights = np.array(weights)
        node_coords = np.array(node_coords)

        # Normalize heatmap to 0-100 scale
        max_heat = np.max(heat_grid) if np.max(heat_grid) > 0 else 1.0
        heat_grid_normalized = (heat_grid / max_heat) * 100.0

        # Multi-node correlation calculation
        # If multiple neighboring nodes have elevated evidence, correlation is high
        if num_elevated >= 2:
            multi_node_correlation = min(0.96, 0.55 + (num_elevated * 0.15))
            agreement_status = f"HIGH MULTI-NODE CORRELATION ({num_elevated} nodes in consensus)"
        elif num_elevated == 1:
            multi_node_correlation = 0.45
            agreement_status = "SINGLE NODE ISOLATED ELEVATION (Requires cross-verification)"
        else:
            multi_node_correlation = 0.1
            agreement_status = "BACKGROUND NOMINAL (No significant anomalies detected)"

        # Epicenter Localization (Weighted Centroid + Peak Grid Cell)
        if np.sum(weights) > 0.1:
            # Weighted average coordinates
            est_x = float(np.sum(weights * node_coords[:, 0]) / np.sum(weights))
            est_y = float(np.sum(weights * node_coords[:, 1]) / np.sum(weights))
            
            # Blend with peak grid cell for non-linear clustering
            peak_idx = np.unravel_index(np.argmax(heat_grid), heat_grid.shape)
            peak_y = float(ys[peak_idx[0]])
            peak_x = float(xs[peak_idx[1]])
            
            final_x = round(0.65 * est_x + 0.35 * peak_x, 1)
            final_y = round(0.65 * est_y + 0.35 * peak_y, 1)
            
            # Estimated depth (approximate heuristic based on high frequency acoustic attenuation)
            avg_elevated_db = np.mean([n.get("sound_energy_db", n.get("latest_telemetry", {}).get("audio_level", 40)) for n in elevated_nodes]) if elevated_nodes else 40
            est_depth = round(max(0.5, min(4.5, 3.8 - (avg_elevated_db / 35.0))), 1)
        else:
            final_x = self.site_width / 2.0
            final_y = self.site_height / 2.0
            est_depth = 0.0

        target_sector = self.get_sector_name(final_x, final_y)

        # Calculate Overall Priority Level and Confidence
        max_node_ev = max([n.get("evidence_index", n.get("latest_telemetry", {}).get("evidence_index", 0)) for n in active_nodes]) if active_nodes else 0
        overall_evidence = int(np.clip(max_node_ev * 0.7 + (multi_node_correlation * 100 * 0.3), 0, 100))

        if overall_evidence >= 75 and num_elevated >= 2:
            priority_level = "CRITICAL"
            recommended_action = f"PRIORITY RESCUE DISPATCH: Investigate {target_sector} immediately. Use acoustic probe at coords ({final_x}m, {final_y}m)."
        elif overall_evidence >= 50:
            priority_level = "ELEVATED"
            recommended_action = f"FOCUSED SEARCH: Deploy secondary listening gear to {target_sector}. Maintain 60s silence protocol."
        elif overall_evidence >= 30:
            priority_level = "MONITORING"
            recommended_action = "CONTINUED MONITORING: Potential structural settling or transient noise. Observation ongoing."
        else:
            priority_level = "NOMINAL"
            recommended_action = "STANDBY: No distress signatures detected across sensor mesh."

        # Flatten heatmap for JSON transmission to frontend
        heatmap_points = []
        for i, gy in enumerate(ys):
            for j, gx in enumerate(xs):
                val = float(heat_grid_normalized[i, j])
                if val > 8.0: # Filter out baseline floor for efficient payload
                    heatmap_points.append({
                        "x": round(float(gx), 1),
                        "y": round(float(gy), 1),
                        "intensity": round(val, 1)
                    })

        return {
            "priority_level": priority_level,
            "target_sector": target_sector,
            "estimated_coords": {"x": final_x, "y": final_y},
            "estimated_depth_m": est_depth,
            "evidence_score": overall_evidence,
            "correlation_score": round(float(multi_node_correlation), 2),
            "multi_node_agreement": agreement_status,
            "num_elevated_nodes": num_elevated,
            "recommended_action": recommended_action,
            "heatmap": heatmap_points
        }

    def _empty_result(self):
        return {
            "priority_level": "NOMINAL",
            "target_sector": "Sector None",
            "estimated_coords": {"x": 30.0, "y": 30.0},
            "estimated_depth_m": 0.0,
            "evidence_score": 0,
            "correlation_score": 0.0,
            "multi_node_agreement": "NO ACTIVE NODES",
            "num_elevated_nodes": 0,
            "recommended_action": "Power on ESP32 sensor nodes to initiate mesh coverage.",
            "heatmap": []
        }
