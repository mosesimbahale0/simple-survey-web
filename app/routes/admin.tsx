import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "~/components/Sidebar";
import { useNavigate } from "react-router";
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
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────

// const BASE_URL = "http://localhost:8080";
const BASE_URL = "https://simple-survey-api-709223111431.africa-south1.run.app";

// ─── XML Helpers ──────────────────────────────────────────────────────────────

function parseXML(str) {
  return new DOMParser().parseFromString(str, "application/xml");
}

function getText(el, tag) {
  const n = el.querySelector(tag);
  return n ? n.textContent.trim() : "";
}

function getAttr(el, attr) {
  return el.getAttribute(attr) ?? "";
}

function escXML(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function apiFetch(method, path, body = null) {
  const opts = { method, headers: { Accept: "application/xml" } };
  if (body) {
    opts.headers["Content-Type"] = "application/xml";
    opts.body = body;
  }
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return text ? parseXML(text) : null;
}

// Parse <surveys> → array
function parseSurveys(doc) {
  if (!doc) return [];
  return Array.from(doc.querySelectorAll("survey")).map((s) => ({
    id: getAttr(s, "id") || getText(s, "id"),
    name: getText(s, "name"),
    description: getText(s, "description"),
  }));
}

// Parse <questions> → array
function parseQuestions(doc) {
  if (!doc) return [];
  return Array.from(doc.querySelectorAll("question")).map((q) => {
    const options = Array.from(q.querySelectorAll("option")).map((o) => ({
      id: getAttr(o, "id"),
      value: getAttr(o, "value"),
      label: o.textContent.trim(),
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

// Parse paginated <question_responses>
function parseResponses(doc) {
  if (!doc) return { responses: [], total: 0, lastPage: 1 };
  const root = doc.querySelector("question_responses");
  const total = parseInt(root?.getAttribute("total_count") ?? "0", 10);
  const lastPage = parseInt(root?.getAttribute("last_page") ?? "1", 10);
  const responses = Array.from(doc.querySelectorAll("question_response")).map(
    (r) => {
      const certs = Array.from(r.querySelectorAll("certificate")).map((c) => ({
        id: getAttr(c, "id"),
        name: c.textContent.trim(),
      }));
      // Collect all field tags dynamically
      const fields = {};
      Array.from(r.children).forEach((child) => {
        const tag = child.tagName.toLowerCase();
        if (tag === "certificates") return;
        fields[tag] = child.textContent.trim();
      });
      return { fields, certificates: certs };
    },
  );
  return { responses, total, lastPage };
}

function buildSurveyXML(name, desc) {
  return `<survey><name>${escXML(name)}</name><description>${escXML(desc)}</description></survey>`;
}

function buildQuestionXML(q) {
  let inner = `<text>${escXML(q.text)}</text>`;
  if (q.description)
    inner += `<description>${escXML(q.description)}</description>`;
  if (q.type === "choice" && q.options?.length) {
    const multi = q.multiple ? ' multiple="yes"' : ' multiple="no"';
    const opts = q.options
      .map(
        (o) => `<option value="${escXML(o.value)}">${escXML(o.label)}</option>`,
      )
      .join("");
    inner += `<options${multi}>${opts}</options>`;
  }
  if (q.type === "file") {
    inner += `<file_properties format=".pdf" max_file_size="1" max_file_size_unit="mb" multiple="${q.multiple ? "yes" : "no"}" />`;
  }
  return `<question name="${escXML(q.name)}" type="${escXML(q.type)}" required="${q.required}">${inner}</question>`;
}

function buildOptionXML(value, label) {
  return `<option value="${escXML(value)}">${escXML(label)}</option>`;
}

function formatDate(str) {
  if (!str) return "—";
  try {
    return new Date(str).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return str;
  }
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const QUESTION_TYPES = [
  { value: "short_text", label: "Short Text" },
  { value: "long_text", label: "Long Text" },
  { value: "email", label: "Email" },
  { value: "choice", label: "Choice" },
  { value: "file", label: "File Upload" },
];

const TYPE_BADGE = {
  short_text: "bg-blue-50 text-[#2376E8]",
  long_text: "bg-violet-50 text-[#534AB7]",
  email: "bg-emerald-50 text-[#0F6E56]",
  choice: "bg-amber-50 text-[#854F0B]",
  file: "bg-slate-100 text-slate-500",
};

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Badge({ children, cls }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  variant = "primary",
  size = "md",
  className = "",
}) {
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

function Input({ label, ...props }) {
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

function Select({ label, children, ...props }) {
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

function Textarea({ label, ...props }) {
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

function ErrorBanner({ msg }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-[12.5px] mb-4">
      <AlertCircle size={14} /> {msg}
    </div>
  );
}

function ModalShell({ title, onClose, children, maxW = "max-w-lg" }) {
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

function Skeleton({ w = "50%", h = "h-4" }) {
  return (
    <div
      className={`${h} bg-slate-100 rounded animate-pulse`}
      style={{ width: w }}
    />
  );
}

// ─── Survey Modal (Create / Edit) ─────────────────────────────────────────────

function SurveyModal({ survey, onClose, onSaved }) {
  const [name, setName] = useState(survey?.name ?? "");
  const [desc, setDesc] = useState(survey?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const isEdit = !!survey?.id;

  async function save() {
    if (!name.trim()) {
      setErr("Survey name is required.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const xml = buildSurveyXML(name.trim(), desc.trim());
      await apiFetch(
        isEdit ? "PUT" : "POST",
        isEdit ? `/api/surveys/${survey.id}` : "/api/surveys",
        xml,
      );
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title={isEdit ? "Edit Survey" : "New Survey"}
      onClose={onClose}
      maxW="max-w-md"
    >
      <div className="px-6 py-5">
        <ErrorBanner msg={err} />
        <Input
          label="Survey Name"
          placeholder="e.g. Graduate Developer Application Survey"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Textarea
          label="Description"
          placeholder="What is this survey about?"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={save} disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Survey"}
        </Btn>
      </div>
    </ModalShell>
  );
}

// ─── Delete Survey Modal ──────────────────────────────────────────────────────

function DeleteSurveyModal({ survey, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function del() {
    setBusy(true);
    setErr("");
    try {
      await apiFetch("DELETE", `/api/surveys/${survey.id}`);
      onDeleted();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Delete Survey" onClose={onClose} maxW="max-w-sm">
      <div className="px-6 py-5">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <Trash2 size={18} className="text-red-500" />
        </div>
        <p className="text-[13px] text-slate-500 leading-relaxed">
          Delete <strong className="text-slate-700">"{survey.name}"</strong>?
          All questions and responses will be permanently removed.
        </p>
        <ErrorBanner msg={err} />
      </div>
      <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
        <Btn variant="danger" onClick={del} disabled={busy}>
          {busy ? "Deleting…" : "Delete"}
        </Btn>
      </div>
    </ModalShell>
  );
}

// ─── Question Modal (Create / Edit) ──────────────────────────────────────────

function QuestionModal({ surveyId, question, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: question?.name ?? "",
    text: question?.text ?? "",
    description: question?.description ?? "",
    type: question?.type ?? "short_text",
    required: question?.required ?? "yes",
    multiple: question?.multiple ?? false,
    options: question?.options ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const isEdit = !!question?.id;

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function addOption() {
    setForm((f) => ({
      ...f,
      options: [...f.options, { value: "", label: "" }],
    }));
  }
  function removeOption(i) {
    setForm((f) => ({
      ...f,
      options: f.options.filter((_, idx) => idx !== i),
    }));
  }
  function updateOption(i, key, val) {
    setForm((f) => {
      const opts = [...f.options];
      opts[i] = { ...opts[i], [key]: val };
      return { ...f, options: opts };
    });
  }

  async function save() {
    if (!form.name.trim() || !form.text.trim()) {
      setErr("Field name and question text are required.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const xml = buildQuestionXML(form);
      const path = isEdit
        ? `/api/surveys/${surveyId}/questions/${question.id}`
        : `/api/surveys/${surveyId}/questions`;
      await apiFetch(isEdit ? "PUT" : "POST", path, xml);
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const isChoice = form.type === "choice";

  return (
    <ModalShell
      title={isEdit ? "Edit Question" : "Add Question"}
      onClose={onClose}
    >
      <div className="px-6 py-5">
        <ErrorBanner msg={err} />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Field Name (slug)"
            placeholder="e.g. full_name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <Input
          label="Question Text"
          placeholder="What is your full name?"
          value={form.text}
          onChange={(e) => set("text", e.target.value)}
        />
        <Input
          label="Helper Text (optional)"
          placeholder="e.g. [Surname] [First Name]"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Required"
            value={form.required}
            onChange={(e) => set("required", e.target.value)}
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
          {(isChoice || form.type === "file") && (
            <div className="mb-4 flex items-end pb-1">
              <label className="flex items-center gap-2 text-[13px] text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.multiple}
                  onChange={(e) => set("multiple", e.target.checked)}
                  className="rounded"
                />
                Allow multiple
              </label>
            </div>
          )}
        </div>

        {isChoice && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Options
              </span>
              <Btn size="sm" variant="ghost" onClick={addOption}>
                <Plus size={12} /> Add Option
              </Btn>
            </div>
            {form.options.length === 0 && (
              <p className="text-[12px] text-slate-400 py-2">
                No options yet. Add at least one.
              </p>
            )}
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    placeholder="Value (e.g. REACT)"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-[12.5px] focus:outline-none focus:border-[#2376E8]"
                    value={opt.value}
                    onChange={(e) => updateOption(i, "value", e.target.value)}
                  />
                  <input
                    placeholder="Label (e.g. React JS)"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-[12.5px] focus:outline-none focus:border-[#2376E8]"
                    value={opt.label}
                    onChange={(e) => updateOption(i, "label", e.target.value)}
                  />
                  <button
                    onClick={() => removeOption(i)}
                    className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={save} disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Question"}
        </Btn>
      </div>
    </ModalShell>
  );
}

// ─── Delete Question Modal ────────────────────────────────────────────────────

function DeleteQuestionModal({ surveyId, question, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function del() {
    setBusy(true);
    setErr("");
    try {
      await apiFetch(
        "DELETE",
        `/api/surveys/${surveyId}/questions/${question.id}`,
      );
      onDeleted();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Delete Question" onClose={onClose} maxW="max-w-sm">
      <div className="px-6 py-5">
        <p className="text-[13px] text-slate-500">
          Delete the question{" "}
          <strong className="text-slate-700">"{question.text}"</strong>?
        </p>
        <ErrorBanner msg={err} />
      </div>
      <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
        <Btn variant="danger" onClick={del} disabled={busy}>
          {busy ? "Deleting…" : "Delete"}
        </Btn>
      </div>
    </ModalShell>
  );
}

// ─── Responses Panel ──────────────────────────────────────────────────────────

function ResponsesPanel({ surveyId }) {
  const [data, setData] = useState({ responses: [], total: 0, lastPage: 1 });
  const [page, setPage] = useState(1);
  const [email, setEmail] = useState("");
  const [debouncedEmail, setDebouncedEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // debounce email filter
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedEmail(email);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [email]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      let url = `/api/surveys/${surveyId}/responses?page=${page}&pageSize=10`;
      if (debouncedEmail) url += `&email=${encodeURIComponent(debouncedEmail)}`;
      const doc = await apiFetch("GET", url);
      setData(parseResponses(doc));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [surveyId, page, debouncedEmail]);

  useEffect(() => {
    load();
  }, [load]);

  const HIDDEN = new Set(["response_id", "date_responded"]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            placeholder="Filter by email…"
            className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-[13px] text-[#011F53] focus:outline-none focus:ring-2 focus:ring-[#2376E8]/30 focus:border-[#2376E8] transition"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button
          onClick={load}
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 transition"
        >
          <RefreshCw size={14} />
        </button>
        {!loading && (
          <span className="text-[12px] text-slate-400 ml-auto">
            {data.total} response{data.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {err && <ErrorBanner msg={err} />}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white border border-slate-100 rounded-2xl p-5 space-y-2"
            >
              <Skeleton w="40%" h="h-4" />
              <Skeleton w="60%" h="h-3" />
              <Skeleton w="50%" h="h-3" />
            </div>
          ))}
        </div>
      ) : data.responses.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-[13px]">
          No responses found.
        </div>
      ) : (
        <div className="space-y-3">
          {data.responses.map((r, i) => (
            <div
              key={i}
              className="bg-white border border-slate-100 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-[14px] font-semibold text-[#011F53]">
                    {r.fields.full_name || "—"}
                  </p>
                  <p className="text-[12px] text-slate-400">
                    {r.fields.email_address || ""}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <Badge cls="bg-slate-100 text-slate-500">
                    #{r.fields.response_id}
                  </Badge>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {r.fields.date_responded}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[12.5px] mb-3">
                {Object.entries(r.fields)
                  .filter(
                    ([k]) =>
                      !HIDDEN.has(k) &&
                      k !== "full_name" &&
                      k !== "email_address",
                  )
                  .map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-slate-400 capitalize min-w-[110px] flex-shrink-0">
                        {k.replace(/_/g, " ")}
                      </span>
                      <span className="text-slate-700 font-medium truncate">
                        {v || "—"}
                      </span>
                    </div>
                  ))}
              </div>
              {r.certificates.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Certificates
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {r.certificates.map((c) => (
                      <a
                        key={c.id}
                        href={`${BASE_URL}/api/certificates/${c.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[12px] text-[#2376E8] hover:bg-blue-50 hover:border-blue-200 transition font-medium"
                      >
                        <FileText size={12} />
                        {c.name}
                        <Download size={11} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data.lastPage > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 disabled:opacity-40 transition"
          >
            <ChevronLeft size={14} />
          </button>
          {[...Array(data.lastPage)].map((_, i) => {
            const p = i + 1;
            if (p === 1 || p === data.lastPage || Math.abs(p - page) <= 1)
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-[12px] font-semibold transition ${
                    p === page
                      ? "bg-[#2376E8] text-white"
                      : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              );
            if (Math.abs(p - page) === 2)
              return (
                <span key={p} className="text-slate-400 text-[12px]">
                  …
                </span>
              );
            return null;
          })}
          <button
            disabled={page === data.lastPage}
            onClick={() => setPage((p) => p + 1)}
            className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 disabled:opacity-40 transition"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Questions Panel ──────────────────────────────────────────────────────────

function QuestionsPanel({ surveyId, onResponsesClick }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const doc = await apiFetch("GET", `/api/surveys/${surveyId}/questions`);
      setQuestions(parseQuestions(doc));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      {err && <ErrorBanner msg={err} />}
      <div className="flex justify-between items-center mb-4">
        <p className="text-[12px] text-slate-400">
          {loading
            ? "Loading…"
            : `${questions.length} question${questions.length !== 1 ? "s" : ""}`}
        </p>
        <Btn size="sm" onClick={() => setModal({ type: "create" })}>
          <Plus size={13} /> Add Question
        </Btn>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-12 bg-slate-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-[13px]">
          No questions yet.
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q) => (
            <div
              key={q.id}
              className="flex items-start gap-3 p-4 bg-white border border-slate-100 rounded-xl group hover:border-slate-200 transition"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${TYPE_BADGE[q.type] ?? "bg-slate-100 text-slate-500"}`}
                  >
                    {q.type}
                  </span>
                  {q.required === "yes" && (
                    <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-[13.5px] font-semibold text-[#011F53] truncate">
                  {q.text}
                </p>
                {q.description && (
                  <p className="text-[11.5px] text-slate-400 truncate">
                    {q.description}
                  </p>
                )}
                {q.options.length > 0 && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {q.options.map((o) => o.label).join(", ")}
                  </p>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={() => setModal({ type: "edit", question: q })}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => setModal({ type: "delete", question: q })}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal?.type === "create" && (
        <QuestionModal
          surveyId={surveyId}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
      {modal?.type === "edit" && (
        <QuestionModal
          surveyId={surveyId}
          question={modal.question}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
      {modal?.type === "delete" && (
        <DeleteQuestionModal
          surveyId={surveyId}
          question={modal.question}
          onClose={() => setModal(null)}
          onDeleted={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}

// ─── Survey Detail View ───────────────────────────────────────────────────────

function SurveyDetail({ survey, onBack, onEdit, onDelete }) {
  const [tab, setTab] = useState("questions");

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
        <Btn size="sm" variant="ghost" onClick={onEdit}>
          <Pencil size={12} /> Edit
        </Btn>
        <Btn size="sm" variant="ghost-danger" onClick={onDelete}>
          <Trash2 size={12} /> Delete
        </Btn>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        {["questions", "responses"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-1.5 rounded-lg text-[13px] font-semibold transition capitalize ${
              tab === t
                ? "bg-white text-[#011F53] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "questions" ? (
        <QuestionsPanel surveyId={survey.id} />
      ) : (
        <ResponsesPanel surveyId={survey.id} />
      )}
    </div>
  );
}

// ─── Surveys List ─────────────────────────────────────────────────────────────

function SurveysList({ onSelect }) {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const doc = await apiFetch("GET", "/api/surveys");
      setSurveys(parseSurveys(doc));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold text-[#011F53] tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your surveys and view responses.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={load}
            className="p-2.5 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 transition"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => setModal({ type: "create" })}
            className="flex items-center gap-2 px-6 py-3 bg-[#2376E8] text-white text-sm font-semibold rounded-full hover:bg-[#1a60c4] active:scale-95 transition-all shadow-md shadow-blue-200"
          >
            <Plus size={16} /> Create Survey
          </button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Surveys",
            val: loading ? null : surveys.length,
            Icon: Clipboard,
            cls: "bg-blue-50 text-[#2376E8]",
          },
          {
            label: "Total Responses",
            val: "—",
            Icon: Users,
            cls: "bg-emerald-50 text-[#0F6E56]",
          },
          {
            label: "Completion Rate",
            val: "—",
            Icon: CheckCircle,
            cls: "bg-amber-50 text-[#854F0B]",
          },
          {
            label: "Active Surveys",
            val: loading ? null : surveys.length,
            Icon: Radio,
            cls: "bg-violet-50 text-[#534AB7]",
          },
        ].map(({ label, val, Icon, cls }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 hover:shadow-lg hover:shadow-slate-100 hover:-translate-y-0.5 transition-all cursor-default"
          >
            <div
              className={`w-11 h-11 rounded-[14px] flex items-center justify-center flex-shrink-0 ${cls}`}
            >
              <Icon size={20} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                {label}
              </p>
              {loading && val === null ? (
                <div className="h-6 w-10 bg-slate-100 rounded animate-pulse" />
              ) : (
                <p className="text-[22px] font-bold text-[#011F53] leading-none">
                  {val}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {[
          {
            label: "New survey from template",
            sub: "Choose from 20+ templates",
            Icon: ClipboardList,
            cls: "text-[#2376E8] bg-blue-50",
          },
          {
            label: "Invite team members",
            sub: "Collaborate on surveys",
            Icon: Users,
            cls: "text-[#0F6E56] bg-emerald-50",
          },
          {
            label: "Export all results",
            sub: "Download CSV or PDF",
            Icon: BarChart3,
            cls: "text-[#534AB7] bg-violet-50",
          },
        ].map(({ label, sub, Icon, cls }) => (
          <button
            key={label}
            className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 hover:shadow-md hover:shadow-slate-100 hover:-translate-y-0.5 text-left transition-all group"
          >
            <div
              className={`w-9 h-9 rounded-[12px] flex items-center justify-center flex-shrink-0 ${cls}`}
            >
              <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#011F53] truncate">
                {label}
              </p>
              <p className="text-[11.5px] text-slate-400 truncate">{sub}</p>
            </div>
            <ChevronRight
              size={14}
              className="text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0"
            />
          </button>
        ))}
      </div>

      {/* Surveys table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-[14px] font-bold text-[#011F53]">
              All Surveys
            </h2>
            <p className="text-[11.5px] text-slate-400 mt-0.5">
              {loading
                ? "Loading…"
                : `${surveys.length} survey${surveys.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {err && (
          <div className="px-6 py-4">
            <ErrorBanner msg={err} />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80">
                {["#", "Survey", "Description", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(4)].map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div
                          className="h-4 bg-slate-100 rounded animate-pulse"
                          style={{ width: j === 1 ? "60%" : "40%" }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : surveys.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-slate-400 text-[13px]"
                  >
                    No surveys yet.{" "}
                    <button
                      onClick={() => setModal({ type: "create" })}
                      className="text-[#2376E8] font-semibold hover:underline"
                    >
                      Create your first one →
                    </button>
                  </td>
                </tr>
              ) : (
                surveys.map((s) => (
                  <tr
                    key={s.id}
                    className="group hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Badge cls="bg-violet-50 text-[#534AB7]">#{s.id}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => onSelect(s)}
                        className="text-[13.5px] font-semibold text-[#2376E8] hover:underline text-left"
                      >
                        {s.name}
                      </button>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-[12.5px] text-slate-400 truncate">
                        {s.description || "—"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Btn
                          size="sm"
                          variant="ghost"
                          onClick={() => onSelect(s)}
                        >
                          <Eye size={12} /> Open
                        </Btn>
                        <Btn
                          size="sm"
                          variant="ghost"
                          onClick={() => setModal({ type: "edit", survey: s })}
                        >
                          <Pencil size={12} />
                        </Btn>
                        <Btn
                          size="sm"
                          variant="ghost-danger"
                          onClick={() =>
                            setModal({ type: "delete", survey: s })
                          }
                        >
                          <Trash2 size={12} />
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal?.type === "create" && (
        <SurveyModal
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
      {modal?.type === "edit" && (
        <SurveyModal
          survey={modal.survey}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
      {modal?.type === "delete" && (
        <DeleteSurveyModal
          survey={modal.survey}
          onClose={() => setModal(null)}
          onDeleted={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}

// ─── Root Page ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);

  function handleSelect(survey) {
    setSelected(survey);
  }
  function handleBack() {
    setSelected(null);
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 md:ml-[220px]">
        <div className="flex-1 p-6 md:p-8 lg:p-10">
          {selected ? (
            <SurveyDetail
              survey={selected}
              onBack={handleBack}
              onEdit={() => setModal({ type: "edit", survey: selected })}
              onDelete={() => setModal({ type: "delete", survey: selected })}
            />
          ) : (
            <SurveysList onSelect={handleSelect} />
          )}
        </div>
      </main>

      {/* Detail-level modals (edit/delete while in detail view) */}
      {modal?.type === "edit" && (
        <SurveyModal
          survey={modal.survey}
          onClose={() => setModal(null)}
          onSaved={() => {
            setSelected((s) => ({ ...s, ...modal.survey }));
            setModal(null);
          }}
        />
      )}
      {modal?.type === "delete" && (
        <DeleteSurveyModal
          survey={modal.survey}
          onClose={() => setModal(null)}
          onDeleted={() => {
            setSelected(null);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}
