export type ContractBlock =
  | { type: "title"; text: string }
  | { type: "date"; text: string }
  | { type: "paragraph"; text: string; bold?: boolean; align?: "left" | "center" | "justify" }
  | { type: "section"; text: string }
  | { type: "field"; value: string; hint?: string }
  | { type: "hint"; text: string }
  | { type: "checkbox"; text: string }
  | { type: "bullet"; text: string }
  | { type: "spacer"; height: number }
  | { type: "columns-header"; left: string; right: string }
  | { type: "columns-row"; left: string; right: string; leftHint?: string; rightHint?: string }
  | { type: "columns-single"; side: "left" | "right"; text: string }
  | { type: "signature-row"; left: string; right: string };
