export function appOrigin() {
  return process.env.APP_ORIGIN || "http://127.0.0.1:3000";
}

type LocalRedirect = {
  source: "/";
  has: [{ type: "header"; key: "host"; value: string }];
  destination: string;
  permanent: false;
};

// Canonicalize navigation before bootstrap creates a host-only owner cookie.
// API requests and OAuth callbacks still require the exact configured origin.
export function localPageRedirects(
  configuredOrigin = appOrigin(),
  development = process.env.NODE_ENV === "development",
): LocalRedirect[] {
  if (!development) return [];
  const configured = new URL(configuredOrigin);
  if (configured.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(configured.hostname)) return [];
  const alternate = new URL(configured.origin);
  alternate.hostname = configured.hostname === "localhost" ? "127.0.0.1" : "localhost";
  // Use raw Host: NextURL normalizes numeric loopback hosts to localhost.
  // Never use forwarded headers or request-controlled data as the redirect base.
  // Header conditions are regular expressions; escape the literal host/port.
  return [{
    source: "/",
    has: [{ type: "header", key: "host", value: alternate.host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") }],
    destination: `${configured.origin}/`,
    permanent: false,
  }];
}
