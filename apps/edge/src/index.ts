const awsOrigin = "https://n3juzrpd275natuxedlcxg7gx40bvqjr.lambda-url.us-east-1.on.aws";
const publicOrigin = "https://brief.harbr.run";

function upstreamUrl(request: Request): URL {
  const incoming = new URL(request.url);
  return new URL(`${incoming.pathname}${incoming.search}`, awsOrigin);
}

function responseHeaders(response: Response): Headers {
  const headers = new Headers(response.headers);
  const location = headers.get("location");
  if (location?.startsWith(awsOrigin)) {
    headers.set("location", `${publicOrigin}${location.slice(awsOrigin.length)}`);
  }
  headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  return headers;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const headers = new Headers(request.headers);
    headers.set("x-forwarded-host", new URL(request.url).host);
    const includesBody = request.method !== "GET" && request.method !== "HEAD";
    const upstreamRequest = new Request(upstreamUrl(request), {
      method: request.method,
      headers,
      redirect: "manual",
      ...(includesBody ? { body: request.body } : {}),
    });
    const upstream = await fetch(upstreamRequest);

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders(upstream),
    });
  },
};
