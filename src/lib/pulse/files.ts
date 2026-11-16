/**
 * Rules for the "file upload" question, shared by the survey page, the builder and the server.
 * Hosting limits a single upload to about 4.5 MB, so one file can be at most 4 MB.
 */
import type { Localized, Question } from "../types";

export const FILE_LIMIT_MB = 4;
export const FILE_DEFAULT_MB = 2;
export const FILES_MAX = 5;

/** File kinds a survey can accept. Anything that can run code (programs, scripts, web pages, SVG) is never allowed. */
export const FILE_GROUPS: { id: string; label: Localized; exts: string[] }[] = [
  { id: "pdf", label: { en: "PDF", ar: "PDF" }, exts: ["pdf"] },
  { id: "word", label: { en: "Word", ar: "وورد" }, exts: ["doc", "docx"] },
  { id: "excel", label: { en: "Excel / CSV", ar: "إكسل / CSV" }, exts: ["xls", "xlsx", "csv"] },
  { id: "powerpoint", label: { en: "PowerPoint", ar: "باوربوينت" }, exts: ["ppt", "pptx"] },
  { id: "text", label: { en: "Plain text", ar: "نص" }, exts: ["txt"] },
  { id: "image", label: { en: "Images (JPG, PNG, WebP, HEIC)", ar: "صور (JPG وPNG وWebP وHEIC)" }, exts: ["jpg", "jpeg", "png", "webp", "heic"] },
  { id: "audio", label: { en: "Voice notes (MP3, M4A)", ar: "رسائل صوتية (MP3 وM4A)" }, exts: ["mp3", "m4a"] },
];
export const ALL_FILE_EXTS = FILE_GROUPS.flatMap((g) => g.exts);
export const DEFAULT_FILE_TYPES = ["pdf", "doc", "docx", "jpg", "jpeg", "png"];

export const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
};

export function fileRules(q: Pick<Question, "fileTypes" | "maxSizeMb" | "maxFiles">) {
  const types = (q.fileTypes?.length ? q.fileTypes : DEFAULT_FILE_TYPES).filter((e) => ALL_FILE_EXTS.includes(e));
  const maxMb = Math.min(FILE_LIMIT_MB, Math.max(0.5, Number(q.maxSizeMb) || FILE_DEFAULT_MB));
  const maxFiles = Math.min(FILES_MAX, Math.max(1, Math.round(Number(q.maxFiles) || 1)));
  return { types, maxMb, maxBytes: Math.floor(maxMb * 1024 * 1024), maxFiles };
}

export function extOf(name: string): string {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
}

/** A file answer is stored on the device as "id.key,id.key" until the survey is sent. */
export function parseFileRefs(v: unknown): { id: string; key: string }[] {
  if (typeof v !== "string" || !v) return [];
  return v
    .split(",")
    .map((r) => r.trim().split("."))
    .filter((p) => p.length === 2 && /^[A-Za-z0-9_-]{8,64}$/.test(p[0]) && /^[A-Za-z0-9_-]{16,64}$/.test(p[1]))
    .map(([id, key]) => ({ id, key }))
    .slice(0, FILES_MAX);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
