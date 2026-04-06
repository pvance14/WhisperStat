import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders
  });

const parseDeepgramError = async (response: Response) => {
  const fallback = `Deepgram token grant failed with status ${response.status}.`;

  try {
    const payload = (await response.json()) as {
      err_code?: string;
      err_msg?: string;
      category?: string;
    };

    if (!payload.err_msg) {
      return fallback;
    }

    return payload.err_code ? `${payload.err_code}: ${payload.err_msg}` : payload.err_msg;
  } catch {
    return fallback;
  }
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
  const deepgramApiKey = Deno.env.get("DEEPGRAM_API_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return json({ error: "Supabase function environment is not configured." }, 500);
  }

  if (!deepgramApiKey) {
    return json({ error: "DEEPGRAM_API_KEY is missing." }, 500);
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8_000);

  try {
    const deepgramResponse = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: {
        Authorization: `Token ${deepgramApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ttl_seconds: 60
      }),
      signal: controller.signal
    });

    if (!deepgramResponse.ok) {
      return json({ error: await parseDeepgramError(deepgramResponse) }, 502);
    }

    const payload = (await deepgramResponse.json()) as {
      access_token?: string;
      expires_in?: number | null;
    };

    if (!payload.access_token) {
      return json({ error: "Deepgram did not return an access token." }, 502);
    }

    return json({
      accessToken: payload.access_token,
      expiresIn: payload.expires_in ?? null
    });
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error && error.name === "AbortError"
            ? "Deepgram token request timed out."
            : error instanceof Error
              ? error.message
              : "Deepgram token request failed."
      },
      502
    );
  } finally {
    clearTimeout(timeoutId);
  }
});
