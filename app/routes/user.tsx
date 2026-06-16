import React, { useState, useEffect, useCallback } from "react";
import Navbar from "~/components/Navbar"; // Changed from Sidebar to Navbar
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  ChevronRight,
  ArrowRight,
  Clipboard,
  CheckCircle,
  Radio,
  Users,
  BarChart3,
  ClipboardList,
  RefreshCw,
  AlertCircle,
  X,
  Download,
  Search,
  FileText,
  ChevronLeft,
  ChevronDown,
  UploadCloud, // Added for file input
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = "https://simple-survey-api-709223111431.africa-south1.run.app";

// ─── XML Helpers (from admin.tsx) ─────────────────────────────────────────────
function parseXML(str: string) {
  return new DOMParser().parseFromString(str, "application/xml");
}

function getText(el: Element, tag: string) {
  const n = el.querySelector(tag);
  return n ? n.textContent?.trim() : "";
}

function getAttr(el: Element, attr: string) {
  return el.getAttribute(attr) ?? "";
}

function escXML(s: string | null | undefined) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── API (from admin.tsx) ─────────────────────────────────────────────────────
async function apiFetch(method: string, path: string, body: string | null = null) {
  const opts: RequestInit = { method, headers: { Accept: "application/xml" } };
  if (body) {
    opts.headers = { ...opts.headers, "Content-Type": "application/xml" };
    opts.body = body;
  }
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text ? parseXML(text) : null;
}

// Parse <surveys> → array (from admin.tsx)
function parseSurveys(doc: Document | null) {
  if (!doc) return [];
  return Array.from(doc.querySelectorAll("survey")).map((s) => ({
    id: getAttr(s, "id") || getText(s, "id"),
    name: getText(s, "name"),
    description: getText(s, "description"),
  }));
}

// Parse <questions> → array (from admin.tsx)
function parseQuestions(doc: Document | null) {
  if (!doc) return [];
  return Array.from(doc.querySelectorAll("question")).map((q) => {
    const options = Array.from(q.querySelectorAll("option")).map((o) => ({
      id: getAttr(o, "id"),
      value: getAttr(o, "value"),
      label: o.textContent?.trim() || "",
    }));
    const fp = q.querySelector("file_properties");
    return {
      id: getAttr(q, "id"),
      name: getAttr(q, "name"),
      type: getAttr(q, "type"),
      required: getAttr(q, "required"),
      text: getText(q, "text"),
      description: getText(q, "description"),
      multiple: q.querySelector("options")?.getAttribute("multiple") === "yes",
      options,
      fileProps: fp
        ? {
            format: getAttr(fp, "format"),
            maxSize: getAttr(fp, "max_file_size"),
            maxSizeUnit: getAttr(fp, "max_file_size_unit"),
            multiple: getAttr(fp, "multiple") === "yes",
          }
        : null,
    };
  });
}

// ─── Shared UI (from admin.tsx - selected ones for user view) ─────────────────
// I'll only bring over the ones that are likely to be used in the user view,
// specifically for displaying surveys and submitting responses.
// For now, I'll just bring over Badge, Btn, Input, Select, Textarea, ErrorBanner, ModalShell, Skeleton
// as these are general purpose. The rest can be added as needed.

interface BadgeProps {
  children: React.ReactNode;
  cls: string;
}
function Badge({ children, cls }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

interface BtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger" | "ghost-danger";
  size?: "sm" | "md" | "lg";
  className?: string;
}
function Btn({
  children,
  onClick,
  disabled,
  variant = "primary",
  size = "md",
  className = "",
}: BtnProps) {
  const base =
    "inline-flex items-center gap-1.5 font-semibold transition-all rounded-xl disabled:opacity-50";
  const sizes = {
    sm: "px-3 py-1.5 text-[12px]",
    md: "px-4 py-2 text-[13px]",
    lg: "px-6 py-2.5 text-[13.5px]",
  };
  const variants = {
    primary: "bg-[#2376E8] text-white hover:bg-[#1a60c4]",
    ghost:
      "border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50",
    danger: "bg-red-500 text-white hover:bg-red-600",
    "ghost-danger":
      "border border-slate-200 bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}
function Input({ label, ...props }: InputProps) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          {label}
        </label>
      )}
      <input
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[13.5px] text-[#011F53] placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2376E8]/30 focus:border-[#2376E8] transition"
        {...props}
      />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: React.ReactNode;
}
function Select({ label, children, ...props }: SelectProps) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          {label}
        </label>
      )}
      <select
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[13.5px] text-[#011F53] focus:outline-none focus:ring-2 focus:ring-[#2376E8]/30 focus:border-[#2376E8] transition appearance-none bg-white"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}
function Textarea({ label, ...props }: TextareaProps) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        rows={3}
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[13.5px] text-[#011F53] placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2376E8]/30 focus:border-[#2376E8] transition resize-none"
        {...props}
      />
    </div>
  );
}

interface ErrorBannerProps {
  msg: string | null;
}
function ErrorBanner({ msg }: ErrorBannerProps) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-[12.5px] mb-4">
      <AlertCircle size={14} /> {msg}
    </div>
  );
}

interface ModalShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxW?: string;
}
function ModalShell({ title, onClose, children, maxW = "max-w-lg" }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${maxW} max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="text-[15px] font-bold text-[#011F53]">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

interface SkeletonProps {
  w?: string;
  h?: string;
}
function Skeleton({ w = "50%", h = "h-4" }: SkeletonProps) {
  return (
    <div
      className={`${h} bg-slate-100 rounded animate-pulse`}
      style={{ width: w }}
    />
  );
}

// ─── User-specific components ─────────────────────────────────────────────────

interface Survey {
  id: string;
  name: string;
  description: string;
}

interface Question {
  id: string;
  name: string;
  type: string;
  required: string;
  text: string;
  description: string;
  multiple: boolean;
  options: { id: string; value: string; label: string }[];
  fileProps: {
    format: string;
    maxSize: string;
    maxSizeUnit: string;
    multiple: boolean;
  } | null;
}

// This component will list available surveys for the user to respond to.
function UserSurveyList({ onSelect }: { onSelect: (survey: Survey) => void }) {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSurveys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const doc = await apiFetch("GET", "/api/surveys");
      setSurveys(parseSurveys(doc));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSurveys();
  }, [loadSurveys]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold text-[#011F53] tracking-tight">
            Available Surveys
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Select a survey to submit your response.
          </p>
        </div>
        <Btn size="sm" variant="ghost" onClick={loadSurveys}>
          <RefreshCw size={15} /> Refresh
        </Btn>
      </div>

      {error && <ErrorBanner msg={error} />}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white border border-slate-100 rounded-2xl p-5 space-y-2"
            >
              <Skeleton w="60%" h="h-4" />
              <Skeleton w="80%" h="h-3" />
            </div>
          ))}
        </div>
      ) : surveys.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-[13px]">
          No surveys available at the moment.
        </div>
      ) : (
        <div className="space-y-3">
          {surveys.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className="flex items-center justify-between gap-4 p-5 bg-white border border-slate-100 rounded-2xl group hover:border-[#2376E8] hover:shadow-md hover:shadow-blue-100 transition-all w-full text-left"
            >
              <div>
                <p className="text-[15px] font-semibold text-[#011F53] group-hover:text-[#2376E8]">
                  {s.name}
                </p>
                {s.description && (
                  <p className="text-[12.5px] text-slate-400 mt-1">
                    {s.description}
                  </p>
                )}
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-[#2376E8] transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// This component will display a single survey for response submission.
function UserSurveyDetail({ survey, onBack }: { survey: Survey; onBack: () => void }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch("GET", `/api/surveys/${survey.id}/questions`)
      .then((doc) => {
        const qs = parseQuestions(doc);
        setQuestions(qs);
        const init: Record<string, any> = {};
        qs.forEach((q) => {
          if (q.type === "choice" && q.multiple) init[q.name] = [];
          else init[q.name] = "";
        });
        setValues(init);
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [survey.id]);

  const handleChange = (name: string, val: any) => setValues((v) => ({ ...v, [name]: val }));

  const handleCheckbox = (name: string, val: string, checked: boolean) => {
    setValues((v) => ({
      ...v,
      [name]: checked
        ? [...(v[name] || []), val]
        : (v[name] || []).filter((x: string) => x !== val),
    }));
  };

  const handleFiles = (name: string, newFiles: FileList | null) => {
    if (newFiles) {
      setFiles((f) => ({
        ...f,
        [name]: [...(f[name] || []), ...Array.from(newFiles)],
      }));
    }
  };

  const removeFile = (name: string, idx: number) => {
    setFiles((f) => ({ ...f, [name]: f[name].filter((_: any, i: number) => i !== idx) }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitErr(null);
    try {
      const fd = new FormData();
      questions.forEach((q) => {
        if (q.type === "file") {
          (files[q.name] || []).forEach((file) => fd.append(q.name, file));
        } else if (q.type === "choice" && q.multiple) {
          fd.append(q.name, (values[q.name] || []).join(","));
        } else {
          fd.append(q.name, values[q.name] || "");
        }
      });
      await fetch(`${BASE_URL}/api/surveys/${survey.id}/responses`, {
        method: "POST",
        body: fd,
      });
      setSuccess(true);
      setValues({});
      setFiles({});
    } catch (e: any) {
      setSubmitErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-16"><Skeleton w="100%" h="h-8" /></div>;
  if (error) return <ErrorBanner msg={error} />;

  if (success) {
    return (
      <div className="bg-emerald-50 text-[#0F6E56] border border-emerald-100 rounded-xl px-6 py-5 mb-6 flex items-center gap-4">
        <CheckCircle size={24} />
        <div>
          <h3 className="text-[15px] font-semibold">Response submitted!</h3>
          <p className="text-[12.5px] text-emerald-700 mt-1">Your answers have been recorded.</p>
        </div>
        <Btn
          variant="ghost"
          size="sm"
          onClick={() => setSuccess(false)}
          className="ml-auto"
        >
          Submit another
        </Btn>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 transition"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-[17px] font-bold text-[#011F53] truncate">
            {survey.name}
          </h2>
          {survey.description && (
            <p className="text-[12px] text-slate-400 truncate">
              {survey.description}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h3 className="text-[15px] font-bold text-[#011F53] mb-2">Submit a Response</h3>
        <p className="text-[12.5px] text-slate-400 mb-6">All fields marked * are required</p>

        {submitErr && <ErrorBanner msg={submitErr} />}

        {questions.map((q, i) => (
          <div className="mb-5" key={q.name}>
            <label className="block text-[13px] font-semibold text-[#011F53] mb-2">
              {i + 1}. {q.text}
              {q.required === "yes" && <span className="text-red-500"> *</span>}
            </label>
            {q.description && (
              <p className="text-[12px] text-slate-400 mb-2">{q.description}</p>
            )}

            {q.type === "short_text" && (
              <Input
                type="text"
                value={values[q.name] || ""}
                onChange={(e) => handleChange(q.name, e.target.value)}
              />
            )}
            {q.type === "long_text" && (
              <Textarea
                value={values[q.name] || ""}
                onChange={(e) => handleChange(q.name, e.target.value)}
              />
            )}
            {q.type === "email" && (
              <Input
                type="email"
                value={values[q.name] || ""}
                onChange={(e) => handleChange(q.name, e.target.value)}
              />
            )}
            {q.type === "choice" && q.multiple === false && (
              <div className="space-y-2">
                {q.options.map((o) => (
                  <label className="flex items-center gap-2 text-[13px] text-slate-600 cursor-pointer select-none" key={o.value}>
                    <input
                      type="radio"
                      name={q.name}
                      value={o.value}
                      checked={values[q.name] === o.value}
                      onChange={() => handleChange(q.name, o.value)}
                      className="rounded-full text-[#2376E8] focus:ring-[#2376E8]/30"
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            )}
            {q.type === "choice" && q.multiple === true && (
              <div className="space-y-2">
                {q.options.map((o) => (
                  <label className="flex items-center gap-2 text-[13px] text-slate-600 cursor-pointer select-none" key={o.value}>
                    <input
                      type="checkbox"
                      value={o.value}
                      checked={(values[q.name] || []).includes(o.value)}
                      onChange={(e) =>
                        handleCheckbox(q.name, o.value, e.target.checked)
                      }
                      className="rounded text-[#2376E8] focus:ring-[#2376E8]/30"
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            )}
            {q.type === "file" && (
              <div className="border border-slate-200 rounded-xl p-4">
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#2376E8] transition-colors">
                  <input
                    type="file"
                    className="hidden"
                    accept={q.fileProps?.format || "*/*"}
                    multiple={q.fileProps?.multiple}
                    onChange={(e) => handleFiles(q.name, e.target.files)}
                  />
                  <UploadCloud size={24} className="text-slate-400 mb-2" />
                  <p className="text-[13px] text-slate-500">
                    Drag and drop files here, or{" "}
                    <span className="text-[#2376E8] font-medium">browse</span>
                  </p>
                  {q.fileProps?.format && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Accepted formats: {q.fileProps.format}
                    </p>
                  )}
                </label>
                {(files[q.name] || []).length > 0 && (
                  <div className="mt-4 space-y-2">
                    {(files[q.name] || []).map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-[12.5px]">
                        <span className="flex items-center gap-2 text-slate-700">
                          <FileText size={14} /> {f.name}
                        </span>
                        <button
                          onClick={() => removeFile(q.name, idx)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <div className="flex justify-end border-t border-slate-100 pt-5 mt-6">
          <Btn onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Submitting…
              </>
            ) : (
              "Submit Response"
            )}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Root Page ────────────────────────────────────────────────────────────────

export default function UserSurveyPage() {
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

  const handleSelectSurvey = (survey: Survey) => {
    setSelectedSurvey(survey);
  };

  const handleBackToList = () => {
    setSelectedSurvey(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <Navbar /> {/* Replaced Sidebar with Navbar */}
      <main className="flex-1 flex flex-col min-w-0"> {/* Removed md:ml-[220px] */}
        <div className="flex-1 p-6 md:p-8 lg:p-10">
          {selectedSurvey ? (
            <UserSurveyDetail survey={selectedSurvey} onBack={handleBackToList} />
          ) : (
            <UserSurveyList onSelect={handleSelectSurvey} />
          )}
        </div>
      </main>
    </div>
  );
}