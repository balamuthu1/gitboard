import { useEffect, useRef } from "react";
import type { CommitRow, Edge } from "../../types";

export const ROW_HEIGHT = 30;
export const GRAPH_PANEL_WIDTH = 200; // fixed width; text columns start here
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
  viewportHeight: number;
  scrollTop: number;
  maxLane: number;
  selectedOid: string | null;
}

export function GraphCanvas({
  rows,
  visibleStart,
  visibleEnd,
  viewportHeight,
  scrollTop,
  maxLane,
  selectedOid,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const width = Math.max(GRAPH_PANEL_WIDTH, (maxLane + 2) * LANE_WIDTH);
  const height = Math.max(viewportHeight, 1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw 2 extra rows above/below the visible range so edge lines don't
    // abruptly terminate at the viewport boundary.
    const drawStart = Math.max(0, visibleStart - 2);
    const drawEnd = Math.min(rows.length, visibleEnd + 2);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Phase 1: All edges first so dots sit on top.
    for (let i = drawStart; i < drawEnd; i++) {
      const row = rows[i];
      // Y is viewport-relative: absolute row position minus scroll offset.
      // This formula is correct regardless of overscan since it uses scrollTop
      // directly rather than visibleStart (which lags by the overscan amount).
      const fromY = i * ROW_HEIGHT + ROW_HEIGHT / 2 - scrollTop;
      const toY = fromY + ROW_HEIGHT;

      // Own-lane straight continuation — suppressed only when a Merge edge
      // takes this lane to a different column.
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

    // Phase 2: Commit dots on top of all edges.
    ctx.shadowBlur = 0;
    for (let i = drawStart; i < drawEnd; i++) {
      const row = rows[i];
      const x = row.lane * LANE_WIDTH + LANE_WIDTH / 2;
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
  }, [rows, visibleStart, visibleEnd, viewportHeight, scrollTop, maxLane, selectedOid]);

  return (
    // sticky: canvas stays anchored to the top of the scroll viewport while
    // rows scroll past. Drawing uses scrollTop to compute viewport-relative Y,
    // so dots always align with their text rows regardless of overscan.
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
    // S-curve: control points bend toward destination at row midpoint.
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
