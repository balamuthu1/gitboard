import { useEffect, useRef } from "react";
import type { CommitRow, Edge } from "../../types";

export const ROW_HEIGHT = 30;
export const LANE_WIDTH = 22;
export const GRAPH_PANEL_WIDTH = 200; // legacy export kept for compatibility

const DOT_RADIUS = 5;
const LINE_WIDTH = 2;

const COLORS = [
  "#a370f0",
  "#3fb950",
  "#f78166",
  "#58a6ff",
  "#d2a8ff",
  "#ffa657",
  "#79c0ff",
  "#56d364",
  "#ff7b72",
  "#e3b341",
];

function laneColor(index: number): string {
  return COLORS[index % COLORS.length];
}

interface GraphCanvasProps {
  rows: CommitRow[];
  visibleStart: number;
  visibleEnd: number;
  viewportHeight: number;
  scrollTop: number;
  maxLane: number;
  selectedOid: string | null;
  xOffset: number;
}

export function GraphCanvas({
  rows,
  visibleStart,
  visibleEnd,
  viewportHeight,
  scrollTop,
  maxLane,
  selectedOid,
  xOffset,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const width = xOffset + Math.max(80, (maxLane + 2) * LANE_WIDTH);
  const height = Math.max(viewportHeight, 1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawStart = Math.max(0, visibleStart - 2);
    const drawEnd = Math.min(rows.length, visibleEnd + 2);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Phase 1: edges first so dots sit on top
    for (let i = drawStart; i < drawEnd; i++) {
      const row = rows[i];
      const fromY = i * ROW_HEIGHT + ROW_HEIGHT / 2 - scrollTop;
      const toY = fromY + ROW_HEIGHT;

      const ownMerge = row.edges.find(
        (e) => e.kind === "merge" && e.from_lane === row.lane
      );
      if (!ownMerge && row.parents.length > 0) {
        const x = xOffset + row.lane * LANE_WIDTH + LANE_WIDTH / 2;
        ctx.strokeStyle = laneColor(row.lane_color);
        ctx.lineWidth = LINE_WIDTH;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(x, fromY);
        ctx.lineTo(x, toY);
        ctx.stroke();
      }

      for (const edge of row.edges) {
        drawEdge(ctx, edge, fromY, toY, xOffset);
      }
    }

    // Phase 2: commit dots on top of edges
    ctx.shadowBlur = 0;
    for (let i = drawStart; i < drawEnd; i++) {
      const row = rows[i];
      const x = xOffset + row.lane * LANE_WIDTH + LANE_WIDTH / 2;
      const y = i * ROW_HEIGHT + ROW_HEIGHT / 2 - scrollTop;
      const color = laneColor(row.lane_color);
      const isSelected = row.oid === selectedOid;

      ctx.shadowColor = color;
      ctx.shadowBlur = isSelected ? 12 : 6;

      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? "#ffffff" : color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
  }, [rows, visibleStart, visibleEnd, viewportHeight, scrollTop, maxLane, selectedOid, xOffset]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        display: "block",
        position: "sticky",
        top: 0,
        zIndex: 0,
        pointerEvents: "none",
        flexShrink: 0,
      }}
    />
  );
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  edge: Edge,
  fromY: number,
  toY: number,
  xOffset: number,
) {
  const fromX = xOffset + edge.from_lane * LANE_WIDTH + LANE_WIDTH / 2;
  const toX = xOffset + edge.to_lane * LANE_WIDTH + LANE_WIDTH / 2;
  const color = laneColor(edge.color_index);

  ctx.strokeStyle = color;
  ctx.lineWidth = LINE_WIDTH;
  ctx.shadowColor = color;
  ctx.shadowBlur = 3;
  ctx.beginPath();

  if (fromX === toX) {
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
  } else {
    ctx.moveTo(fromX, fromY);
    ctx.bezierCurveTo(
      fromX, fromY + ROW_HEIGHT * 0.5,
      toX,   toY   - ROW_HEIGHT * 0.5,
      toX,   toY,
    );
  }

  ctx.stroke();
  ctx.shadowBlur = 0;
}
