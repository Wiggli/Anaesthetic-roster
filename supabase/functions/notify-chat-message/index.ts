import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.105.0";
import { sendNotification } from "npm:web-push-neo@0.1.2";

const APP_URL = "https://wiggli.github.io/Anaesthetic-roster/";
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://wiggli.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
};

type PushConfig = {
  vapid_public_key: string;
  vapid_private_key: string;
  vapid_subject: string;
};

type DispatchStatus = "complete" | "partial" | "failed";

async function loadPushData(admin: ReturnType<typeof createClient>, recipientUserIds: string[], preferenceFields: string) {
  if (!recipientUserIds.length) {
    return { subscriptions: [] as PushSubscriptionRow[], preferences: [] as Record<string, unknown>[], config: null as PushConfig | null };
  }

  const [
    { data: subscriptions, error: subscriptionError },
    { data: preferences, error: preferenceError },
    { data: config, error: configError },
  ] = await Promise.all([
    admin.from("push_subscriptions")
      .select("id,user_id,endpoint,p256dh,auth_key")
      .in("user_id", recipientUserIds)
      .eq("enabled", true),
    admin.from("push_preferences")
      .select(`user_id,${preferenceFields}`)
      .in("user_id", recipientUserIds),
    admin.from("push_server_config")
      .select("vapid_public_key,vapid_private_key,vapid_subject")
      .eq("id", 1)
      .single(),
  ]);

  if (subscriptionError) throw subscriptionError;
  if (preferenceError) throw preferenceError;
  if (configError || !config) throw configError || new Error("Push server configuration missing");

  return {
    subscriptions: (subscriptions || []) as PushSubscriptionRow[],
    preferences: (preferences || []) as Record<string, unknown>[],
    config: config as PushConfig,
  };
}

async function deliver(
  admin: ReturnType<typeof createClient>,
  subscriptions: PushSubscriptionRow[],
  config: PushConfig,
  payloadFor: (subscription: PushSubscriptionRow) => string,
) {
  let succeeded = 0;
  const staleIds: string[] = [];

  await Promise.all(subscriptions.map(async (sub) => {
    try {
      await sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        },
        payloadFor(sub),
        {
          vapidDetails: {
            subject: config.vapid_subject,
            publicKey: config.vapid_public_key,
            privateKey: config.vapid_private_key,
          },
          TTL: 300,
          urgency: "high",
          signal: AbortSignal.timeout(8000),
        },
      );
      succeeded += 1;
    } catch (error) {
      const status = Number(
        (error as { statusCode?: number; status?: number })?.statusCode ||
        (error as { status?: number })?.status ||
        0,
      );
      if (status === 404 || status === 410) staleIds.push(sub.id);
      console.error("Push send failed", { status, subscription_id: sub.id });
    }
  }));

  if (staleIds.length) {
    await admin.from("push_subscriptions").delete().in("id", staleIds);
  }

  return { attempted: subscriptions.length, succeeded };
}

function dispatchStatus(attempted: number, succeeded: number): DispatchStatus {
  if (attempted === 0 || succeeded === attempted) return "complete";
  return succeeded > 0 ? "partial" : "failed";
}

async function claimGenericDispatch(
  admin: ReturnType<typeof createClient>,
  eventKey: string,
  actorId: string | null,
) {
  const { error } = await admin.from("push_event_dispatches").insert({
    event_key: eventKey,
    actor_id: actorId,
    status: "processing",
  });
  if (!error) return { claimed: true, duplicate: false };
  if (error.code === "23505") return { claimed: false, duplicate: true };
  throw error;
}

async function finishGenericDispatch(
  admin: ReturnType<typeof createClient>,
  eventKey: string,
  status: DispatchStatus,
  attempted: number,
  succeeded: number,
) {
  await admin.from("push_event_dispatches").update({
    status,
    attempted,
    succeeded,
    completed_at: new Date().toISOString(),
  }).eq("event_key", eventKey);
}

function dateLabel(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return "the selected night";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  let serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const secretKeySet = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeySet) {
    try {
      serviceRoleKey = JSON.parse(secretKeySet).default || serviceRoleKey;
    } catch (_) {}
  }
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server configuration unavailable" }, 500);

  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Authentication required" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return json({ error: "Invalid session" }, 401);

  let input: {
    message_id?: number;
    kind?: "roster_update" | "access_request";
    event_id?: string;
    request_user_id?: string;
  };
  try {
    input = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  if (input?.message_id !== undefined) {
    const messageId = Number(input.message_id);
    if (!Number.isSafeInteger(messageId) || messageId <= 0) return json({ error: "Invalid message" }, 400);

    const { data: message, error: messageError } = await admin
      .from("chat_messages")
      .select("id,conversation_id,sender_id,sender_display_name,body,created_at")
      .eq("id", messageId)
      .maybeSingle();

    if (messageError || !message) return json({ error: "Message not found" }, 404);
    if (message.sender_id !== user.id) return json({ error: "Only the sender can dispatch this notification" }, 403);

    const ageMs = Date.now() - new Date(message.created_at).getTime();
    if (!Number.isFinite(ageMs) || ageMs > 10 * 60 * 1000) {
      return json({ error: "Notification window expired" }, 409);
    }

    const { error: claimError } = await admin
      .from("push_dispatches")
      .insert({ message_id: messageId, sender_id: user.id, status: "processing" });

    if (claimError) {
      if (claimError.code === "23505") return json({ ok: true, duplicate: true });
      return json({ error: "Could not claim notification" }, 500);
    }

    const finish = async (status: DispatchStatus, attempted: number, succeeded: number) => {
      await admin.from("push_dispatches").update({
        status,
        attempted,
        succeeded,
        completed_at: new Date().toISOString(),
      }).eq("message_id", messageId);
    };

    try {
      const { data: conversation, error: conversationError } = await admin
        .from("chat_conversations")
        .select("id,kind,user_a,user_b")
        .eq("id", message.conversation_id)
        .single();

      if (conversationError || !conversation) {
        await finish("failed", 0, 0);
        return json({ error: "Conversation not found" }, 404);
      }

      const { data: senderMember, error: senderMemberError } = await admin
        .from("chat_members")
        .select("user_id,person_key,active")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();

      if (senderMemberError || !senderMember?.person_key) {
        await finish("failed", 0, 0);
        return json({ error: "Active chat membership required" }, 403);
      }

      let recipientUserIds: string[] = [];
      const mentionedUserIds = new Set<string>();

      if (conversation.kind === "group") {
        const [{ data: members, error: memberError }, { data: directory, error: directoryError }] = await Promise.all([
          admin.from("chat_members")
            .select("user_id,person_key,active")
            .eq("active", true)
            .neq("person_key", senderMember.person_key),
          admin.from("chat_directory")
            .select("person_key,preferred_user_id,registered,active")
            .eq("active", true)
            .eq("registered", true),
        ]);

        if (memberError) throw memberError;
        if (directoryError) throw directoryError;

        const activeMembers = members || [];
        recipientUserIds = Array.from(new Set(activeMembers.map((row) => row.user_id)));

        const bodyLower = String(message.body || "").toLocaleLowerCase();
        const mentionedPersonKeys = new Set(
          (directory || [])
            .filter((row) => {
              const token = `@${String(row.person_key || "").trim()}`.toLocaleLowerCase();
              return token.length > 1 && bodyLower.includes(token);
            })
            .map((row) => row.person_key),
        );

        activeMembers.forEach((row) => {
          if (mentionedPersonKeys.has(row.person_key)) mentionedUserIds.add(row.user_id);
        });
      } else if (conversation.kind === "direct") {
        const participantIds = [conversation.user_a, conversation.user_b].filter(Boolean);
        const { data: participants, error: participantError } = await admin
          .from("chat_members")
          .select("user_id,person_key,active")
          .in("user_id", participantIds)
          .eq("active", true);

        if (participantError) throw participantError;
        const otherPersonKey = (participants || []).map((row) => row.person_key)
          .find((key) => key && key !== senderMember.person_key);

        if (!otherPersonKey) {
          await finish("complete", 0, 0);
          return json({ ok: true, attempted: 0, succeeded: 0 });
        }

        const { data: aliases, error: aliasError } = await admin
          .from("chat_members")
          .select("user_id")
          .eq("active", true)
          .eq("person_key", otherPersonKey);

        if (aliasError) throw aliasError;
        recipientUserIds = Array.from(new Set((aliases || []).map((row) => row.user_id)));
      } else {
        await finish("failed", 0, 0);
        return json({ error: "Unsupported conversation type" }, 400);
      }

      if (!recipientUserIds.length) {
        await finish("complete", 0, 0);
        return json({ ok: true, attempted: 0, succeeded: 0 });
      }

      const { subscriptions, preferences, config } = await loadPushData(
        admin,
        recipientUserIds,
        "chat_enabled,team_enabled,private_enabled,team_muted_until,mentions_enabled",
      );
      if (!config) throw new Error("Push server configuration missing");

      const preferenceMap = new Map(preferences.map((row) => [String(row.user_id), row]));
      const eligible = subscriptions.filter((sub) => {
        const pref = preferenceMap.get(sub.user_id) as Record<string, unknown> | undefined;
        if (pref?.chat_enabled === false) return false;
        if (conversation.kind === "group") {
          if (mentionedUserIds.has(sub.user_id) && pref?.mentions_enabled !== false) return true;
          if (pref?.team_enabled === false) return false;
          if (pref?.team_muted_until && new Date(String(pref.team_muted_until)).getTime() > Date.now()) return false;
          return true;
        }
        return pref?.private_enabled !== false;
      });

      const delivered = await deliver(admin, eligible, config, (sub) => {
        const mentioned = conversation.kind === "group" && mentionedUserIds.has(sub.user_id);
        return JSON.stringify({
          type: "chat",
          title: conversation.kind === "group" ? "Anaesthetic Team" : message.sender_display_name,
          body: mentioned
            ? `You were mentioned by ${message.sender_display_name}`
            : conversation.kind === "group"
            ? `New message from ${message.sender_display_name}`
            : "New private message",
          conversation_id: conversation.id,
          conversation_kind: conversation.kind,
          tag: `chat-${conversation.id}`,
          url: `${APP_URL}?view=chat&conversation=${encodeURIComponent(conversation.id)}`,
        });
      });

      const status = dispatchStatus(delivered.attempted, delivered.succeeded);
      await finish(status, delivered.attempted, delivered.succeeded);
      return json({ ok: true, attempted: delivered.attempted, succeeded: delivered.succeeded });
    } catch (error) {
      console.error("Chat push dispatch failed", error);
      await finish("failed", 0, 0);
      return json({ error: "Notification dispatch failed" }, 500);
    }
  }

  if (input?.kind === "roster_update") {
    const eventId = String(input.event_id || "").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId)) {
      return json({ error: "Invalid roster event" }, 400);
    }

    const { data: event, error: eventError } = await admin
      .from("roster_push_events")
      .select("id,roster_date,event_type,revision,created_by,created_at")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError || !event) return json({ error: "Roster event not found" }, 404);
    if (event.created_by !== user.id) return json({ error: "Only the event creator can dispatch this notification" }, 403);

    const ageMs = Date.now() - new Date(event.created_at).getTime();
    if (!Number.isFinite(ageMs) || ageMs > 10 * 60 * 1000) return json({ error: "Notification window expired" }, 409);

    const eventKey = `roster:${event.id}`;
    try {
      const claim = await claimGenericDispatch(admin, eventKey, user.id);
      if (claim.duplicate) return json({ ok: true, duplicate: true });

      const { data: senderMember } = await admin
        .from("chat_members")
        .select("person_key")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();

      if (!senderMember?.person_key) {
        await finishGenericDispatch(admin, eventKey, "failed", 0, 0);
        return json({ error: "Active roster membership required" }, 403);
      }

      const { data: members, error: memberError } = await admin
        .from("chat_members")
        .select("user_id,person_key")
        .eq("active", true)
        .neq("person_key", senderMember.person_key);
      if (memberError) throw memberError;

      const recipientUserIds = Array.from(new Set((members || []).map((row) => row.user_id)));
      const { subscriptions, preferences, config } = await loadPushData(admin, recipientUserIds, "roster_enabled");
      if (!config) throw new Error("Push server configuration missing");

      const preferenceMap = new Map(preferences.map((row) => [String(row.user_id), row]));
      const eligible = subscriptions.filter((sub) => {
        const pref = preferenceMap.get(sub.user_id) as Record<string, unknown> | undefined;
        return pref?.roster_enabled !== false;
      });

      const wording: Record<string, string> = {
        staffing: "Staffing was updated",
        allocation: "Tonight's allocation was updated",
        roles: "Night-only roles were updated",
      };
      const body = `${wording[event.event_type] || "The roster was updated"} for ${dateLabel(event.roster_date)}.`;

      const delivered = await deliver(admin, eligible, config, () => JSON.stringify({
        type: "roster",
        title: "Night Roster updated",
        body,
        roster_date: event.roster_date,
        tag: `roster-${event.roster_date}`,
        url: `${APP_URL}?view=night&date=${encodeURIComponent(event.roster_date)}`,
      }));

      const status = dispatchStatus(delivered.attempted, delivered.succeeded);
      await finishGenericDispatch(admin, eventKey, status, delivered.attempted, delivered.succeeded);
      return json({ ok: true, attempted: delivered.attempted, succeeded: delivered.succeeded });
    } catch (error) {
      console.error("Roster push dispatch failed", error);
      await finishGenericDispatch(admin, eventKey, "failed", 0, 0);
      return json({ error: "Notification dispatch failed" }, 500);
    }
  }

  if (input?.kind === "access_request") {
    const requestUserId = String(input.request_user_id || "").trim();
    if (requestUserId !== user.id) return json({ error: "Access request identity mismatch" }, 403);

    const { data: requestRow, error: requestError } = await admin
      .from("access_requests")
      .select("user_id,status,requested_at")
      .eq("user_id", requestUserId)
      .maybeSingle();

    if (requestError || !requestRow || requestRow.status !== "pending") {
      return json({ error: "Pending access request not found" }, 404);
    }

    const ageMs = Date.now() - new Date(requestRow.requested_at).getTime();
    if (!Number.isFinite(ageMs) || ageMs > 10 * 60 * 1000) return json({ error: "Notification window expired" }, 409);

    const eventKey = `access:${requestUserId}:${requestRow.requested_at}`;
    try {
      const claim = await claimGenericDispatch(admin, eventKey, user.id);
      if (claim.duplicate) return json({ ok: true, duplicate: true });

      const { data: adminRows, error: adminRowsError } = await admin
        .from("allowed_users")
        .select("email")
        .eq("user_role", "admin")
        .eq("active", true);
      if (adminRowsError) throw adminRowsError;

      const { data: usersPage, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (usersError) throw usersError;

      const adminEmails = new Set((adminRows || []).map((row) => String(row.email || "").toLocaleLowerCase()));
      const recipientUserIds = (usersPage?.users || [])
        .filter((candidate) => candidate.email && adminEmails.has(candidate.email.toLocaleLowerCase()))
        .map((candidate) => candidate.id)
        .filter((id) => id !== user.id);

      const { subscriptions, preferences, config } = await loadPushData(admin, recipientUserIds, "access_request_enabled");
      if (!config) throw new Error("Push server configuration missing");

      const preferenceMap = new Map(preferences.map((row) => [String(row.user_id), row]));
      const eligible = subscriptions.filter((sub) => {
        const pref = preferenceMap.get(sub.user_id) as Record<string, unknown> | undefined;
        return pref?.access_request_enabled !== false;
      });

      const delivered = await deliver(admin, eligible, config, () => JSON.stringify({
        type: "access_request",
        title: "Night Roster",
        body: "A new access request is waiting for review.",
        tag: "night-roster-access-request",
        url: `${APP_URL}?view=admin&tab=access`,
      }));

      const status = dispatchStatus(delivered.attempted, delivered.succeeded);
      await finishGenericDispatch(admin, eventKey, status, delivered.attempted, delivered.succeeded);
      return json({ ok: true, attempted: delivered.attempted, succeeded: delivered.succeeded });
    } catch (error) {
      console.error("Access-request push dispatch failed", error);
      await finishGenericDispatch(admin, eventKey, "failed", 0, 0);
      return json({ error: "Notification dispatch failed" }, 500);
    }
  }

  return json({ error: "Unsupported notification request" }, 400);
});
