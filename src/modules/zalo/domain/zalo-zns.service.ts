import { getValidAccessToken } from "./zalo-token.service";

const ZNS_SEND_ENDPOINT = "https://business.openapi.zalo.me/message/template";

export interface SendZnsInput {
  phone: string;
  templateId: string;
  templateData: Record<string, string>;
}

/**
 * Sends one ZNS transactional message. `templateData` keys must match
 * the approved template's parameter names exactly, or Zalo rejects
 * the call — see the template's config in the Zalo OA ZNS dashboard.
 */
export async function sendZns(input: SendZnsInput): Promise<void> {
  const accessToken = await getValidAccessToken();

  const res = await fetch(ZNS_SEND_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: accessToken,
    },
    body: JSON.stringify({
      phone: normalizePhone(input.phone),
      template_id: input.templateId,
      template_data: input.templateData,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error !== 0) {
    throw new Error(`Zalo ZNS send failed: ${JSON.stringify(data)}`);
  }
}

/** ZNS expects phone numbers in 84xxxxxxxxx form, not the local 0xxxxxxxxx form customers type in. */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `84${digits.slice(1)}` : digits;
}
