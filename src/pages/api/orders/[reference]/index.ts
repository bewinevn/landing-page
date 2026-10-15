import type { APIRoute } from "astro";
import { getOrderDetail } from "../../../../modules/orders";
import { getPaymentByReference } from "../../../../modules/payments";
import { errorResponse, jsonResponse } from "../../../../shared/http/api-response";

export const GET: APIRoute = async ({ params }) => {
  try {
    const reference = params.reference!;
    const { order, items } = await getOrderDetail(reference);
    const payment = await getPaymentByReference(reference);

    return jsonResponse({
      reference: order.reference,
      status: order.status,
      totalVnd: order.total_vnd,
      currency: order.currency,
      delivery: {
        fullName: order.delivery_full_name,
        phone: order.delivery_phone,
        addressLine: order.delivery_address_line,
        city: order.delivery_city,
        note: order.delivery_note,
      },
      items: items.map((i) => ({
        productId: i.product_id,
        name: i.product_name_snapshot,
        unitPriceVnd: i.unit_price_vnd,
        quantity: i.quantity,
        lineTotalVnd: i.line_total_vnd,
      })),
      payment,
    });
  } catch (err) {
    return errorResponse(err);
  }
};
