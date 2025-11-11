import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { createClient } = await import("npm:@supabase/supabase-js@2.57.4");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, payload } = await req.json();

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      const { data, error } = await supabase
        .from("tracking_partners")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save") {
      const partner = payload || {};

      if (partner.is_default) {
        // Clear other defaults
        const { error: clearError } = await supabase
          .from("tracking_partners")
          .update({ is_default: false })
          .neq("id", partner.id || "00000000-0000-0000-0000-000000000000");
        if (clearError) throw clearError;
      }

      if (partner.id) {
        const { error } = await supabase
          .from("tracking_partners")
          .update({
            name: partner.name,
            tracking_url_template: partner.tracking_url_template,
            is_active: partner.is_active,
            is_default: partner.is_default,
            updated_at: new Date().toISOString(),
          })
          .eq("id", partner.id);
        if (error) throw error;
      } else {
        // Determine next display_order
        const { data: existing, error: listError } = await supabase
          .from("tracking_partners")
          .select("display_order");
        if (listError) throw listError;
        const maxOrder = Math.max(0, ...(existing?.map((p: any) => p.display_order) || [0]));
        const { error } = await supabase
          .from("tracking_partners")
          .insert({
            name: partner.name,
            tracking_url_template: partner.tracking_url_template,
            is_active: partner.is_active ?? true,
            is_default: partner.is_default ?? false,
            display_order: maxOrder + 1,
          });
        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { id } = payload || {};
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("tracking_partners").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "setDefault") {
      const { id } = payload || {};
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: clearError } = await supabase
        .from("tracking_partners")
        .update({ is_default: false })
        .neq("id", id);
      if (clearError) throw clearError;

      const { error: setError } = await supabase
        .from("tracking_partners")
        .update({ is_default: true })
        .eq("id", id);
      if (setError) throw setError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("tracking-partners function error:", error);
    const message = (error as any)?.message || "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
