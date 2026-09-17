import type { APIRoute } from "astro";
import { exchangeCodeForTokens } from "../../../../modules/zalo";

/** Receives Zalo's OAuth redirect (see ./authorize.ts) and completes the linking. */
export const GET: APIRoute = async ({ url }) => {
  const code = url.searchParams.get("code");
  if (!code) {
    return new Response("Missing ?code from Zalo redirect", { status: 400 });
  }

  try {
    await exchangeCodeForTokens(code);
    return new Response(
      "<h1>Đã liên kết Zalo OA thành công</h1><p>Có thể đóng tab này.</p>",
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`<h1>Liên kết thất bại</h1><pre>${message}</pre>`, {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
};
