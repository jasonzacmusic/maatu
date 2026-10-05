"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Clock3, Shapes, Sparkles, Type, UsersRound } from "lucide-react";
import { WORD_ROLES, type WordStep } from "@/lib/sentence-game";

const ORDER: WordStep[] = ["who", "action", "what", "describe", "when"];
const ICONS = {
  who: UsersRound,
  action: Shapes,
  what: Type,
  describe: Sparkles,
  when: Clock3,
};
type Edge = {
  from: WordStep;
  to: WordStep;
  label: string;
  d: string;
  x: number;
  y: number;
};

export default function SentenceBoard({
  step,
  values,
  previews,
  named,
  hasObject,
  onSelect,
}: {
  step: WordStep;
  values: Record<WordStep, string>;
  previews: Record<WordStep, string>;
  named: boolean;
  hasObject: boolean;
  onSelect: (step: WordStep) => void;
}) {
  const board = useRef<HTMLDivElement>(null);
  const nodes = useRef<Partial<Record<WordStep, HTMLButtonElement>>>({});
  const [edges, setEdges] = useState<Edge[]>([]);
  useEffect(() => {
    const el = board.current;
    if (!el) return;
    const measure = () => {
      const parent = el.getBoundingClientRect();
      const padding = getComputedStyle(el);
      const mobile =
        el.clientWidth -
          parseFloat(padding.paddingLeft) -
          parseFloat(padding.paddingRight) <
        580;
      const links: [WordStep, WordStep, string, boolean][] = [
        ["who", "action", "does", mobile],
        ["action", "what", hasObject ? "uses" : "omitted", mobile],
        ["describe", "what", hasObject ? "describes" : "unused", !mobile],
        ["when", "action", "changes", !mobile],
      ];
      const next: Edge[] = [];
      for (const [from, to, label, vertical] of links) {
        const a = nodes.current[from]?.getBoundingClientRect();
        const b = nodes.current[to]?.getBoundingClientRect();
        if (!a || !b) continue;
        const reverse = from === "describe" || from === "when";
        const x1 =
          (vertical ? a.x + a.width / 2 : reverse ? a.x : a.right) - parent.x;
        const y1 =
          (vertical ? (reverse ? a.y : a.bottom) : a.y + a.height / 2) -
          parent.y;
        const x2 =
          (vertical ? b.x + b.width / 2 : reverse ? b.right : b.x) - parent.x;
        const y2 =
          (vertical ? (reverse ? b.bottom : b.y) : b.y + b.height / 2) -
          parent.y;
        const d = vertical
          ? `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`
          : `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`;
        next.push({
          from,
          to,
          label,
          d,
          x: (x1 + x2) / 2 + (vertical ? 7 : 0),
          y: (y1 + y2) / 2 + (vertical ? 3 : -7),
        });
      }
      setEdges(next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [hasObject]);
  function navigate(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const target =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? 4
          : ["ArrowRight", "ArrowDown"].includes(e.key)
            ? (index + 1) % 5
            : ["ArrowLeft", "ArrowUp"].includes(e.key)
              ? (index + 4) % 5
              : null;
    if (target === null) return;
    e.preventDefault();
    onSelect(ORDER[target]);
    nodes.current[ORDER[target]]?.focus();
  }
  return (
    <div className="word-board" ref={board}>
      <p className="sr-only">
        The pronoun or proper noun is the doer. It connects to the verb.{" "}
        {hasObject
          ? "The verb uses a noun. The adjective describes that noun."
          : "The verb is used without an object here. The noun and adjective slots are unused."}{" "}
        Time changes the verb form. Use arrow keys to choose a word type.
      </p>
      <svg className="grammar-wires" aria-hidden="true">
        <defs>
          <marker
            id="grammar-arrow"
            markerWidth="7"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <path d="M0 0 L7 3.5 L0 7" fill="context-stroke" />
          </marker>
        </defs>
        {edges.map((edge) => (
          <g key={edge.from}>
            <path
              className={`wire ${step === edge.from || step === edge.to ? "active" : ""} ${!hasObject && edge.to === "what" ? "unused" : ""}`}
              d={edge.d}
              markerEnd="url(#grammar-arrow)"
            />
            <text x={edge.x} y={edge.y} textAnchor="middle">
              {edge.label}
            </text>
          </g>
        ))}
      </svg>
      <div
        className="grammar-nodes"
        role="tablist"
        aria-label="Word types in your sentence"
      >
        {ORDER.map((id, i) => {
          const Icon = ICONS[id];
          return (
            <button
              type="button"
              key={id}
              ref={(node) => {
                if (node) nodes.current[id] = node;
              }}
              role="tab"
              id={`step-${id}`}
              aria-controls="piece-panel"
              aria-selected={step === id}
              tabIndex={step === id ? 0 : -1}
              onKeyDown={(e) => navigate(e, i)}
              className={`grammar-node role-${id} ${step === id ? "selected" : ""}`}
              style={{ gridArea: id }}
              onClick={() => onSelect(id)}
            >
              <span className="node-type">
                <Icon size={16} />
                {id === "who" && named ? "Proper noun" : WORD_ROLES[id].title}
              </span>
              <strong>{values[id]}</strong>
              <small>{previews[id] || WORD_ROLES[id].question}</small>
              <span className="node-edit">
                {step === id ? "Choosing" : "Change"}
              </span>
            </button>
          );
        })}
      </div>
      <div className="board-caption">
        <span className="board-signal" />
        Tap a word type. Follow its connections.
      </div>
    </div>
  );
}
