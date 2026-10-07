import { Hono } from "hono";
import { Room } from "./room";

type ApiBindings = Env & {
  TURN_ID?: string;
  TURN_TOKEN?: string;
};
type ApiContext = { Bindings: ApiBindings };

const app = new Hono<ApiContext>();

const SUPPORTED_LOCALES = ["en", "zh"] as const;
const DEFAULT_LOCALE = "en";
const LOCALE_COOKIE = "zestsend_locale";
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type Locale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(value: string | null | undefined): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

function cookieValue(request: Request, name: string): string {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key !== name) continue;
    try {
      return decodeURIComponent(value.join("="));
    } catch {
      return value.join("=");
    }
  }
  return "";
}

function requestLocale(request: Request): Locale {
  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(",")
      .map((part) => part.trim().split(";")[0]?.toLowerCase() ?? "")
      .map((tag) => (tag.startsWith("zh") ? "zh" : tag.slice(0, 2)))
      .find(isSupportedLocale);
    if (preferred) return preferred;
  }

  const savedLocale = cookieValue(request, LOCALE_COOKIE);
  return isSupportedLocale(savedLocale) ? savedLocale : DEFAULT_LOCALE;
}

function localeCookie(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
}

function localizedResponse(request: Request, locale: Locale, assets: Fetcher): Promise<Response> {
  return assets.fetch(request).then((response) => {
    const headers = new Headers(response.headers);
    headers.append("Set-Cookie", localeCookie(locale));
    headers.set("Vary", "Cookie, Accept-Language");
    return new Response(response.body, { status: response.status, headers });
  });
}

app.get("/", (context) => {
  const url = new URL(context.req.raw.url);
  const locale = requestLocale(context.req.raw);
  url.pathname = `/${locale}`;
  const headers = new Headers({
    Location: url.toString(),
    Vary: "Cookie, Accept-Language",
  });
  headers.append("Set-Cookie", localeCookie(locale));
  return new Response(null, { status: 307, headers });
});

app.get("/en", (context) => localizedResponse(context.req.raw, "en", context.env.ASSETS));
app.get("/zh", (context) => localizedResponse(context.req.raw, "zh", context.env.ASSETS));

// 房间号两种形态：4 位数字（原有手动流程）与 record_id（手机端自动配对用）。
// 后者是 rec_ + 32 位小写 hex，与 AI_ask 产出的 record_id 同形。
const ROOM_ID_RE = /^(?:\d{4}|rec_[0-9a-f]{32})$/;

function roomIsValid(roomId: string | undefined): roomId is string {
  return ROOM_ID_RE.test(roomId ?? "");
}

function roomFor(env: ApiBindings, roomId: string) {
  return env.ROOMS.getByName(roomId);
}

function localizedRoomResponse(context: { env: ApiBindings; req: { raw: Request; param: (name: string) => string } }, locale: Locale): Promise<Response> | Response {
  const roomId = context.req.param("roomId");
  if (!roomIsValid(roomId)) return Response.json({ message: "Invalid room ID." }, { status: 400 });
  return localizedResponse(context.req.raw, locale, context.env.ASSETS);
}

app.get("/room/:roomId", (context) => {
  const roomId = context.req.param("roomId");
  if (!roomIsValid(roomId)) return context.json({ message: "Invalid room ID." }, 400);

  const url = new URL(context.req.raw.url);
  const locale = requestLocale(context.req.raw);
  url.pathname = `/${locale}/room/${roomId}`;
  const headers = new Headers({ Location: url.toString(), Vary: "Cookie, Accept-Language" });
  headers.append("Set-Cookie", localeCookie(locale));
  return new Response(null, { status: 307, headers });
});

app.get("/en/room/:roomId", (context) => localizedRoomResponse(context, "en"));
app.get("/zh/room/:roomId", (context) => localizedRoomResponse(context, "zh"));

function methodNotAllowed(message: string): Response {
  return Response.json({ message }, { status: 405 });
}

app.get("/api/rooms/:roomId/ws", async (context) => {
  const roomId = context.req.param("roomId");
  if (!roomIsValid(roomId)) return context.json({ message: "Invalid room ID." }, 400);
  if (context.req.header("Upgrade") !== "websocket") {
    return context.json({ message: "Expected a WebSocket upgrade." }, 426);
  }

  return roomFor(context.env, roomId).fetch(context.req.raw);
});

app.post("/api/turn/credentials", async (context) => {
  // trim 后再判空：从 Dashboard 粘贴凭据时很容易带进尾随换行/空格，
  // 那种值会让 URL 变成 /keys/<id>%0A/credentials/...，Cloudflare 只回 4xx，
  // 而日志里只有 status，看不出根因是空格。
  const turnId = context.env.TURN_ID?.trim();
  const turnToken = context.env.TURN_TOKEN?.trim();
  if (!turnId || !turnToken) {
    return context.json(
      {
        error: "TURN credentials are not configured.",
        message: "TURN_ID and TURN_TOKEN must be set as Worker secrets.",
      },
      500,
    );
  }

  // 空 body 是合法调用（只要默认 ttl），不该因为 JSON.parse("") 变成 500。
  const body = await context.req.json<{ ttl?: number }>().catch(() => ({} as { ttl?: number }));
  const ttl = Math.min(Math.max(body.ttl ?? 86_400, 60), 86_400);
  const response = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${turnId}/credentials/generate-ice-servers`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${turnToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl }),
    },
  );

  if (!response.ok) {
    console.error(JSON.stringify({ event: "turn_credentials_failed", status: response.status }));
    return Response.json(
      { error: "TURN credentials could not be generated.", message: "TURN API request failed." },
      { status: response.status },
    );
  }

  return new Response(response.body, {
    headers: { "Content-Type": "application/json" },
  });
});

app.all("/api/turn/credentials", () => methodNotAllowed("Method not allowed"));

app.onError((error, context) => {
  console.error(JSON.stringify({ event: "api_error", path: context.req.path, message: error.message }));
  // 请求体不是合法 JSON 是调用方的问题，回 400。不回 500 ——
  // 否则「你没带 body」和「服务端真的炸了」在日志和响应里分不开。
  if (error instanceof SyntaxError) {
    return context.json({ message: "invalid JSON body" }, 400);
  }
  return context.json({ message: "服务器错误" }, 500);
});

export { Room };
export default app;
