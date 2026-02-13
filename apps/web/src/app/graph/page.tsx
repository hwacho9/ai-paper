"use client";

/**
 * グラフビューページ
 * すべての論文と関連研究のコネクショングラフ
 * Canvas/SVGベースのネットワークビジュアライゼーション
 */

import { useEffect, useRef, useState } from "react";

// ノードデータ（ダミー）
interface GraphNode {
  id: string;
  label: string;
  type: "owned" | "related";
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GraphEdge {
  source: string;
  target: string;
  strength: number;
}

const initialNodes: GraphNode[] = [
  {
    id: "1",
    label: "Attention Is All You Need",
    type: "owned",
    x: 400,
    y: 300,
    vx: 0,
    vy: 0,
  },
  { id: "2", label: "BERT", type: "owned", x: 550, y: 200, vx: 0, vy: 0 },
  { id: "3", label: "GPT-3", type: "owned", x: 300, y: 180, vx: 0, vy: 0 },
  { id: "4", label: "ViT", type: "owned", x: 600, y: 400, vx: 0, vy: 0 },
  {
    id: "5",
    label: "Scaling Laws",
    type: "owned",
    x: 200,
    y: 350,
    vx: 0,
    vy: 0,
  },
  // 関連論文
  {
    id: "r1",
    label: "Seq2Seq (Sutskever)",
    type: "related",
    x: 250,
    y: 250,
    vx: 0,
    vy: 0,
  },
  { id: "r2", label: "ELMo", type: "related", x: 650, y: 150, vx: 0, vy: 0 },
  { id: "r3", label: "GPT-2", type: "related", x: 200, y: 150, vx: 0, vy: 0 },
  { id: "r4", label: "T5", type: "related", x: 500, y: 350, vx: 0, vy: 0 },
  { id: "r5", label: "DeiT", type: "related", x: 700, y: 350, vx: 0, vy: 0 },
  { id: "r6", label: "RoBERTa", type: "related", x: 650, y: 250, vx: 0, vy: 0 },
  {
    id: "r7",
    label: "Chinchilla",
    type: "related",
    x: 150,
    y: 400,
    vx: 0,
    vy: 0,
  },
  { id: "r8", label: "PaLM", type: "related", x: 350, y: 120, vx: 0, vy: 0 },
  { id: "r9", label: "LLaMA", type: "related", x: 400, y: 430, vx: 0, vy: 0 },
  { id: "r10", label: "CLIP", type: "related", x: 550, y: 450, vx: 0, vy: 0 },
];

const edges: GraphEdge[] = [
  { source: "1", target: "2", strength: 0.9 },
  { source: "1", target: "3", strength: 0.8 },
  { source: "1", target: "4", strength: 0.7 },
  { source: "1", target: "r1", strength: 0.85 },
  { source: "1", target: "r4", strength: 0.6 },
  { source: "2", target: "r2", strength: 0.8 },
  { source: "2", target: "r6", strength: 0.9 },
  { source: "2", target: "r4", strength: 0.7 },
  { source: "3", target: "r3", strength: 0.95 },
  { source: "3", target: "r8", strength: 0.7 },
  { source: "3", target: "5", strength: 0.6 },
  { source: "4", target: "r5", strength: 0.85 },
  { source: "4", target: "r10", strength: 0.8 },
  { source: "5", target: "r7", strength: 0.8 },
  { source: "5", target: "r9", strength: 0.5 },
  { source: "r3", target: "r8", strength: 0.65 },
  { source: "r9", target: "r7", strength: 0.55 },
];

export default function GraphPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<GraphNode[]>(
    JSON.parse(JSON.stringify(initialNodes)),
  );
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const animationRef = useRef<number>(0);
  const dragRef = useRef<{
    nodeId: string | null;
    offsetX: number;
    offsetY: number;
  }>({ nodeId: null, offsetX: 0, offsetY: 0 });

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
      const damping = 0.92;
      const repulsion = 3000;
      const attraction = 0.005;
      const centerGravity = 0.01;

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
          const dist = Math.sqrt(dx * dx + dy * dy) + 1;
          const force = repulsion / (dist * dist);
          node.vx += (dx / dist) * force;
          node.vy += (dy / dist) * force;
        }
      }

      // エッジによる引力
      for (const edge of edges) {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) continue;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const force = attraction * edge.strength;
        source.vx += dx * force;
        source.vy += dy * force;
        target.vx -= dx * force;
        target.vy -= dy * force;
      }

      // 位置更新
      for (const node of nodes) {
        if (dragRef.current.nodeId === node.id) continue;
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx;
        node.y += node.vy;
        // 境界制限
        node.x = Math.max(60, Math.min(canvas.width - 60, node.x));
        node.y = Math.max(60, Math.min(canvas.height - 60, node.y));
      }
    };

    // 描画
    const draw = () => {
      const nodes = nodesRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // エッジ
      for (const edge of edges) {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) continue;

        const isHighlighted =
          hoveredNode === source.id || hoveredNode === target.id;
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = isHighlighted
          ? `rgba(130, 120, 255, ${0.3 + edge.strength * 0.5})`
          : `rgba(100, 100, 140, ${0.1 + edge.strength * 0.15})`;
        ctx.lineWidth = isHighlighted ? 2 : 1;
        ctx.stroke();
      }

      // ノード
      for (const node of nodes) {
        const isOwned = node.type === "owned";
        const isHovered = hoveredNode === node.id;
        const isSelected = selectedNode?.id === node.id;
        const radius = isOwned ? 24 : 16;

        // グロー
        if (isHovered || isSelected) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 8, 0, Math.PI * 2);
          ctx.fillStyle = isOwned
            ? "rgba(130, 120, 255, 0.15)"
            : "rgba(100, 180, 160, 0.15)";
          ctx.fill();
        }

        // ノード本体
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        if (isOwned) {
          const gradient = ctx.createRadialGradient(
            node.x,
            node.y,
            0,
            node.x,
            node.y,
            radius,
          );
          gradient.addColorStop(0, "rgba(130, 120, 255, 0.9)");
          gradient.addColorStop(1, "rgba(100, 80, 220, 0.7)");
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = isHovered
            ? "rgba(100, 180, 160, 0.7)"
            : "rgba(70, 120, 110, 0.5)";
        }
        ctx.fill();

        // ボーダー
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = isOwned
          ? "rgba(160, 150, 255, 0.6)"
          : "rgba(100, 160, 150, 0.3)";
        ctx.lineWidth = isSelected ? 2.5 : 1;
        ctx.stroke();

        // ラベル
        ctx.font = isOwned
          ? "bold 11px Inter, sans-serif"
          : "10px Inter, sans-serif";
        ctx.fillStyle = isHovered
          ? "rgba(255,255,255,0.95)"
          : "rgba(200, 200, 220, 0.8)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // テキスト折返し
        const maxWidth = isOwned ? 80 : 60;
        const text =
          node.label.length > 15 ? node.label.slice(0, 14) + "…" : node.label;
        ctx.fillText(text, node.x, node.y + radius + 14);
      }
    };

    const loop = () => {
      simulate();
      draw();
      animationRef.current = requestAnimationFrame(loop);
    };
    loop();

    // マウスイベント
    const findNode = (x: number, y: number) => {
      return nodesRef.current.find((n) => {
        const r = n.type === "owned" ? 24 : 16;
        return Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2) <= r + 4;
      });
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

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, [hoveredNode, selectedNode]);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* グラフキャンバス */}
      <div className="flex-1 relative rounded-xl overflow-hidden glass-card">
        <canvas ref={canvasRef} className="w-full h-full" />

        {/* 凡例 */}
        <div className="absolute bottom-4 left-4 flex gap-4 rounded-lg bg-background/80 px-4 py-2 backdrop-blur-sm text-xs">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-[rgba(130,120,255,0.8)]" />
            マイ論文
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-[rgba(70,120,110,0.5)]" />
            関連論文
          </div>
        </div>

        {/* ズームコントロール */}
        <div className="absolute top-4 right-4 flex flex-col gap-1">
          <button className="rounded-lg bg-background/80 p-2 text-muted-foreground backdrop-blur-sm hover:text-foreground transition-colors">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </button>
          <button className="rounded-lg bg-background/80 p-2 text-muted-foreground backdrop-blur-sm hover:text-foreground transition-colors">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 12h-15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* サイドパネル */}
      <div className="w-72 shrink-0 space-y-4 overflow-y-auto">
        {/* 選択中のノード */}
        {selectedNode ? (
          <div className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${selectedNode.type === "owned" ? "bg-[rgba(130,120,255,0.8)]" : "bg-[rgba(70,120,110,0.5)]"}`}
              />
              <span className="text-xs text-muted-foreground">
                {selectedNode.type === "owned" ? "マイ論文" : "関連論文"}
              </span>
            </div>
            <h3 className="font-semibold text-sm">{selectedNode.label}</h3>
            <p className="text-xs text-muted-foreground">
              接続数:{" "}
              {
                edges.filter(
                  (e) =>
                    e.source === selectedNode.id ||
                    e.target === selectedNode.id,
                ).length
              }
            </p>
            <button className="w-full rounded-lg bg-primary/20 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/30 transition-colors">
              詳細を表示 →
            </button>
          </div>
        ) : (
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">
              ノードをクリックして詳細を表示
            </p>
          </div>
        )}

        {/* 統計 */}
        <div className="glass-card rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold">グラフ統計</h4>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-muted/30 p-2">
              <p className="text-lg font-bold text-primary">
                {initialNodes.filter((n) => n.type === "owned").length}
              </p>
              <p className="text-[10px] text-muted-foreground">マイ論文</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-2">
              <p className="text-lg font-bold">
                {initialNodes.filter((n) => n.type === "related").length}
              </p>
              <p className="text-[10px] text-muted-foreground">関連論文</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-2">
              <p className="text-lg font-bold">{edges.length}</p>
              <p className="text-[10px] text-muted-foreground">接続</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-2">
              <p className="text-lg font-bold">3</p>
              <p className="text-[10px] text-muted-foreground">クラスター</p>
            </div>
          </div>
        </div>

        {/* フィルター */}
        <div className="glass-card rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold">フィルター</h4>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-border accent-primary"
              />
              マイ論文
            </label>
            <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-border accent-primary"
              />
              関連論文
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
