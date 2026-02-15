"use client";

/**
 * グラフビューページ
 * すべての論文と関連研究のコネクショングラフ
 * Canvas/SVGベースのネットワークビジュアライゼーション
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraphConnectionMode, relatedApi } from "@/lib/api/related";
import { apiDelete, apiGet, apiPost } from "@/lib/api/client";

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

interface PaperTitleResponse {
    title: string;
}

export default function GraphPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
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
    const requestedMode = searchParams.get("mode");
    const connectionMode: GraphConnectionMode =
        requestedMode === "embedding" ||
        requestedMode === "keyword" ||
        requestedMode === "hybrid"
            ? requestedMode
            : "keyword";

    const nodesRef = useRef<GraphNode[]>([]); // Ref for animation loop
    const edgesRef = useRef<GraphEdge[]>([]); // Ref for animation loop

    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [projectActionLoading, setProjectActionLoading] = useState<{
        type: "add" | "remove";
        projectId: string;
    } | null>(null);
    const [paperTitleMap, setPaperTitleMap] = useState<Record<string, string>>(
        {},
    );
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
                const data = await relatedApi.getGlobalGraph(connectionMode);
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
    }, [connectionMode]);

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
            if (!existing) return n; // New (shouldn't happen often in filter)
            // Keep physics state, but reflect latest semantic props (type/label/val).
            if (
                existing.type !== n.type ||
                existing.label !== n.label ||
                existing.val !== n.val
            ) {
                return {
                    ...existing,
                    type: n.type,
                    label: n.label,
                    val: n.val,
                };
            }
            return existing; // Keep position
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
            const attraction = 0.01; // 더 강한 연결력으로 밀집도/가독성 개선
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

                const isHoveredEdge =
                    hoveredNode === source.id || hoveredNode === target.id;
                const isSelectedEdge =
                    selectedNode?.id === source.id || selectedNode?.id === target.id;
                const isHighlighted = isHoveredEdge || isSelectedEdge;
                const lineWeight = Math.max(
                    0,
                    Math.min(edge.strength ?? 0.5, 1),
                );
                ctx.beginPath();
                ctx.moveTo(source.x, source.y);
                ctx.lineTo(target.x, target.y);
                ctx.strokeStyle = isHighlighted
                    ? `rgba(180, 150, 255, ${Math.max(
                        0.5,
                        Math.min(0.9, 0.45 + lineWeight * 0.5),
                    )})`
                    : `rgba(120, 130, 190, ${Math.max(
                        0.28,
                        Math.min(0.75, 0.25 + lineWeight * 0.35),
                    )})`;
                ctx.lineWidth = isHighlighted ? 2.4 : 1.6 + lineWeight * 0.8;
                ctx.shadowColor = isHighlighted
                    ? "rgba(178, 136, 255, 0.5)"
                    : "rgba(130, 130, 170, 0.25)";
                ctx.shadowBlur = isHighlighted ? 5 : 2;
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // ノード
            for (const node of nodes) {
                const isProject = node.type === "project";
                const isOwned = node.type === "owned";
                const isRelated = node.type === "related";

                const isHovered = hoveredNode === node.id;
                const isSelected = selectedNode?.id === node.id;

                // Size
                let radius = 20;
                if (isProject) radius = 30;
                else if (isOwned) radius = 16;

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
                let r = 20;
                if (n.type === "project") r = 30;
                else if (n.type === "owned") r = 16;

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

    const projectNodes = useMemo(
        () => nodes.filter((node) => node.type === "project"),
        [nodes],
    );
    const projectNodeIdSet = useMemo(
        () => new Set(projectNodes.map((node) => node.id)),
        [projectNodes],
    );
    const projectTitleMap = useMemo(
        () => new Map(projectNodes.map((node) => [node.id, node.label])),
        [projectNodes],
    );

    const getConnectedProjectIds = useCallback(
        (paperId: string): string[] => {
            const projectIds = new Set<string>();
            for (const edge of edges) {
                if (edge.source === paperId && projectNodeIdSet.has(edge.target)) {
                    projectIds.add(edge.target);
                }
                if (edge.target === paperId && projectNodeIdSet.has(edge.source)) {
                    projectIds.add(edge.source);
                }
            }
            return Array.from(projectIds);
        },
        [edges, projectNodeIdSet],
    );

    const connectedProjectIds =
        selectedNode && selectedNode.type !== "project"
            ? getConnectedProjectIds(selectedNode.id)
            : [];
    const selectedTitle =
        selectedNode && selectedNode.type !== "project"
            ? paperTitleMap[selectedNode.id] || selectedNode.label
            : selectedNode?.label || "";

    useEffect(() => {
        if (!selectedNode) return;
        if (selectedNode.type === "project") {
            setSelectedProjectId(selectedNode.id);
            return;
        }

        const connectedIds = getConnectedProjectIds(selectedNode.id);
        if (connectedIds.length > 0) {
            // Prefer an actually linked project when the selected node already belongs to one.
            setSelectedProjectId(connectedIds[0]);
            return;
        }

        if (selectedProjectId && projectNodeIdSet.has(selectedProjectId)) return;
        setSelectedProjectId(projectNodes[0]?.id || "");
    }, [
        selectedNode,
        selectedProjectId,
        getConnectedProjectIds,
        projectNodeIdSet,
        projectNodes,
    ]);

    useEffect(() => {
        if (!selectedNode || selectedNode.type === "project") return;
        if (paperTitleMap[selectedNode.id]) return;

        const fetchPaperTitle = async () => {
            try {
                const detail = await apiGet<PaperTitleResponse>(
                    `/api/v1/library/${selectedNode.id}`,
                );
                if (!detail?.title) return;
                setPaperTitleMap((prev) => ({
                    ...prev,
                    [selectedNode.id]: detail.title,
                }));
            } catch {
                // Keep graph label as fallback when detail fetch fails.
            }
        };
        fetchPaperTitle();
    }, [selectedNode, paperTitleMap]);

    const handleAddPaperToProject = async (projectId?: string) => {
        const targetProjectId = projectId || selectedProjectId;
        if (!selectedNode || selectedNode.type === "project" || !targetProjectId) {
            return;
        }
        setProjectActionLoading({ type: "add", projectId: targetProjectId });
        try {
            await apiPost(`/api/v1/projects/${targetProjectId}/papers`, {
                paper_id: selectedNode.id,
            });
            setSelectedProjectId(targetProjectId);

            const hasEdge = edges.some(
                (edge) =>
                    (edge.source === targetProjectId &&
                        edge.target === selectedNode.id) ||
                    (edge.source === selectedNode.id &&
                        edge.target === targetProjectId),
            );
            if (!hasEdge) {
                const nextEdges = [
                    ...edges,
                    { source: targetProjectId, target: selectedNode.id, strength: 1 },
                ];
                setEdges(nextEdges);
                edgesRef.current = nextEdges;
            }

            setNodes((prev) =>
                prev.map((node) =>
                    node.id === selectedNode.id ? { ...node, type: "related" } : node,
                ),
            );
            setSelectedNode((prev) =>
                prev && prev.id === selectedNode.id
                    ? { ...prev, type: "related" }
                    : prev,
            );
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "プロジェクトへの追加に失敗しました");
        } finally {
            setProjectActionLoading(null);
        }
    };

    const handleRemovePaperFromProject = async (projectId?: string) => {
        const targetProjectId = projectId || selectedProjectId;
        if (!selectedNode || selectedNode.type === "project" || !targetProjectId) {
            return;
        }
        if (!confirm("この論文を選択中のプロジェクトから削除しますか？")) return;

        setProjectActionLoading({ type: "remove", projectId: targetProjectId });
        try {
            await apiDelete(`/api/v1/projects/${targetProjectId}/papers/${selectedNode.id}`);
            setSelectedProjectId(targetProjectId);

            const nextEdges = edges.filter(
                (edge) =>
                    !(
                        (edge.source === targetProjectId &&
                            edge.target === selectedNode.id) ||
                        (edge.source === selectedNode.id &&
                            edge.target === targetProjectId)
                    ),
            );
            setEdges(nextEdges);
            edgesRef.current = nextEdges;

            const isStillInProject = nextEdges.some(
                (edge) =>
                    (edge.source === selectedNode.id &&
                        projectNodeIdSet.has(edge.target)) ||
                    (edge.target === selectedNode.id &&
                        projectNodeIdSet.has(edge.source)),
            );
            const nextType: GraphNode["type"] = isStillInProject ? "related" : "owned";

            setNodes((prev) =>
                prev.map((node) =>
                    node.id === selectedNode.id ? { ...node, type: nextType } : node,
                ),
            );
            setSelectedNode((prev) =>
                prev && prev.id === selectedNode.id ? { ...prev, type: nextType } : prev,
            );
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "プロジェクトからの削除に失敗しました");
        } finally {
            setProjectActionLoading(null);
        }
    };

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
                        <h3 className="font-semibold text-sm whitespace-normal break-words leading-snug">
                            {selectedTitle}
                        </h3>
                        {selectedNode.type !== "project" && (
                            <>
                                <div className="space-y-3 rounded-lg border border-white/10 bg-background/30 p-3">
                                    <div className="space-y-1">
                                        <p className="text-[11px] text-muted-foreground">
                                            所属プロジェクト
                                        </p>
                                        {connectedProjectIds.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {connectedProjectIds.map((id) => (
                                                    <button
                                                        key={id}
                                                        onClick={() =>
                                                            setSelectedProjectId(id)
                                                        }
                                                        className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                                                            selectedProjectId === id
                                                                ? "border-teal-400/60 bg-teal-500/20 text-teal-200"
                                                                : "border-teal-500/30 bg-teal-500/10 text-teal-300"
                                                        }`}>
                                                        {projectTitleMap.get(id) || "不明"}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-muted-foreground">
                                                未登録
                                            </p>
                                        )}
                                    </div>

                                    {projectNodes.length > 0 ? (
                                        <div className="space-y-1">
                                            <p className="text-[11px] text-muted-foreground">
                                                プロジェクト一覧
                                            </p>
                                            <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                                                {projectNodes.map((project) => {
                                                    const isLinked =
                                                        connectedProjectIds.includes(
                                                            project.id,
                                                        );
                                                    const isFocused =
                                                        selectedProjectId === project.id;
                                                    return (
                                                        <div
                                                            key={project.id}
                                                            className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${
                                                                isFocused
                                                                    ? "border-primary/40 bg-primary/10"
                                                                    : "border-white/10 bg-background/20"
                                                            }`}>
                                                            <button
                                                                onClick={() =>
                                                                    setSelectedProjectId(
                                                                        project.id,
                                                                    )
                                                                }
                                                                className="min-w-0 flex-1 text-left">
                                                                <p className="truncate text-[11px] font-medium">
                                                                    {project.label}
                                                                </p>
                                                            </button>
                                                            {isLinked ? (
                                                                <button
                                                                    onClick={() =>
                                                                        handleRemovePaperFromProject(
                                                                            project.id,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        projectActionLoading !==
                                                                        null
                                                                    }
                                                                    className="rounded bg-rose-500/20 px-2 py-1 text-[10px] font-medium text-rose-300 disabled:opacity-50">
                                                                    {projectActionLoading
                                                                        ?.type === "remove" &&
                                                                    projectActionLoading.projectId ===
                                                                        project.id
                                                                        ? "削除中"
                                                                        : "削除"}
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() =>
                                                                        handleAddPaperToProject(
                                                                            project.id,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        projectActionLoading !==
                                                                        null
                                                                    }
                                                                    className="rounded bg-emerald-500/20 px-2 py-1 text-[10px] font-medium text-emerald-300 disabled:opacity-50">
                                                                    {projectActionLoading
                                                                        ?.type === "add" &&
                                                                    projectActionLoading.projectId ===
                                                                        project.id
                                                                        ? "追加中"
                                                                        : "追加"}
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-muted-foreground">
                                            プロジェクトがありません
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() =>
                                        router.push(`/papers/${selectedNode.id}`)
                                    }
                                    className="w-full rounded-lg bg-primary/20 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/30 transition-colors">
                                    詳細を表示 →
                                </button>
                            </>
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
