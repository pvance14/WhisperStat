import { createClient } from "npm:@supabase/supabase-js@2";

const validEventTypes = [
  "kill",
  "ace",
  "serve_error",
  "reception_error",
  "block",
  "dig",
  "attack_error",
  "set"
] as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

type StatEventType = (typeof validEventTypes)[number];

type PlayerRow = {
  id: string;
  first_name: string;
  last_name: string;
  jersey_number: number;
  aliases: string[] | null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders
  });

const extractJsonObject = (content: string) => {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("Model response did not include a JSON object.");
  }

  return JSON.parse(content.slice(start, end + 1)) as Record<string, unknown>;
};

const parseAnthropicError = async (response: Response) => {
  const fallback = `Anthropic request failed with status ${response.status}.`;

  try {
    const payload = (await response.json()) as {
      error?: {
        type?: string;
        message?: string;
      };
    };

    if (!payload.error?.message) {
      return fallback;
    }

    return payload.error.type
      ? `Anthropic ${payload.error.type}: ${payload.error.message}`
      : `Anthropic request failed: ${payload.error.message}`;
  } catch {
    return fallback;
  }
};

const buildPrompt = ({
  transcript,
  currentSet,
  players
}: {
  transcript: string;
  currentSet: number;
  players: PlayerRow[];
}) => `
You are helping a volleyball stats app recover from a failed deterministic parse.

Return JSON only. No markdown. No explanation.

Allowed event_type values:
${validEventTypes.map((eventType) => `- ${eventType}`).join("\n")}

Roster:
${players
  .map((player) => {
    const aliases = player.aliases?.length ? ` aliases=${player.aliases.join(", ")}` : "";
    return `- id=${player.id} jersey=${player.jersey_number} name=${player.first_name} ${player.last_name}${aliases}`;
  })
  .join("\n")}

Current set: ${currentSet}
Transcript: ${transcript}

If you can confidently map the transcript to one roster player and one allowed event type, return:
{"event_type":"kill","player_id":"uuid"}

If you cannot map it safely, return:
{"clarification":true,"message":"short reason"}
`.trim();

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Missing bearer token." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const anthropicModel = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-0";

  if (!supabaseUrl || !supabaseAnonKey) {
    return json({ error: "Supabase function environment is not configured." }, 500);
  }

  if (!anthropicApiKey) {
    return json({ error: "ANTHROPIC_API_KEY is missing." }, 500);
  }

  let body: { gameId?: string; transcript?: string; currentSet?: number };

  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const gameId = body.gameId?.trim();
  const transcript = body.transcript?.trim();
  const currentSet = Number.isInteger(body.currentSet) && body.currentSet! > 0 ? body.currentSet! : 1;

  if (!gameId || !transcript) {
    return json({ error: "gameId and transcript are required." }, 400);
  }

  if (transcript.length > 140) {
    return json({ error: "Transcript is too long for the narrow AI fallback." }, 400);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return json({ error: "Unauthorized." }, 401);
  }

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, team_id, current_set")
    .eq("id", gameId)
    .maybeSingle();

  if (gameError) {
    return json({ error: "Could not verify game access." }, 403);
  }

  if (!game) {
    return json({ error: "Game not found or not accessible." }, 403);
  }

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, first_name, last_name, jersey_number, aliases")
    .eq("team_id", game.team_id)
    .order("jersey_number", { ascending: true });

  if (playersError) {
    return json({ error: "Could not load roster for AI validation." }, 403);
  }

  const roster = (players ?? []) as PlayerRow[];

  if (roster.length === 0) {
    return json({ error: "Roster is empty for this game." }, 422);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: anthropicModel,
        max_tokens: 120,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: buildPrompt({
              transcript,
              currentSet: game.current_set ?? currentSet,
              players: roster
            })
          }
        ]
      }),
      signal: controller.signal
    });

    if (!anthropicResponse.ok) {
      const anthropicError = await parseAnthropicError(anthropicResponse);
      return json({ error: anthropicError }, 502);
    }

    const anthropicJson = (await anthropicResponse.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const textContent = anthropicJson.content
      ?.filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("\n")
      .trim();

    if (!textContent) {
      return json({ error: "Anthropic returned no text response." }, 502);
    }

    const parsed = extractJsonObject(textContent);

    if (parsed.clarification === true) {
      return json(
        { error: typeof parsed.message === "string" ? parsed.message : "AI could not map this safely." },
        422
      );
    }

    const eventType =
      typeof parsed.event_type === "string" &&
      validEventTypes.includes(parsed.event_type as StatEventType)
        ? (parsed.event_type as StatEventType)
        : null;
    const playerId = typeof parsed.player_id === "string" ? parsed.player_id : null;

    if (!eventType || !playerId) {
      return json({ error: "AI returned an invalid event or player." }, 422);
    }

    const matchedPlayer = roster.find((player) => player.id === playerId);

    if (!matchedPlayer) {
      return json({ error: "AI returned a player outside the accessible roster." }, 422);
    }

    return json({
      eventType,
      playerId
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return json({ error: "Anthropic request timed out." }, 504);
    }

    return json({ error: "AI assist failed unexpectedly." }, 500);
  } finally {
    clearTimeout(timeoutId);
  }
});
