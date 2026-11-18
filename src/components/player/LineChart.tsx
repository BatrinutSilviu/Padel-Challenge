import { useId, useRef, useState } from "react";

// A single-series line chart in inline SVG: a 2px line, small markers, a recessive grid
// with three value labels, and a hover/tap readout of the nearest point. One series, so
// no legend — the section title names it. A visually hidden table carries the values.

type Point = { x: number; y: number; label: string };

const W = 320;
const H = 140;
const PAD = { top: 10, right: 10, bottom: 18, left: 34 };

export function LineChart({ points, color, format, title }: {
    points: Point[];
    color: string;
    format: (v: number) => string;
    title: string;
}) {
    const [hover, setHover] = useState<number | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const id = useId();
    if (points.length === 0) return null;

    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    let yMin = Math.min(...ys), yMax = Math.max(...ys);
    if (yMax - yMin < 1e-9) { yMin -= 1; yMax += 1; }
    const span = yMax - yMin;
    yMin -= span * 0.1; yMax += span * 0.1;

    const px = (x: number) => PAD.left + (xMax === xMin ? (W - PAD.left - PAD.right) / 2 : ((x - xMin) / (xMax - xMin)) * (W - PAD.left - PAD.right));
    const py = (y: number) => PAD.top + (1 - (y - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);
    const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(" ");
    const ticks = [yMin + (yMax - yMin) * 0.1, (yMin + yMax) / 2, yMax - (yMax - yMin) * 0.1];
    const dateLabel = (x: number) => new Date(x).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });

    // The nearest point to the pointer, by x.
    const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
        const svg = svgRef.current;
        if (!svg) return;
        const r = svg.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * W;
        let best = 0;
        points.forEach((p, i) => { if (Math.abs(px(p.x) - x) < Math.abs(px(points[best].x) - x)) best = i; });
        setHover(best);
    };
    const h = hover !== null ? points[hover] : null;

    return (
        <div className="relative">
            <svg
                ref={svgRef}
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-auto touch-none select-none"
                role="img"
                aria-labelledby={`${id}-t`}
                onPointerMove={onMove}
                onPointerDown={onMove}
                onPointerLeave={() => setHover(null)}
            >
                <title id={`${id}-t`}>{title}</title>
                {ticks.map((t, i) => (
                    <g key={i}>
                        <line x1={PAD.left} x2={W - PAD.right} y1={py(t)} y2={py(t)} stroke="currentColor" className="text-line" strokeWidth={1} />
                        <text x={PAD.left - 6} y={py(t) + 3} textAnchor="end" fontSize={9} fill="currentColor" className="text-muted">{format(t)}</text>
                    </g>
                ))}
                <text x={PAD.left} y={H - 4} fontSize={9} fill="currentColor" className="text-muted">{dateLabel(xMin)}</text>
                <text x={W - PAD.right} y={H - 4} fontSize={9} textAnchor="end" fill="currentColor" className="text-muted">{dateLabel(xMax)}</text>
                {h && <line x1={px(h.x)} x2={px(h.x)} y1={PAD.top} y2={H - PAD.bottom} stroke="currentColor" className="text-gray-300" strokeWidth={1} />}
                <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {points.map((p, i) => (
                    <circle
                        key={i}
                        cx={px(p.x)}
                        cy={py(p.y)}
                        r={hover === i ? 4.5 : 3}
                        fill={color}
                        stroke="var(--color-surface)"
                        strokeWidth={2}
                    />
                ))}
            </svg>
            <p className="min-h-[1.25rem] text-xs text-ink-2 mt-1" aria-live="polite">
                {h ? <><b className="text-ink tabular-nums">{format(h.y)}</b> · {h.label}</> : <span className="text-muted">Hover or tap the chart for the values</span>}
            </p>
            {/* A table ignores the 1px box sr-only gives it, so the wrapper is the hidden one. */}
            <div className="sr-only">
                <table>
                    <caption>{title}</caption>
                    <tbody>{points.map((p, i) => <tr key={i}><td>{p.label}</td><td>{format(p.y)}</td></tr>)}</tbody>
                </table>
            </div>
        </div>
    );
}
