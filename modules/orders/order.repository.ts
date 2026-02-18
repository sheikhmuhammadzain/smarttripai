import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { ApiError } from "@/modules/shared/problem";
import { decodeCursor, encodeCursor } from "@/modules/shared/pagination";
import { OrderModel } from "@/modules/orders/order.model";
import { toMongoUserId } from "@/modules/shared/mongo-user-id";

export interface CreateOrderInput {
  userId?: string;
  customer: {
    fullName: string;
    email: string;
    phone: string;
    country: string;
  };
  items: Array<{
    productId: string;
    title: string;
    quantity: number;
    unitPrice: number;
    currency: string;
    lineTotal: number;
  }>;
  total: number;
  currency: string;
  orderCode: string;
}

export async function createOrder(input: CreateOrderInput) {
  await connectToDatabase();

  const doc = await OrderModel.create({
    userId: input.userId ? toMongoUserId(input.userId) : undefined,
    customer: input.customer,
    items: input.items,
    total: input.total,
    currency: input.currency,
    status: "confirmed",
    orderCode: input.orderCode,
  });

  return doc.toObject();
}

export async function listUserOrders(userId: string, cursor: string | undefined, limit: number) {
  await connectToDatabase();

  const query: Record<string, unknown> = {
    userId: toMongoUserId(userId),
  };

  const decoded = decodeCursor(cursor);
  if (decoded?.id && Types.ObjectId.isValid(decoded.id)) {
    query._id = { $lt: new Types.ObjectId(decoded.id) };
  }

  const docs = await OrderModel.find(query).sort({ _id: -1 }).limit(limit + 1).lean();
  const hasMore = docs.length > limit;
  const rows = hasMore ? docs.slice(0, limit) : docs;

  return {
    data: rows,
    nextCursor: hasMore ? encodeCursor({ id: rows[rows.length - 1]._id.toString() }) : null,
  };
}

export async function listAllOrders(cursor: string | undefined, limit: number) {
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  const decoded = decodeCursor(cursor);
  if (decoded?.id && Types.ObjectId.isValid(decoded.id)) {
    query._id = { $lt: new Types.ObjectId(decoded.id) };
  }

  const docs = await OrderModel.find(query).sort({ _id: -1 }).limit(limit + 1).lean();
  const hasMore = docs.length > limit;
  const rows = hasMore ? docs.slice(0, limit) : docs;

  return {
    data: rows,
    nextCursor: hasMore ? encodeCursor({ id: rows[rows.length - 1]._id.toString() }) : null,
  };
}

export async function getOrderByCode(orderCode: string) {
  await connectToDatabase();
  const doc = await OrderModel.findOne({ orderCode }).lean();
  if (!doc) {
    throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found");
  }
  return doc;
}

export async function updateOrderById(
  orderId: string,
  patch: { status?: "confirmed" | "cancelled"; customerEmail?: string },
) {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(orderId)) {
    throw new ApiError(400, "INVALID_ORDER_ID", "Invalid order id format");
  }

  const updated = await OrderModel.findOneAndUpdate(
    { _id: new Types.ObjectId(orderId) },
    {
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.customerEmail ? { "customer.email": patch.customerEmail.toLowerCase() } : {}),
    },
    { returnDocument: "after" },
  ).lean();

  if (!updated) {
    throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found");
  }

  return updated;
}

export async function deleteOrderById(orderId: string) {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(orderId)) {
    throw new ApiError(400, "INVALID_ORDER_ID", "Invalid order id format");
  }

  const deleted = await OrderModel.findOneAndDelete({ _id: new Types.ObjectId(orderId) }).lean();
  if (!deleted) {
    throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found");
  }
}
