import { useEffect, useRef } from "react";
import type { CommitRow, Edge } from "../../types";

const ROW_HEIGHT = 24;
const LANE_WIDTH = 16;
const DOT_RADIUS = 4;

const COLORS = [
  "#4a9eff", // blue
  "#ff6b6b", // red
  "#51cf66", // green
  "#ffd43b", // yellow
  "#cc5de8", // purple
  "#ff922b", // orange
  "#20c997", // teal
  "#f783ac", // pink
];

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

    for (let i = visibleStart; i < Math.min(visibleEnd, rows.length); i++) {
      const row = rows[i];
      const y = i * ROW_HEIGHT + ROW_HEIGHT / 2;

      // Draw edges originating from this row.
      for (const edge of row.edges) {
        drawEdge(ctx, edge, y, row.lane, i, rows);
      }

      // Draw commit dot.
      const x = row.lane * LANE_WIDTH + LANE_WIDTH / 2;
      const color = COLORS[row.edges.find(e => e.from_lane === row.lane)?.color_index ?? (row.lane % COLORS.length)];
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = selectedOid === row.oid ? "#ffffff" : color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }
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
  _commitLane: number,
  rowIndex: number,
  _rows: CommitRow[]
) {
  const toY = (rowIndex + 1) * ROW_HEIGHT + ROW_HEIGHT / 2;
  const fromX = edge.from_lane * LANE_WIDTH + LANE_WIDTH / 2;
  const toX = edge.to_lane * LANE_WIDTH + LANE_WIDTH / 2;
  const color = COLORS[edge.color_index % COLORS.length];

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  if (edge.kind === "straight" || fromX === toX) {
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
  } else {
    // Bezier curve for fork/merge lines.
    ctx.moveTo(fromX, fromY);
    ctx.bezierCurveTo(fromX, fromY + ROW_HEIGHT * 0.6, toX, toY - ROW_HEIGHT * 0.6, toX, toY);
  }

  ctx.stroke();
}
