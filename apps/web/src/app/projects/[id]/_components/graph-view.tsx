"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { relatedApi, GraphData, Node, Edge } from "@/lib/api/related";
import { Loader2 } from "lucide-react";

type GraphMode = "project" | "global";

interface GraphViewProps {
    projectId?: string;
    onPaperSelect?: (paperId: string) => void;
    onProjectSelect?: (projectId: string) => void;
}

// Dynamically import ForceGraph2D with no SSR
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
    ),
});

interface RenderData {
    nodes: Node[];
    links: Edge[];
}

export function GraphView({
    projectId,
    onPaperSelect,
    onProjectSelect,
}: GraphViewProps) {
    const { theme } = useTheme();
    const mode: GraphMode = projectId ? "project" : "global";
    const [data, setData] = useState<GraphData>({ nodes: [], edges: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    const [searchQuery, setSearchQuery] = useState("");
    const [projectQuery, setProjectQuery] = useState("");
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
    const [showLibraryNodes, setShowLibraryNodes] = useState(true);

    useEffect(() => {
        const updateDimensions = () => {
            const container = document.getElementById("graph-container");
            if (container) {
                setDimensions({
                    width: container.clientWidth,
                    height: container.clientHeight,
                });
            }
        };

        window.addEventListener("resize", updateDimensions);
        updateDimensions();

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const graphData =
                    mode === "project"
                        ? await relatedApi.getProjectGraph(projectId as string)
                        : await relatedApi.getGlobalGraph();
                setData(graphData);

                if (mode === "global") {
                    const projectNodes = graphData.nodes.filter(
                        (node) => node.group === "project",
                    );
                    setSelectedProjects(projectNodes.map((node) => node.id));
                }
            } catch (err: unknown) {
                console.error("Failed to fetch graph data", err);
                setError(
                    mode === "project"
                        ? "프로젝트グラフの取得に失敗しました"
                        : "グローバルグラフの取得に失敗しました",
                );
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        return () => window.removeEventListener("resize", updateDimensions);
    }, [mode, projectId]);

    const projectNodes = useMemo(
        () => data.nodes.filter((node) => node.group === "project"),
        [data.nodes],
    );

    const filteredProjectNodes = useMemo(() => {
        const q = projectQuery.trim().toLowerCase();
        if (!q) return projectNodes;
        return projectNodes.filter((node) =>
            node.label.toLowerCase().includes(q),
        );
    }, [projectNodes, projectQuery]);

    const displayData: RenderData = useMemo(() => {
        if (mode === "project") {
            const query = searchQuery.trim().toLowerCase();
            const allowedNodeIds = new Set<string>();
            for (const node of data.nodes) {
                if (!query) {
                    allowedNodeIds.add(node.id);
                    continue;
                }
                if (node.label.toLowerCase().includes(query)) {
                    allowedNodeIds.add(node.id);
                }
            }
            if (projectId) {
                allowedNodeIds.add(projectId);
            }

            const links = data.edges.filter(
                (edge) =>
                    allowedNodeIds.has(edge.source) &&
                    allowedNodeIds.has(edge.target),
            );
            const nodes = data.nodes.filter((node) => allowedNodeIds.has(node.id));

            return { nodes, links };
        }

        const query = searchQuery.trim().toLowerCase();
        const selectedSet = new Set(selectedProjects);
        const selectedWithFallback =
            selectedSet.size === 0 && projectNodes.length > 0
                ? new Set(projectNodes.map((node) => node.id))
                : selectedSet;

        const linkedNodeIds = new Set<string>();
        if (showLibraryNodes) {
            for (const node of data.nodes) {
                linkedNodeIds.add(node.id);
            }
        } else {
            for (const nodeId of selectedWithFallback) {
                linkedNodeIds.add(nodeId);
            }
            for (const edge of data.edges) {
                if (selectedWithFallback.has(edge.source) || selectedWithFallback.has(edge.target)) {
                    linkedNodeIds.add(edge.source);
                    linkedNodeIds.add(edge.target);
                }
            }
        }

        const nodes = data.nodes.filter((node) => {
            if (!linkedNodeIds.has(node.id)) return false;
            if (!query) return true;
            return node.label.toLowerCase().includes(query);
        });
        const nodeIdSet = new Set(nodes.map((node) => node.id));
        const links = data.edges.filter(
            (edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target),
        );
        return { nodes, links };
    }, [
        mode,
        data.nodes,
        data.edges,
        projectId,
        searchQuery,
        selectedProjects,
        showLibraryNodes,
        projectNodes,
    ]);

    const isDark = theme === "dark";

    const toggleProject = (id: string) => {
        setSelectedProjects((prev) =>
            prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
        );
    };

    return (
        <div
            id="graph-container"
            className="w-full h-[600px] border rounded-xl bg-card relative overflow-hidden">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-transparent z-10 pointer-events-none">
                    <div className="bg-red-500/10 text-red-500 p-4 rounded-lg pointer-events-auto">
                        {error}
                    </div>
                </div>
            )}

            {!loading && !error && displayData.nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-transparent z-10 pointer-events-none">
                    <p className="text-muted-foreground">
                        表示するデータがありません
                    </p>
                </div>
            )}

            <div className="absolute top-3 left-3 z-20">
                <div className="rounded-xl border border-border/70 bg-background/90 px-3 py-2 text-xs flex items-center gap-2">
                    <span className="rounded-full bg-muted/50 px-2 py-0.5">
                        ノード {displayData.nodes.length}
                    </span>
                    <span className="rounded-full bg-muted/50 px-2 py-0.5">
                        エッジ {displayData.links.length}
                    </span>
                    {mode === "global" && (
                        <label className="ml-2 inline-flex items-center gap-1">
                            <input
                                type="checkbox"
                                checked={showLibraryNodes}
                                onChange={(e) =>
                                    setShowLibraryNodes(e.target.checked)
                                }
                            />
                            ライブラリノード
                        </label>
                    )}
                </div>
            </div>

            <div className="absolute top-3 right-3 z-20">
                <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ノード検索"
                    className="w-48 rounded-lg border border-border bg-background/90 px-3 py-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
            </div>

            {mode === "global" && (
                <div className="absolute bottom-3 left-3 z-20 max-w-sm">
                    <div className="rounded-xl border border-border/70 bg-background/95 p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-muted-foreground">
                                プロジェクト絞り込み
                            </p>
                            <input
                                value={projectQuery}
                                onChange={(e) => setProjectQuery(e.target.value)}
                                placeholder="プロジェクト名"
                                className="w-36 rounded-md border border-border/70 bg-muted/20 px-2 py-1 text-[11px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                        <div className="max-h-36 overflow-auto space-y-1.5 pr-1">
                            {filteredProjectNodes.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                    該当プロジェクトがありません
                                </p>
                            )}
                            {filteredProjectNodes.map((node) => (
                                <label
                                    key={node.id}
                                    className="flex items-center gap-2 text-xs">
                                    <input
                                        type="checkbox"
                                        checked={selectedProjects.includes(node.id)}
                                        onChange={() => toggleProject(node.id)}
                                        className="h-3 w-3"
                                    />
                                    <span className="truncate">{node.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <ForceGraph2D
                width={dimensions.width}
                height={dimensions.height}
                graphData={displayData}
                nodeLabel="label"
                backgroundColor={isDark ? "#0f172a" : "#f8fafc"}
                nodeColor={() => "transparent"}
                nodeRelSize={10}
                linkColor={() =>
                    isDark
                        ? "rgba(148, 163, 184, 0.35)"
                        : "rgba(30, 41, 59, 0.25)"
                }
                linkWidth={(link: Edge) => {
                    const score = link.value || 1;
                    return 0.8 + Math.max(0, Math.min(score, 3));
                }}
                onNodeClick={(node: any) => {
                    const nodeId = String(node.id);
                    if (node.group === "project") {
                        if (!projectId && onProjectSelect) {
                            onProjectSelect(nodeId);
                        }
                        return;
                    }
                    if (onPaperSelect) onPaperSelect(nodeId);
                }}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                    const isCenter = mode === "project" && node.id === projectId;
                    const isProject = node.group === "project";
                    const isRelated = node.group === "related";
                    const radius = isCenter
                        ? 20 / globalScale
                        : isProject
                            ? 11 / globalScale
                            : 7 / globalScale;

                    const glow = isCenter
                        ? "rgba(250, 204, 21, 0.5)"
                        : isProject
                            ? "rgba(129, 140, 248, 0.35)"
                            : isRelated
                              ? "rgba(16, 185, 129, 0.3)"
                              : "rgba(96, 165, 250, 0.25)";

                    const fill = isCenter
                        ? "#f59e0b"
                        : isProject
                            ? isDark
                                ? "#818cf8"
                                : "#4f46e5"
                            : isRelated
                                ? isDark
                                    ? "#34d399"
                                    : "#16a34a"
                                : isDark
                                  ? "#60a5fa"
                                  : "#3b82f6";

                    // Glow
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, radius + 3, 0, Math.PI * 2);
                    ctx.fillStyle = glow;
                    ctx.fill();

                    // Body
                    const gradient = ctx.createRadialGradient(
                        node.x - 2,
                        node.y - 2,
                        0,
                        node.x,
                        node.y,
                        radius,
                    );
                    gradient.addColorStop(0, fill);
                    gradient.addColorStop(1, isDark ? "#0b1222" : "#f1f5f9");
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
                    ctx.fillStyle = gradient;
                    ctx.fill();

                    // Border
                    ctx.strokeStyle = isDark
                        ? "rgba(255, 255, 255, 0.25)"
                        : "rgba(30, 41, 59, 0.3)";
                    ctx.lineWidth = 1 / globalScale;
                    ctx.stroke();

                    const label = node.label || "";
                    if (globalScale > 1.2 || isCenter || isProject) {
                        const fontSize = 11 / globalScale;
                        ctx.font = `${fontSize}px Pretendard, sans-serif`;
                        ctx.fillStyle = isDark
                            ? "rgba(241, 245, 249, 0.94)"
                            : "rgba(15, 23, 42, 0.94)";
                        ctx.textAlign = "center";
                        const displayLabel =
                            label.length > 20
                                ? `${label.slice(0, 20)}...`
                                : label;
                        ctx.fillText(
                            displayLabel,
                            node.x,
                            node.y + radius + fontSize * 1.2,
                        );
                    }
                }}
                cooldownTicks={120}
            />
        </div>
    );
}
