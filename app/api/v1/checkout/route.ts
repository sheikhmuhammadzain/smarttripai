import { z } from "zod";
import { getAuthSession } from "@/lib/auth/get-session";
import { getProductById } from "@/lib/data";
import { sendOrderConfirmationEmail } from "@/lib/email/resend";
import { createOrderService } from "@/modules/orders/order.service";
import {
  ApiError,
  fromUnknownError,
  fromZodError,
} from "@/modules/shared/problem";
import { created, problemResponse } from "@/modules/shared/response";

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: z.coerce.number().int().min(1).max(10),
      }),
    )
    .min(1),
  customer: z.object({
    fullName: z.string().trim().min(2),
    email: z.string().trim().email(),
    phone: z.string().trim().min(6),
    country: z.string().trim().min(2),
  }),
});

export async function POST(request: Request) {
  const instance = new URL(request.url).pathname;

  try {
    const session = await getAuthSession();
    const userId = session?.user?.id;
    const body = checkoutSchema.parse(await request.json());

    const normalized = body.items.map((item) => {
      const product = getProductById(item.productId);
      if (!product) {
        throw new ApiError(
          400,
          "INVALID_PRODUCT",
          `Unknown product: ${item.productId}`,
        );
      }
      return {
        productId: product.id,
        title: product.title,
        quantity: item.quantity,
        unitPrice: product.price,
        currency: product.currency,
        lineTotal: product.price * item.quantity,
      };
    });

    const total = normalized.reduce((sum, item) => sum + item.lineTotal, 0);
    const orderCode = `STA-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const currency = getProductById(normalized[0].productId)?.currency ?? "EUR";

    const order = await createOrderService({
      userId,
      customer: body.customer,
      items: normalized,
      total,
      currency,
      orderCode,
    });

    // Fire-and-forget order confirmation email
    sendOrderConfirmationEmail({
      to: body.customer.email,
      name: body.customer.fullName,
      orderCode: order.orderCode,
      items: order.items,
      total: order.total,
      currency: order.currency,
    }).catch((err) =>
      console.error("[checkout] confirmation email failed:", err),
    );

    return created(
      {
        orderId: order.orderCode,
        status: "confirmed",
        total: order.total,
        currency: order.currency,
      },
      `/checkout/success?orderId=${encodeURIComponent(order.orderCode)}`,
    );
  } catch (error) {
    console.error("[checkout] failed to create order", error);
    if (error instanceof z.ZodError) {
      return problemResponse(fromZodError(error, instance));
    }
    return problemResponse(fromUnknownError(error, instance));
  }
}
