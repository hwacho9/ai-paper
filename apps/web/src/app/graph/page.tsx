"use client";

/**
 * グラフビューページ
 * すべての論文と関連研究のコネクショングラフ
 * Canvas/SVGベースのネットワークビジュアライゼーション
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { relatedApi } from "@/lib/api/related";

// ノードデータ（内部用）
interface GraphNode {
    id: string;
    label: string;
    type: "project" | "owned" | "related";
    x: number;
    y: number;
    vx: number;
    vy: number;
    group?: string; // from API
    val?: number; // from API
}

interface GraphEdge {
    source: string;
    target: string;
    strength: number;
}

export default function GraphPage() {
    const router = useRouter();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // State for Real Data
    const [nodes, setNodes] = useState<GraphNode[]>([]);
    const [edges, setEdges] = useState<GraphEdge[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [showMyPapers, setShowMyPapers] = useState(true);
    const [showRelated, setShowRelated] = useState(true);
    const [showProjects, setShowProjects] = useState(true);

    const nodesRef = useRef<GraphNode[]>([]); // Ref for animation loop
    const edgesRef = useRef<GraphEdge[]>([]); // Ref for animation loop

    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const animationRef = useRef<number>(0);
    const dragRef = useRef<{
        nodeId: string | null;
        offsetX: number;
        offsetY: number;
    }>({ nodeId: null, offsetX: 0, offsetY: 0 });

    // 1. Fetch Data
    useEffect(() => {
        const loadGraph = async () => {
            setLoading(true);
            try {
                const data = await relatedApi.getGlobalGraph();
                console.log("Graph API Data:", data); // Debug

                // Transform API nodes to GraphNodes with random initial positions
                const newNodes: GraphNode[] = data.nodes.map((n) => {
                    const type =
                        n.group === "project"
                            ? "project"
                            : n.group === "related"
                              ? "related"
                              : "owned";
                    return {
                        id: n.id,
                        label: n.label,
                        type: type,
                        x: Math.random() * 800, // Random init
                        y: Math.random() * 600,
                        vx: 0,
                        vy: 0,
                        val: n.val,
                    };
                });
                console.log("Transformed Nodes:", newNodes); // Debug
                console.log("Type Counts:", {
                    project: newNodes.filter((n) => n.type === "project")
                        .length,
                    related: newNodes.filter((n) => n.type === "related")
                        .length,
                    owned: newNodes.filter((n) => n.type === "owned").length,
                });

                const newEdges: GraphEdge[] = data.edges.map((e) => ({
                    source: e.source,
                    target: e.target,
                    strength: e.value || 0.5,
                }));

                setNodes(newNodes);
                setEdges(newEdges);

                // Initialize refs
                nodesRef.current = newNodes;
                edgesRef.current = newEdges;
            } catch (err) {
                console.error(err);
                setError("データの取得に失敗しました");
            } finally {
                setLoading(false);
            }
        };
        loadGraph();
    }, []);

    // 2. Filter Update
    useEffect(() => {
        // Filter nodes based on state
        const filteredNodes = nodes.filter((n) => {
            if (n.type === "project") return showProjects;
            if (n.type === "owned") return showMyPapers;
            if (n.type === "related") return showRelated;
            return true;
        });

        // Filter edges: both source and target must be in filteredNodes
        const nodeIds = new Set(filteredNodes.map((n) => n.id));
        const filteredEdges = edges.filter(
            (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
        );

        // Update Refs for simulation (preserve positions of existing nodes)
        // We need to map back to existing instances to keep x/y/vx/vy
        const currentMap = new Map(nodesRef.current.map((n) => [n.id, n]));

        nodesRef.current = filteredNodes.map((n) => {
            const existing = currentMap.get(n.id);
            if (existing) return existing; // Keep position
            return n; // New (shouldn't happen often in filter)
        });
        edgesRef.current = filteredEdges;
    }, [showMyPapers, showRelated, showProjects, nodes, edges]);

    // 3. Simulation & Rendering
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resizeCanvas = () => {
            const rect = canvas.parentElement!.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        };
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        // 簡易力学シミュレーション
        const simulate = () => {
            const nodes = nodesRef.current;
            const currentEdges = edgesRef.current;

            const damping = 0.9;
            const repulsion = 4000;
            const attraction = 0.008; // Increased slightly for connectivity
            const centerGravity = 0.005;

            const cx = canvas.width / 2;
            const cy = canvas.height / 2;

            for (const node of nodes) {
                // 中心への引力
                node.vx += (cx - node.x) * centerGravity;
                node.vy += (cy - node.y) * centerGravity;

                // ノード間の反発力
                for (const other of nodes) {
                    if (node.id === other.id) continue;
                    const dx = node.x - other.x;
                    const dy = node.y - other.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
                    const force = repulsion / (dist * dist);
                    node.vx += (dx / dist) * force;
                    node.vy += (dy / dist) * force;
                }
            }

            // エッジによる引力
            for (const edge of currentEdges) {
                const source = nodes.find((n) => n.id === edge.source);
                const target = nodes.find((n) => n.id === edge.target);
                if (!source || !target) continue;
                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Spring force
                const force = (dist - 100) * attraction * edge.strength; // Equilibrium length 100

                source.vx += (dx / dist) * force;
                source.vy += (dy / dist) * force;
                target.vx -= (dx / dist) * force;
                target.vy -= (dy / dist) * force;
            }

            // 位置更新
            for (const node of nodes) {
                if (dragRef.current.nodeId === node.id) continue;
                node.vx *= damping;
                node.vy *= damping;
                node.x += node.vx;
                node.y += node.vy;
                // 境界制限
                const padding = 40;
                node.x = Math.max(
                    padding,
                    Math.min(canvas.width - padding, node.x),
                );
                node.y = Math.max(
                    padding,
                    Math.min(canvas.height - padding, node.y),
                );
            }
        };

        // 描画
        const draw = () => {
            const nodes = nodesRef.current;
            const currentEdges = edgesRef.current;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // エッジ
            for (const edge of currentEdges) {
                const source = nodes.find((n) => n.id === edge.source);
                const target = nodes.find((n) => n.id === edge.target);
                if (!source || !target) continue;

                const isHighlighted =
                    hoveredNode === source.id || hoveredNode === target.id;
                ctx.beginPath();
                ctx.moveTo(source.x, source.y);
                ctx.lineTo(target.x, target.y);
                ctx.strokeStyle = isHighlighted
                    ? `rgba(130, 120, 255, ${0.4 + edge.strength * 0.5})`
                    : `rgba(100, 100, 140, ${0.15 + edge.strength * 0.15})`;
                ctx.lineWidth = isHighlighted ? 2 : 1;
                ctx.stroke();
            }

            // ノード
            for (const node of nodes) {
                const isProject = node.type === "project";
                const isOwned = node.type === "owned";
                const isRelated = node.type === "related";

                const isHovered = hoveredNode === node.id;
                const isSelected = selectedNode?.id === node.id;

                // Size
                let radius = 16;
                if (isProject) radius = 30;
                else if (isOwned) radius = 20;

                // グロー
                if (isHovered || isSelected) {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, radius + 8, 0, Math.PI * 2);

                    if (isProject) ctx.fillStyle = "rgba(160, 100, 255, 0.2)";
                    else if (isOwned)
                        ctx.fillStyle = "rgba(130, 120, 255, 0.15)";
                    else ctx.fillStyle = "rgba(100, 180, 160, 0.15)";

                    ctx.fill();
                }

                // ノード本体 - Gradient
                const gradient = ctx.createRadialGradient(
                    node.x - widthOffset(radius),
                    node.y - widthOffset(radius),
                    0,
                    node.x,
                    node.y,
                    radius,
                );

                if (isProject) {
                    // Purple / Pink for Projects
                    gradient.addColorStop(0, "rgba(180, 100, 255, 0.9)");
                    gradient.addColorStop(1, "rgba(120, 50, 200, 0.8)");
                } else if (isOwned) {
                    // Blueish Purple for Owned
                    gradient.addColorStop(0, "rgba(130, 120, 255, 0.9)");
                    gradient.addColorStop(1, "rgba(100, 80, 220, 0.7)");
                } else {
                    // Teal for Related
                    gradient.addColorStop(0, "rgba(100, 180, 160, 0.8)");
                    gradient.addColorStop(1, "rgba(70, 120, 110, 0.6)");
                }

                ctx.beginPath();
                ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                // ボーダー
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

                if (isProject) ctx.strokeStyle = "rgba(200, 150, 255, 0.8)";
                else if (isOwned) ctx.strokeStyle = "rgba(160, 150, 255, 0.6)";
                else ctx.strokeStyle = "rgba(100, 160, 150, 0.3)";

                ctx.lineWidth = isSelected ? 3 : 1.5;
                ctx.stroke();

                // ラベル (Only if hovered, selected, or project, or zoomed in)
                const showLabel =
                    isProject || isHovered || isSelected || nodes.length < 20;

                if (showLabel) {
                    ctx.font = isProject
                        ? "bold 13px Inter, sans-serif"
                        : "11px Inter, sans-serif";
                    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";

                    const text =
                        node.label.length > 20
                            ? node.label.slice(0, 19) + "…"
                            : node.label;
                    ctx.fillText(text, node.x, node.y + radius + 14);
                }
            }
        };

        const widthOffset = (r: number) => r * 0.3;

        const loop = () => {
            simulate();
            draw();
            animationRef.current = requestAnimationFrame(loop);
        };
        loop();

        // マウスイベント
        const findNode = (x: number, y: number) => {
            // Check in reverse order (top first)
            for (let i = nodesRef.current.length - 1; i >= 0; i--) {
                const n = nodesRef.current[i];
                let r = 16;
                if (n.type === "project") r = 30;
                else if (n.type === "owned") r = 24;

                if (Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2) <= r + 5) {
                    return n;
                }
            }
            return undefined;
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (dragRef.current.nodeId) {
                const node = nodesRef.current.find(
                    (n) => n.id === dragRef.current.nodeId,
                );
                if (node) {
                    node.x = x - dragRef.current.offsetX;
                    node.y = y - dragRef.current.offsetY;
                    node.vx = 0;
                    node.vy = 0;
                }
                return;
            }

            const found = findNode(x, y);
            setHoveredNode(found?.id || null);
            canvas.style.cursor = found ? "pointer" : "default";
        };

        const handleMouseDown = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const found = findNode(x, y);
            if (found) {
                dragRef.current = {
                    nodeId: found.id,
                    offsetX: x - found.x,
                    offsetY: y - found.y,
                };
                setSelectedNode(found);
            }
        };

        const handleMouseUp = () => {
            dragRef.current = { nodeId: null, offsetX: 0, offsetY: 0 };
        };

        const handleClick = (e: MouseEvent) => {
            // If needed: Click to navigate
            // But maybe separate single click (select) vs double click (nav)?
            // For now, let's keep it simple: Select shows info in side panel
        };

        canvas.addEventListener("mousemove", handleMouseMove);
        canvas.addEventListener("mousedown", handleMouseDown);
        canvas.addEventListener("mouseup", handleMouseUp);
        // canvas.addEventListener("click", handleClick);

        return () => {
            cancelAnimationFrame(animationRef.current);
            window.removeEventListener("resize", resizeCanvas);
            canvas.removeEventListener("mousemove", handleMouseMove);
            canvas.removeEventListener("mousedown", handleMouseDown);
            canvas.removeEventListener("mouseup", handleMouseUp);
        };
    }, [hoveredNode, selectedNode]); // Removed nodes/edges from dependency to avoid loop restart on small updates, using refs

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-4">
            {/* グラフキャンバス */}
            <div className="flex-1 relative rounded-xl overflow-hidden glass-card">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full bg-[#020817]"
                />

                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="w-4 h-4 animate-spin border-2 border-primary border-t-transparent rounded-full" />
                            データ読み込み中...
                        </div>
                    </div>
                )}

                {/* 凡例 */}
                <div className="absolute bottom-4 left-4 flex gap-4 rounded-lg bg-background/80 px-4 py-2 backdrop-blur-sm text-xs border border-white/10">
                    <div className="flex items-center gap-1.5">
                        <span className="inline-block h-3 w-3 rounded-full bg-[rgba(180,100,255,0.8)]" />
                        プロジェクト
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="inline-block h-3 w-3 rounded-full bg-[rgba(70,120,110,0.5)]" />
                        関連研究 (プロジェクト内含む)
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="inline-block h-3 w-3 rounded-full bg-[rgba(130,120,255,0.8)]" />
                        その他の保存済み論文
                    </div>
                </div>

                {/* ズームコントロール - Placeholder for now */}
                <div className="absolute top-4 right-4 flex flex-col gap-1"></div>
            </div>

            {/* サイドパネル */}
            <div className="w-72 shrink-0 space-y-4 overflow-y-auto">
                {/* 選択中のノード */}
                {selectedNode ? (
                    <div className="glass-card rounded-xl p-4 space-y-3 bg-card border border-border">
                        <div className="flex items-center gap-2">
                            <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                    selectedNode.type === "project"
                                        ? "bg-purple-500"
                                        : selectedNode.type === "owned"
                                          ? "bg-blue-500"
                                          : "bg-teal-500"
                                }`}
                            />
                            <span className="text-xs text-muted-foreground">
                                {selectedNode.type === "project"
                                    ? "プロジェクト"
                                    : selectedNode.type === "owned"
                                      ? "マイ論文"
                                      : "関連論文"}
                            </span>
                        </div>
                        <h3 className="font-semibold text-sm">
                            {selectedNode.label}
                        </h3>
                        {selectedNode.type !== "project" && (
                            <button
                                onClick={() =>
                                    router.push(`/papers/${selectedNode.id}`)
                                }
                                className="w-full rounded-lg bg-primary/20 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/30 transition-colors">
                                詳細を表示 →
                            </button>
                        )}
                        {selectedNode.type === "project" && (
                            <button
                                onClick={() =>
                                    router.push(`/projects/${selectedNode.id}`)
                                }
                                className="w-full rounded-lg bg-primary/20 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/30 transition-colors">
                                プロジェクトを開く →
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="glass-card rounded-xl p-4 text-center bg-card border border-border">
                        <p className="text-sm text-muted-foreground">
                            ノードをクリックして詳細を表示
                        </p>
                    </div>
                )}

                {/* 統計 */}
                <div className="glass-card rounded-xl p-4 space-y-3 bg-card border border-border">
                    <h4 className="text-sm font-semibold">グラフ統計</h4>
                    <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="rounded-lg bg-muted/30 p-2">
                            <p className="text-lg font-bold text-purple-400">
                                {
                                    nodes.filter((n) => n.type === "project")
                                        .length
                                }
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                                プロジェクト
                            </p>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-2">
                            <p className="text-lg font-bold text-teal-400">
                                {
                                    nodes.filter((n) => n.type === "related")
                                        .length
                                }
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                                関連研究
                            </p>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-2">
                            <p className="text-lg font-bold text-blue-400">
                                {nodes.filter((n) => n.type === "owned").length}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                                未分類
                            </p>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-2">
                            <p className="text-lg font-bold">{edges.length}</p>
                            <p className="text-[10px] text-muted-foreground">
                                接続
                            </p>
                        </div>
                    </div>
                </div>

                {/* フィルター */}
                <div className="glass-card rounded-xl p-4 space-y-3 bg-card border border-border">
                    <h4 className="text-sm font-semibold">フィルター</h4>
                    <div className="space-y-2 text-sm">
                        <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showProjects}
                                onChange={(e) =>
                                    setShowProjects(e.target.checked)
                                }
                                className="rounded border-border accent-purple-500"
                            />
                            プロジェクト
                        </label>
                        <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showRelated}
                                onChange={(e) =>
                                    setShowRelated(e.target.checked)
                                }
                                className="rounded border-border accent-teal-500"
                            />
                            関連研究 (プロジェクト内含む)
                        </label>
                        <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showMyPapers}
                                onChange={(e) =>
                                    setShowMyPapers(e.target.checked)
                                }
                                className="rounded border-border accent-blue-500"
                            />
                            その他の保存済み論文
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
