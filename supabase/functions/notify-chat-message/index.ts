import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.105.0";
import { sendNotification } from "npm:web-push-neo@0.1.2";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
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

  let input: { message_id?: number };
  try {
    input = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const messageId = Number(input?.message_id);
  if (!Number.isSafeInteger(messageId) || messageId <= 0) return json({ error: "Invalid message" }, 400);

  const { data: message, error: messageError } = await admin
    .from("chat_messages")
    .select("id,conversation_id,sender_id,sender_display_name,created_at")
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

  const finish = async (status: "complete" | "partial" | "failed", attempted: number, succeeded: number) => {
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

    if (conversation.kind === "group") {
      const { data: members, error: memberError } = await admin
        .from("chat_members")
        .select("user_id,person_key,active")
        .eq("active", true)
        .neq("person_key", senderMember.person_key);

      if (memberError) throw memberError;
      recipientUserIds = Array.from(new Set((members || []).map((row) => row.user_id)));
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

    const [
      { data: subscriptions, error: subscriptionError },
      { data: preferences, error: preferenceError },
      { data: config, error: configError },
    ] = await Promise.all([
      admin.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth_key").in("user_id", recipientUserIds).eq("enabled", true),
      admin.from("push_preferences").select("user_id,chat_enabled,team_enabled,private_enabled").in("user_id", recipientUserIds),
      admin.from("push_server_config").select("vapid_public_key,vapid_private_key,vapid_subject").eq("id", 1).single(),
    ]);

    if (subscriptionError) throw subscriptionError;
    if (preferenceError) throw preferenceError;
    if (configError || !config) throw configError || new Error("Push server configuration missing");

    const preferenceMap = new Map((preferences || []).map((row) => [row.user_id, row]));
    const eligible = (subscriptions || []).filter((sub) => {
      const pref = preferenceMap.get(sub.user_id);
      if (!pref) return true;
      if (!pref.chat_enabled) return false;
      return conversation.kind === "group" ? pref.team_enabled : pref.private_enabled;
    });

    const payload = JSON.stringify({
      type: "chat",
      title: conversation.kind === "group" ? "Anaesthetic Team" : message.sender_display_name,
      body: conversation.kind === "group"
        ? `New message from ${message.sender_display_name}`
        : "New private message",
      conversation_id: conversation.id,
      conversation_kind: conversation.kind,
      tag: `chat-${conversation.id}`,
      url: `https://wiggli.github.io/Anaesthetic-roster/?view=chat&conversation=${encodeURIComponent(conversation.id)}`,
    });

    let succeeded = 0;
    const staleIds: string[] = [];

    await Promise.all(eligible.map(async (sub) => {
      try {
        await sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          payload,
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

    const attempted = eligible.length;
    const status = attempted === 0 || succeeded === attempted
      ? "complete"
      : succeeded > 0
      ? "partial"
      : "failed";

    await finish(status, attempted, succeeded);
    return json({ ok: true, attempted, succeeded });
  } catch (error) {
    console.error("Chat push dispatch failed", error);
    await finish("failed", 0, 0);
    return json({ error: "Notification dispatch failed" }, 500);
  }
});
