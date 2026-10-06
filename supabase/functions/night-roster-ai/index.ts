import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const PROD_ORIGIN = "https://wiggli.github.io";
const DEV_ORIGINS = new Set(["http://127.0.0.1:4173", "http://127.0.0.1:5173", "http://localhost:4173", "http://localhost:5173"]);
const MODES = new Set(["brief", "changes", "explain", "ask"]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowed = origin === PROD_ORIGIN || DEV_ORIGINS.has(origin) ? origin : PROD_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function text(value: unknown, max = 240) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

function numberValue(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.max(0, Math.min(n, 99)) : 0;
}

function boolValue(value: unknown) {
  return value === true;
}

type Role = { label: string; names: string; detail: string; mine: boolean };
type ChangeItem = { label: string; type: string; title: string; detail: string; meta: string };
type RosterContext = {
  date: string;
  phase: string;
  shift_name: string;
  freshness: string;
  personal: {
    display_name: string;
    assignment: string;
    detail: string;
    period: string;
    break_label: string;
    context_label: string;
    colleague: string;
    duty_part: string;
    live_status: string;
    changed: boolean;
  };
  staffing: {
    nurse_count: number;
    absence_count: number;
    overtime_count: number;
    overtime_names: string[];
    unresolved_count: number;
    decision_count: number;
    confirm_needed: boolean;
    context_label: string;
    current_part: string;
    roles: Role[];
  };
  recent_changes: {
    updated: boolean;
    updated_count: number;
    since_label: string;
    items: ChangeItem[];
  };
};

function sanitiseContext(raw: unknown): RosterContext {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const personalRaw = value.personal && typeof value.personal === "object" ? value.personal as Record<string, unknown> : {};
  const staffingRaw = value.staffing && typeof value.staffing === "object" ? value.staffing as Record<string, unknown> : {};
  const changesRaw = value.recent_changes && typeof value.recent_changes === "object" ? value.recent_changes as Record<string, unknown> : {};
  const rolesRaw = Array.isArray(staffingRaw.roles) ? staffingRaw.roles.slice(0, 10) : [];
  const changesItemsRaw = Array.isArray(changesRaw.items) ? changesRaw.items.slice(0, 8) : [];
  return {
    date: text(value.date, 20),
    phase: text(value.phase, 30),
    shift_name: text(value.shift_name, 80),
    freshness: text(value.freshness, 80),
    personal: {
      display_name: text(personalRaw.display_name, 100),
      assignment: text(personalRaw.assignment, 120),
      detail: text(personalRaw.detail, 180),
      period: text(personalRaw.period, 80),
      break_label: text(personalRaw.break_label, 100),
      context_label: text(personalRaw.context_label, 80),
      colleague: text(personalRaw.colleague, 140),
      duty_part: text(personalRaw.duty_part, 60),
      live_status: text(personalRaw.live_status, 80),
      changed: boolValue(personalRaw.changed),
    },
    staffing: {
      nurse_count: numberValue(staffingRaw.nurse_count),
      absence_count: numberValue(staffingRaw.absence_count),
      overtime_count: numberValue(staffingRaw.overtime_count),
      overtime_names: (Array.isArray(staffingRaw.overtime_names) ? staffingRaw.overtime_names : []).slice(0, 8).map(v => text(v, 100)),
      unresolved_count: numberValue(staffingRaw.unresolved_count),
      decision_count: numberValue(staffingRaw.decision_count),
      confirm_needed: boolValue(staffingRaw.confirm_needed),
      context_label: text(staffingRaw.context_label, 100),
      current_part: text(staffingRaw.current_part, 40),
      roles: rolesRaw.map((role): Role => {
        const r = role && typeof role === "object" ? role as Record<string, unknown> : {};
        return { label: text(r.label, 80), names: text(r.names, 160), detail: text(r.detail, 180), mine: boolValue(r.mine) };
      }),
    },
    recent_changes: {
      updated: boolValue(changesRaw.updated),
      updated_count: numberValue(changesRaw.updated_count),
      since_label: text(changesRaw.since_label, 100),
      items: changesItemsRaw.map((item): ChangeItem => {
        const r = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return { label: text(r.label, 60), type: text(r.type, 50), title: text(r.title, 140), detail: text(r.detail, 220), meta: text(r.meta, 120) };
      }),
    },
  };
}

function likelyPatientInfo(value: string) {
  return /\b(patient|mrn|hospital number|diagnos(?:is|es)|medication|drug|procedure|operation details|clinical note|ward note)\b/i.test(value);
}

function fallback(mode: string, ctx: RosterContext, question: string) {
  const p = ctx.personal;
  const s = ctx.staffing;
  const items = ctx.recent_changes.items;
  const staffing = s.nurse_count ? `${s.nurse_count} nurses are in the effective plan.` : "Staffing is not yet available.";
  const decisions = s.unresolved_count ? `${s.unresolved_count} roster decision${s.unresolved_count === 1 ? " remains" : "s remain"}.` : "No roster decisions currently need attention.";
  if (mode === "brief") {
    const parts: string[] = [];
    if (p.assignment) parts.push(`You are allocated to ${p.assignment}${p.period ? ` (${p.period})` : ""}.`);
    parts.push(staffing);
    if (s.overtime_names.length) parts.push(`${s.overtime_names.join(", ")} ${s.overtime_names.length === 1 ? "is" : "are"} recorded as overtime cover.`);
    parts.push(decisions);
    return parts.join(" ");
  }
  if (mode === "changes") {
    if (!items.length) return "No staffing or allocation changes are recorded for this night.";
    return items.slice(0, 3).map(item => `${item.title}${item.detail ? ` — ${item.detail}` : ""}`).join(" ");
  }
  if (mode === "explain") {
    if (!p.assignment) return "I cannot confirm your allocation from the current shared roster.";
    let answer = `Your current shared allocation is ${p.assignment}. The roster engine, not AI, determines this from the published rotation, confirmed staffing changes and any approved night-only overrides.`;
    if (s.context_label) answer += ` This night is currently marked as ${s.context_label.toLowerCase()}.`;
    if (p.colleague) answer += ` Your related team context is ${p.colleague}.`;
    return answer;
  }
  const q = question.toLowerCase();
  if (/break/.test(q)) return p.break_label ? `Your break is ${p.break_label}.` : "I cannot confirm your break from the current shared roster.";
  if (/who.*(with|working)|colleague|partner/.test(q)) return p.colleague ? `Your roster shows ${p.colleague}.` : "I cannot confirm who you are working with from the current shared roster.";
  if (/staff|cover|how many|fully staffed/.test(q)) return `${staffing} ${decisions}`;
  if (/change|changed|update/.test(q)) return fallback("changes", ctx, "");
  if (/why|allocation|allocated|role|duty/.test(q)) return fallback("explain", ctx, "");
  return "I can answer questions about your allocation, break, colleagues, staffing and recorded roster changes. I cannot confirm anything that is not present in the current shared roster.";
}

function modelInstructions(mode: string) {
  const common = [
    "You are Night Roster AI for an anaesthetic nursing staffing application.",
    "Use ONLY the supplied roster context. Never invent a person, allocation, break, change, time or staffing fact.",
    "If the context does not contain the answer, say you cannot confirm it from the current shared roster.",
    "The deterministic roster engine is the authority. AI only explains and summarises; it never decides, changes or recommends changing an allocation.",
    "Do not infer why a nurse is absent, their health status, or any personal fact beyond the supplied roster context.",
    "Do not discuss patient information, clinical advice, diagnoses, medication, procedures or patient care. If asked, say this assistant is limited to roster and staffing information.",
    "Use concise, natural British English suitable for a nurse checking the app during a night shift.",
    "Do not use markdown headings or bullet lists unless the user explicitly asks for a list.",
  ];
  if (mode === "brief") common.push("Produce a maximum of three short sentences covering the user's allocation, staffing state, meaningful recorded changes and unresolved roster decisions. Do not repeat empty information.");
  if (mode === "changes") common.push("Summarise the supplied recent roster activity in one to three sentences. State whether the user's own allocation changed only when the context explicitly supports that claim.");
  if (mode === "explain") common.push("Explain the user's effective allocation in plain language. Explicitly say the roster engine made the allocation, not AI. Distinguish a standard night from an updated/provisional night only if the context says so.");
  if (mode === "ask") common.push("Answer the user's question directly in one to four sentences. Prefer a direct factual answer before any explanation.");
  return common.join(" ");
}

function extractResponseText(data: Record<string, unknown>) {
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  const output = Array.isArray(data.output) ? data.output : [];
  const parts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as Record<string, unknown>).content) ? (item as Record<string, unknown>).content as unknown[] : [];
    for (const part of content) {
      if (part && typeof part === "object" && (part as Record<string, unknown>).type === "output_text") {
        const value = text((part as Record<string, unknown>).text, 2000);
        if (value) parts.push(value);
      }
    }
  }
  return parts.join("\n").trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) return json(req, { error: "Server configuration unavailable" }, 500);

  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(req, { error: "Authentication required" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user || !user.email) return json(req, { error: "Invalid session" }, 401);

  const normalisedEmail = user.email.trim().toLowerCase();
  const { data: accessRows, error: accessError } = await admin.from("allowed_users").select("active,user_role,roster_name,email").eq("active", true);
  const access = Array.isArray(accessRows)
    ? accessRows.find(row => text((row as Record<string, unknown>).email, 320).toLowerCase() === normalisedEmail)
    : null;
  if (accessError || !access) return json(req, { error: "Roster access is not approved" }, 403);

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 24000) return json(req, { error: "Request too large" }, 413);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch (_) { return json(req, { error: "Invalid JSON" }, 400); }
  const mode = text(body.mode, 20);
  if (!MODES.has(mode)) return json(req, { error: "Unsupported AI mode" }, 400);
  const question = text(body.question, 500);
  if (likelyPatientInfo(question)) return json(req, { answer: "This assistant is limited to roster and staffing information. Please do not enter patient information.", ai: false, reason: "patient_scope" });

  const context = sanitiseContext(body.context);
  if (!context.date) return json(req, { error: "Roster context is missing a selected night" }, 400);
  const safeFallback = fallback(mode, context, question);
  const apiKey = Deno.env.get("GROQ_API_KEY") || "";
  if (!apiKey) return json(req, { answer: safeFallback, ai: false, reason: "not_configured" });

  const model = Deno.env.get("GROQ_NIGHT_ROSTER_MODEL") || "openai/gpt-oss-20b";
  const input = `Mode: ${mode}\n${question ? `Question: ${question}\n` : ""}Roster context (authoritative for this answer):\n${JSON.stringify(context)}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        store: false,
        instructions: modelInstructions(mode),
        input,
        max_output_tokens: mode === "ask" ? 360 : 260,
        reasoning: { effort: "low" },
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      console.error("Night Roster AI provider request failed", { status: response.status, mode });
      return json(req, { answer: safeFallback, ai: false, reason: "model_unavailable" });
    }
    const data = await response.json() as Record<string, unknown>;
    const answer = extractResponseText(data);
    if (!answer) return json(req, { answer: safeFallback, ai: false, reason: "empty_model_response" });
    return json(req, { answer: text(answer, 1800), ai: true, model, provider: "groq" });
  } catch (error) {
    console.error("Night Roster AI provider error", { mode, name: error instanceof Error ? error.name : "error" });
    return json(req, { answer: safeFallback, ai: false, reason: "model_unavailable" });
  }
});
