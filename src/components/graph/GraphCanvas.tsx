import { useEffect, useRef } from "react";
import type { CommitRow, Edge } from "../../types";

export const ROW_HEIGHT = 30;
const LANE_WIDTH = 22;
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
  maxLane: number;
  selectedOid: string | null;
}

export function GraphCanvas({
  rows,
  visibleStart,
  visibleEnd,
  maxLane,
  selectedOid,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const width = (maxLane + 1) * LANE_WIDTH + LANE_WIDTH;
  const height = rows.length * ROW_HEIGHT;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawStart = Math.max(0, visibleStart - 1);
    const drawEnd = Math.min(rows.length, visibleEnd + 1);

    // Phase 1: Draw all edges first so dots sit on top.
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = drawStart; i < drawEnd; i++) {
      const row = rows[i];
      const fromY = i * ROW_HEIGHT + ROW_HEIGHT / 2;
      const toY = (i + 1) * ROW_HEIGHT + ROW_HEIGHT / 2;

      // Own-lane continuation (straight down to first parent), unless this
      // commit emits a Merge edge from its own lane (converging elsewhere).
      const ownMerge = row.edges.find(
        (e) => e.kind === "merge" && e.from_lane === row.lane
      );
      if (!ownMerge && row.parents.length > 0) {
        const x = row.lane * LANE_WIDTH + LANE_WIDTH / 2;
        ctx.strokeStyle = laneColor(row.lane_color);
        ctx.lineWidth = LINE_WIDTH;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(x, fromY);
        ctx.lineTo(x, toY);
        ctx.stroke();
      }

      for (const edge of row.edges) {
        drawEdge(ctx, edge, fromY, toY);
      }
    }

    // Phase 2: Draw commit dots on top of all edges.
    ctx.shadowBlur = 0;
    for (let i = drawStart; i < drawEnd; i++) {
      const row = rows[i];
      const x = row.lane * LANE_WIDTH + LANE_WIDTH / 2;
      const y = i * ROW_HEIGHT + ROW_HEIGHT / 2;
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
  }, [rows, visibleStart, visibleEnd, maxLane, selectedOid]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: "block", flexShrink: 0 }}
    />
  );
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  edge: Edge,
  fromY: number,
  toY: number,
) {
  const fromX = edge.from_lane * LANE_WIDTH + LANE_WIDTH / 2;
  const toX = edge.to_lane * LANE_WIDTH + LANE_WIDTH / 2;
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
    // S-curve: control points bend toward destination at midpoint.
    ctx.moveTo(fromX, fromY);
    ctx.bezierCurveTo(
      fromX, fromY + ROW_HEIGHT * 0.5,
      toX, toY - ROW_HEIGHT * 0.5,
      toX, toY,
    );
  }

  ctx.stroke();
  ctx.shadowBlur = 0;
}
