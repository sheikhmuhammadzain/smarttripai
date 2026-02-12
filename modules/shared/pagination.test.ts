import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./pagination";

describe("pagination cursor helpers", () => {
  it("encodes and decodes valid cursor payloads", () => {
    const encoded = encodeCursor({ id: "507f1f77bcf86cd799439011" });
    const decoded = decodeCursor(encoded);

    expect(decoded).toEqual({ id: "507f1f77bcf86cd799439011" });
  });

  it("returns null for malformed cursors", () => {
    expect(decodeCursor("invalid-base64")).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
  });
});
