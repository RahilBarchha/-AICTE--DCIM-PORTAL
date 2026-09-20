// ---------------------------------------------------------------------------
// Supabase Client & Real-Time Cloud Telemetry Persistence Subsystem
// ---------------------------------------------------------------------------

const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

const supabaseConfigured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR-PROJECT") &&
  !SUPABASE_ANON_KEY.includes("YOUR-ANON");

let supabaseClient = null;

if (supabaseConfigured && window.supabase) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("[Supabase] Connected successfully. Telemetry and Alerts will sync to cloud database.");
  } catch (err) {
    console.warn("[Supabase] Initialization failed:", err);
  }
} else {
  console.log(
    "[Supabase] Running in local persistent mode. To persist telemetry to Supabase, update SUPABASE_URL & SUPABASE_ANON_KEY in js/supabaseClient.js"
  );
}

/**
 * Persists a live telemetry snapshot batch to Supabase server_metrics table.
 */
async function syncTelemetryToSupabase(metricsBatch) {
  if (!supabaseClient || !Array.isArray(metricsBatch) || metricsBatch.length === 0) {
    return false;
  }
  try {
    const payload = metricsBatch.map(s => ({
      server_id: s.id,
      server_name: s.name,
      ip: s.ip,
      cpu: s.cpu,
      ram: s.ram,
      disk: s.disk || 0,
      temp: s.temp || 38,
      iops: s.iops || 0,
      simulation: typeof currentSimulationMode !== "undefined" ? currentSimulationMode : "normal",
      recorded_at: new Date().toISOString()
    }));

    const { error } = await supabaseClient.from("server_metrics").insert(payload);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("[Supabase] Telemetry sync error:", err.message);
    return false;
  }
}

/**
 * Persists or updates an Alert in Supabase alerts table.
 */
async function persistAlertToSupabase(alert) {
  if (!supabaseClient || !alert) return false;
  try {
    const payload = {
      id: alert.id,
      severity: alert.severity,
      source: alert.source,
      message: alert.message,
      status: alert.status,
      server_id: alert.serverId || null,
      metric: alert.metric || null,
      peak_value: alert.peakValue || null,
      created_at: new Date(alert.timestamp || Date.now()).toISOString(),
      resolved_at: alert.resolvedAt ? new Date(alert.resolvedAt).toISOString() : null
    };

    const { error } = await supabaseClient.from("alerts").upsert(payload);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("[Supabase] Alert persist error:", err.message);
    return false;
  }
}

/**
 * Updates an existing alert's status (e.g. to Resolved) in Supabase.
 */
async function updateAlertInSupabase(id, updates) {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient
      .from("alerts")
      .update({
        status: updates.status,
        resolved_at: updates.resolvedAt ? new Date(updates.resolvedAt).toISOString() : new Date().toISOString()
      })
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("[Supabase] Alert update error:", err.message);
    return false;
  }
}

/**
 * Sync server state with Supabase servers table.
 */
async function syncServersWithSupabase(serversList) {
  if (!supabaseClient || !Array.isArray(serversList)) return false;
  try {
    const payload = serversList.map(s => ({
      id: s.id,
      name: s.name,
      ip: s.ip,
      status: s.status,
      os: s.os,
      cpu: s.cpu,
      ram: s.ram,
      disk: s.disk || 0,
      temp: s.temp || 38,
      rack: s.rack || "Rack-A01",
      iops: s.iops || 0,
      uptime: s.uptime || "99.99%",
      max_cpu: s.maxCpu || "32 Cores",
      max_ram: s.maxRam || "128 GB",
      is_vm: Boolean(s.isVM),
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabaseClient.from("servers").upsert(payload);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("[Supabase] Server sync error:", err.message);
    return false;
  }
}
