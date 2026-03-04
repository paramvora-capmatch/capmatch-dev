"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import type { VisualizationData, LenderVizData } from "@/hooks/useMatchmaking";

interface MatchExplorer3DProps {
  data: VisualizationData;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

function scoreColor(t: number): string {
  if (t >= 70) return "#10b981";
  if (t >= 45) return "#f59e0b";
  return "#ef4444";
}

function barColor(s: number): string {
  if (s >= 0.7) return "#10b981";
  if (s >= 0.4) return "#f59e0b";
  return "#ef4444";
}

const PILLAR_META: Record<string, { label: string; icon: string; vars: string[] }> = {
  market_fit: { label: "Market Fit", icon: "\uD83C\uDF0D", vars: ["geography", "value_scale"] },
  capital_fit: { label: "Capital Fit", icon: "\uD83C\uDFE6", vars: ["loan_amount", "leverage", "coverage"] },
  product_fit: { label: "Product Fit", icon: "\uD83D\uDCCB", vars: ["affordability", "loan_purpose", "term_structure", "pricing"] },
};

function LenderDetailPanel({ lender, totalCount }: { lender: LenderVizData; totalCount: number }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const circ = 2 * Math.PI * 46;
  const offset = circ * (1 - lender.total_score / 100);
  const rc = scoreColor(lender.total_score);

  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-[17px] font-bold text-slate-200 leading-tight max-w-[280px] break-words">
            {lender.name}
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
            Rank #{lender.rank} of {totalCount} lenders
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="relative w-[110px] h-[110px]">
          <svg viewBox="0 0 110 110" className="w-[110px] h-[110px]" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(100,116,139,0.15)" strokeWidth="7" />
            <circle
              cx="55" cy="55" r="46" fill="none" stroke={rc} strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.22,1,.36,1)" }}
            />
          </svg>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="text-[26px] font-bold leading-none" style={{ color: rc }}>
              {lender.total_score.toFixed(1)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">/ 100</div>
          </div>
        </div>
      </div>

      <div className="text-[12.5px] leading-relaxed text-slate-400 p-3 bg-slate-800/30 rounded-lg italic">
        {lender.narrative}
      </div>

      {Object.entries(PILLAR_META).map(([key, meta]) => {
        const pval = lender.pillar_scores[key] || 0;
        const ppct = (pval * 100).toFixed(0);
        const pc = barColor(pval);
        const vars = lender.variables.filter((v) => meta.vars.includes(v.key));
        const isExpanded = expanded === key;

        return (
          <div key={key} className="rounded-lg border border-slate-700/50 overflow-hidden">
            <button
              onClick={() => setExpanded(isExpanded ? null : key)}
              className="w-full flex justify-between items-center px-3.5 py-2.5 hover:bg-slate-800/30 transition-colors"
            >
              <span className="text-[12px] font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span className="text-sm opacity-60">{meta.icon}</span> {meta.label}
              </span>
              <span className="flex items-center">
                <span className="text-[13px] font-bold" style={{ color: pc }}>{ppct}%</span>
                <span className={`text-[10px] text-slate-500 ml-2 transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                  &#9660;
                </span>
              </span>
            </button>
            {isExpanded && (
              <div className="px-3.5 pb-3.5 space-y-3">
                {vars.map((v) => {
                  const vp = (v.score * 100).toFixed(0);
                  const vc = barColor(v.score);
                  return (
                    <div key={v.key}>
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[11.5px] font-medium text-slate-300">{v.name}</span>
                        <span className="text-[11.5px] font-semibold" style={{ color: vc }}>{vp}%</span>
                      </div>
                      <div className="h-1 bg-slate-700/30 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${vp}%`, background: vc }}
                        />
                      </div>
                      <p className="text-[10.5px] text-slate-500 leading-snug mt-1">{v.explanation}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">
                        Weight: {v.weight} &middot; Contribution: {v.weighted.toFixed(1)} pts
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const MatchExplorer3D: React.FC<MatchExplorer3DProps> = ({ data, expanded, onToggleExpand }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const labelRendererRef = useRef<any>(null);
  const lenderMeshesRef = useRef<any[]>([]);
  const animFrameRef = useRef<number>(0);

  const [selectedLender, setSelectedLender] = useState<LenderVizData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLenderClick = useCallback(
    (index: number) => {
      setSelectedLender(data.lenders[index]);
    },
    [data.lenders]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;

    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { CSS2DRenderer, CSS2DObject } = await import("three/examples/jsm/renderers/CSS2DRenderer.js");

      if (disposed || !containerRef.current) return;

      const container = containerRef.current;
      const S = data.sceneScale;
      const MID = S / 2;

      const W = container.clientWidth;
      const H = container.clientHeight;

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(W, H);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0f172a);
      scene.fog = new THREE.FogExp2(0x0f172a, 0.012);
      sceneRef.current = scene;

      // CSS2D label renderer
      const labelRenderer = new CSS2DRenderer();
      labelRenderer.setSize(W, H);
      labelRenderer.domElement.style.position = "absolute";
      labelRenderer.domElement.style.top = "0";
      labelRenderer.domElement.style.left = "0";
      labelRenderer.domElement.style.pointerEvents = "none";
      container.appendChild(labelRenderer.domElement);
      labelRendererRef.current = labelRenderer;

      // Camera
      const camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 200);
      const camFinal = new THREE.Vector3(S + 4, S + 2, S + 5);
      camera.position.set(S * 3.5, S * 2.5, S * 3.5);
      camera.lookAt(MID, MID, MID);
      cameraRef.current = camera;

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;
      controls.target.set(MID, MID, MID);
      controls.minDistance = 3;
      controls.maxDistance = 45;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
      controlsRef.current = controls;

      // Lights
      scene.add(new THREE.AmbientLight(0x94a3b8, 0.5));
      const dir1 = new THREE.DirectionalLight(0xffffff, 1.3);
      dir1.position.set(S + 4, S + 6, S + 4);
      scene.add(dir1);
      const dir2 = new THREE.DirectionalLight(0x3b82f6, 0.25);
      dir2.position.set(-4, -2, -6);
      scene.add(dir2);

      // Stars
      const starGeo = new THREE.BufferGeometry();
      const starPos = new Float32Array(1200 * 3);
      for (let i = 0; i < starPos.length; i++) starPos[i] = (Math.random() - 0.5) * 100;
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x475569, size: 0.06, transparent: true, opacity: 0.5 })));

      // Grid
      const gridSize = S + 2;
      const grid = new THREE.GridHelper(gridSize, Math.round(gridSize / 0.5), 0x1e293b, 0x1a2235);
      grid.position.set(MID, -0.02, MID);
      scene.add(grid);

      // Bounding cube
      const cubeEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(S, S, S));
      const cubeLine = new THREE.LineSegments(
        cubeEdges,
        new THREE.LineDashedMaterial({ color: 0x334155, dashSize: 0.2, gapSize: 0.15, transparent: true, opacity: 0.25 })
      );
      cubeLine.position.set(MID, MID, MID);
      cubeLine.computeLineDistances();
      scene.add(cubeLine);

      // Axes
      const axConf = [
        { dir: [1, 0, 0], color: 0x3b82f6, label: "Market Fit \u2192", cls: "x-ax" },
        { dir: [0, 1, 0], color: 0x10b981, label: "Capital Fit \u2191", cls: "y-ax" },
        { dir: [0, 0, 1], color: 0xf59e0b, label: "Product Fit \u2193", cls: "z-ax" },
      ];

      const clsToColor: Record<string, string> = {
        "x-ax": "rgba(96,165,250,1)",
        "y-ax": "rgba(52,211,153,1)",
        "z-ax": "rgba(251,191,36,1)",
      };

      axConf.forEach((a) => {
        const end = S + 0.6;
        const pts = [new THREE.Vector3(), new THREE.Vector3(a.dir[0] * end, a.dir[1] * end, a.dir[2] * end)];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        scene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: a.color, transparent: true, opacity: 0.3 })));

        const arrowDir = new THREE.Vector3(...a.dir);
        const arrowPos = arrowDir.clone().multiplyScalar(end);
        const arrow = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.25, 8),
          new THREE.MeshBasicMaterial({ color: a.color, transparent: true, opacity: 0.5 })
        );
        arrow.position.copy(arrowPos);
        if (a.dir[0]) arrow.rotation.z = -Math.PI / 2;
        else if (a.dir[2]) arrow.rotation.x = Math.PI / 2;
        scene.add(arrow);

        const div = document.createElement("div");
        div.style.cssText = `font-family:Inter,system-ui,sans-serif;font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;white-space:nowrap;pointer-events:none;color:${clsToColor[a.cls]}`;
        div.textContent = a.label;
        const lbl = new CSS2DObject(div);
        lbl.position.set(a.dir[0] * (end + 0.5), a.dir[1] * (end + 0.5), a.dir[2] * (end + 0.5));
        scene.add(lbl);
      });

      // Lender spheres
      const sphereGeo = new THREE.SphereGeometry(1, 32, 24);
      const lenderMeshes: THREE.Mesh[] = [];

      function lerpColor(t: number): THREE.Color {
        const c = new THREE.Color();
        if (t < 50) c.lerpColors(new THREE.Color(0xef4444), new THREE.Color(0xf59e0b), t / 50);
        else c.lerpColors(new THREE.Color(0xf59e0b), new THREE.Color(0x10b981), (t - 50) / 50);
        return c;
      }

      data.lenders.forEach((l, i) => {
        const radius = 0.12 + (l.total_score / 100) * 0.32;
        const color = lerpColor(l.total_score);
        const mat = new THREE.MeshStandardMaterial({
          color, metalness: 0.15, roughness: 0.3,
          transparent: true, opacity: 0.88,
          emissive: color, emissiveIntensity: 0.12,
        });
        const mesh = new THREE.Mesh(sphereGeo, mat);
        mesh.scale.setScalar(radius);
        mesh.position.set(l.x, l.y, l.z);
        mesh.userData = { index: i, baseRadius: radius, baseOpacity: 0.88 };
        scene.add(mesh);
        lenderMeshes.push(mesh);
      });
      lenderMeshesRef.current = lenderMeshes;

      // Top 3 rank labels + dashed lines to deal
      const top3 = data.lenders.slice(0, Math.min(3, data.lenders.length));
      top3.forEach((l, i) => {
        const pts = [new THREE.Vector3(l.x, l.y, l.z), new THREE.Vector3(data.deal.x, data.deal.y, data.deal.z)];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineDashedMaterial({
          color: 0xfbbf24, dashSize: 0.25, gapSize: 0.12,
          transparent: true, opacity: 0.4 + (2 - i) * 0.1,
        });
        const line = new THREE.Line(geo, mat);
        line.computeLineDistances();
        scene.add(line);

        const div = document.createElement("div");
        div.style.cssText = `font-family:Inter,system-ui,sans-serif;font-size:10px;font-weight:700;background:rgba(251,191,36,0.9);color:#0f172a;padding:1px 6px;border-radius:4px;pointer-events:none;white-space:nowrap`;
        const displayName = l.name.length > 18 ? l.name.slice(0, 18) + "\u2026" : l.name;
        div.textContent = `#${i + 1} ${displayName}`;
        const lbl = new CSS2DObject(div);
        lbl.position.set(l.x, l.y + 0.5, l.z);
        scene.add(lbl);
      });

      // Deal marker
      const dealMesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.4, 0),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.4, roughness: 0.2, emissive: 0xfbbf24, emissiveIntensity: 0.45 })
      );
      dealMesh.position.set(data.deal.x, data.deal.y, data.deal.z);
      scene.add(dealMesh);

      const dealWire = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.55, 0)),
        new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.25 })
      );
      dealWire.position.copy(dealMesh.position);
      scene.add(dealWire);

      const dealDiv = document.createElement("div");
      dealDiv.style.cssText = `font-family:Inter,system-ui,sans-serif;font-size:12px;font-weight:700;color:#fbbf24;pointer-events:none;text-shadow:0 0 12px rgba(251,191,36,0.4)`;
      dealDiv.textContent = "YOUR DEAL";
      const dealLabel = new CSS2DObject(dealDiv);
      dealLabel.position.set(data.deal.x, data.deal.y + 0.65, data.deal.z);
      scene.add(dealLabel);

      // Raycaster
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2(-9, -9);

      const onPointerMove = (e: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      };

      const onClick = () => {
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(lenderMeshes);
        if (hits.length > 0) {
          handleLenderClick(hits[0].object.userData.index);
        }
      };

      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("click", onClick);

      // Idle timer for auto-rotate
      let idleTimer: ReturnType<typeof setTimeout> | null = null;
      const pauseRotation = () => {
        controls.autoRotate = false;
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => { controls.autoRotate = true; }, 5000);
      };
      controls.addEventListener("start", pauseRotation);

      // Intro camera animation
      let introT = 0;
      const introFrom = camera.position.clone();

      // Animation loop
      const animate = () => {
        if (disposed) return;
        animFrameRef.current = requestAnimationFrame(animate);

        if (introT < 1) {
          introT += 0.01;
          const ease = 1 - Math.pow(1 - Math.min(1, introT), 3);
          camera.position.lerpVectors(introFrom, camFinal, ease);
        }

        dealMesh.rotation.y += 0.007;
        dealMesh.rotation.x += 0.003;
        dealWire.rotation.y -= 0.004;
        dealWire.rotation.z += 0.003;

        controls.update();

        // Tooltip via raycaster
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(lenderMeshes);
        lenderMeshes.forEach((m) => {
          m.scale.setScalar(m.userData.baseRadius);
          (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.12;
        });
        if (hits.length > 0) {
          const m = hits[0].object as THREE.Mesh;
          m.scale.setScalar(m.userData.baseRadius * 1.35);
          (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3;
          renderer.domElement.style.cursor = "pointer";
        } else {
          renderer.domElement.style.cursor = "default";
        }

        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
      };
      animate();

      // Auto-select top match after intro
      if (data.lenders.length > 0) {
        setTimeout(() => handleLenderClick(0), 1200);
      }

      // Resize observer
      const ro = new ResizeObserver(() => {
        if (disposed || !container) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        labelRenderer.setSize(w, h);
      });
      ro.observe(container);

      // Cleanup stored for disposal
      (container as any).__cleanup = () => {
        ro.disconnect();
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("click", onClick);
        controls.removeEventListener("start", pauseRotation);
        if (idleTimer) clearTimeout(idleTimer);
        cancelAnimationFrame(animFrameRef.current);
        renderer.dispose();
        scene.clear();
        container.removeChild(renderer.domElement);
        container.removeChild(labelRenderer.domElement);
      };
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(animFrameRef.current);
      if (containerRef.current && (containerRef.current as any).__cleanup) {
        (containerRef.current as any).__cleanup();
      }
    };
  }, [data, handleLenderClick]);

  // Search filter
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    lenderMeshesRef.current.forEach((m, i) => {
      if (!m?.material) return;
      const l = data.lenders[i];
      const hit = !q || l.name.toLowerCase().includes(q) || l.lei.toLowerCase().includes(q);
      (m.material as any).opacity = hit ? m.userData.baseOpacity : 0.06;
      (m.material as any).emissiveIntensity = hit ? 0.12 : 0.0;
    });
  }, [searchQuery, data.lenders]);

  // When expanded, sit below the app header (DashboardLayout sticky nav) so the diagram doesn't go under it
  const HEADER_OFFSET_PX = 56;
  const wrapperClasses = expanded
    ? "fixed left-0 right-0 bottom-0 z-50 flex flex-col"
    : "flex rounded-xl overflow-hidden border border-slate-700/50";

  return (
    <div
      className={wrapperClasses}
      style={{
        ...(expanded
          ? { top: HEADER_OFFSET_PX, height: `calc(100vh - ${HEADER_OFFSET_PX}px)` }
          : { height: "600px" }),
        background: "#0f172a",
      }}
    >
      <div className="flex flex-1 overflow-hidden">
        {/* 3D scene */}
        <div className="flex-1 relative min-w-0" ref={containerRef}>
          {/* Search overlay */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/90 backdrop-blur border border-slate-700/50 shadow-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 opacity-40">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search lenders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-slate-200 text-sm w-48 placeholder:text-slate-600 font-[Inter,system-ui,sans-serif]"
            />
          </div>

          {/* Deal title */}
          <div className="absolute top-4 left-4 z-10 text-[13px] font-semibold text-slate-400 tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            {data.deal.name}
          </div>

          {/* Expand / Collapse button */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-slate-800/90 backdrop-blur border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700/90 transition-colors"
              title={expanded ? "Exit full screen" : "Expand to full screen"}
            >
              {expanded ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <polyline points="4 14 8 14 8 18" /><polyline points="20 10 16 10 16 6" />
                  <line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              )}
            </button>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-10 flex gap-2.5 flex-wrap">
            {[
              { color: "#10b981", label: "Strong (\u226570)" },
              { color: "#f59e0b", label: "Moderate (45-69)" },
              { color: "#ef4444", label: "Weak (<45)" },
            ].map((item) => (
              <div key={item.label} className="px-3 py-1 rounded-lg text-[11px] font-medium bg-slate-800/90 backdrop-blur border border-slate-700/50 text-slate-300">
                <span className="inline-block w-[7px] h-[7px] rounded-full mr-1.5" style={{ background: item.color }} />
                {item.label}
              </div>
            ))}
            <div className="px-3 py-1 rounded-lg text-[11px] font-medium bg-slate-800/90 backdrop-blur border border-slate-700/50 text-slate-300">
              {data.lenders.length} lenders
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className={`${expanded ? "w-[450px] min-w-[450px]" : "w-[400px] min-w-[400px]"} bg-[#131c2e] border-l border-slate-700/50 overflow-y-auto`}>
          {selectedLender ? (
            <LenderDetailPanel lender={selectedLender} totalCount={data.lenders.length} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-[13px] text-center px-10 gap-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 opacity-25">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4l2 2" />
              </svg>
              Click any lender sphere<br />to explore match details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
