import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Daily (or cron) job: anonymize profiles past the 30-day withdrawal window,
 * then delete matching Auth users. Deploy + schedule in Supabase Dashboard
 * (manual tomorrow). Protect with CRON_SECRET header if exposed publicly.
 */
serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  console.log(JSON.stringify({ requestId, event: "purge_start", method: req.method }));

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Content-Type": "application/json",
  };

  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (cronSecret) {
      const provided = req.headers.get("x-cron-secret") || "";
      if (provided !== cronSecret) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: corsHeaders,
        });
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Profiles eligible before scrub (need user_id for Auth delete)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const { data: expired, error: listError } = await supabase
      .from("profiles_ffc7da1b64")
      .select("id, user_id")
      .not("deletion_requested_at", "is", null)
      .lte("deletion_requested_at", cutoff.toISOString())
      .is("purged_at", null);

    if (listError) {
      console.log(JSON.stringify({ requestId, event: "list_error", error: listError }));
      return new Response(
        JSON.stringify({ error: "list failed", detail: listError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    const { data: purgedCount, error: rpcError } = await supabase.rpc(
      "dk_purge_expired_account_deletions"
    );
    if (rpcError) {
      console.log(JSON.stringify({ requestId, event: "rpc_error", error: rpcError }));
      return new Response(
        JSON.stringify({ error: "purge rpc failed", detail: rpcError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    let authDeleted = 0;
    const authErrors: string[] = [];
    for (const row of expired || []) {
      if (!row.user_id) continue;
      const { error: delError } = await supabase.auth.admin.deleteUser(row.user_id);
      if (delError) {
        authErrors.push(`${row.user_id}: ${delError.message}`);
      } else {
        authDeleted += 1;
      }
    }

    console.log(
      JSON.stringify({
        requestId,
        event: "purge_done",
        profilesPurged: purgedCount,
        authDeleted,
        authErrorCount: authErrors.length,
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        profilesPurged: purgedCount,
        authDeleted,
        authErrors: authErrors.slice(0, 20),
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.log(JSON.stringify({ requestId, event: "purge_exception", message }));
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
