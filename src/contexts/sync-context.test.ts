import {
  decryptData,
  deriveKey,
  encryptData,
  hashRoomName,
} from "../lib/sync-crypto";
import { mergeDoses } from "../lib/sync-merge";
import type { DoseLog } from "@/types";

function dose(id: string, updatedAt: string, amount: number): DoseLog {
  return {
    id,
    updatedAt,
    createdAt: "2026-01-01T00:00:00.000Z",
    timestamp: "2026-01-01T00:00:00.000Z",
    substanceName: "Fixture",
    categories: ["other"],
    amount,
    unit: "mg",
    route: "oral",
    duration: null,
    notes: null,
    mood: null,
    setting: null,
  };
}

describe("sync cryptography", () => {
  test("encrypts and decrypts structured payloads", async () => {
    const key = await deriveKey("correct horse battery staple", "room-id");
    const encrypted = await encryptData(
      { doses: [{ id: "1" }], version: 1 },
      key,
    );
    expect(encrypted.iv).not.toBe("");
    expect(encrypted.ciphertext).not.toContain("doses");
    expect(await decryptData(encrypted, key)).toEqual({
      doses: [{ id: "1" }],
      version: 1,
    });
  });

  test("rejects decryption with a different password", async () => {
    const encrypted = await encryptData(
      { secret: true },
      await deriveKey("one", "room"),
    );
    await expect(
      decryptData(encrypted, await deriveKey("two", "room")),
    ).rejects.toThrow();
  });

  test("room document hashes are deterministic and password-separated", async () => {
    expect(await hashRoomName("room", "password")).toBe(
      await hashRoomName("room", "password"),
    );
    expect(await hashRoomName("room", "password")).not.toBe(
      await hashRoomName("room", "different"),
    );
  });
});

describe("sync dose conflict resolution", () => {
  test("newer remote records win and simultaneous edits surface a conflict", () => {
    const local = dose("1", "2026-01-03T00:00:00.000Z", 1);
    const remote = dose("1", "2026-01-04T00:00:00.000Z", 2);
    const baseline = new Map([
      ["1", new Date("2026-01-02T00:00:00.000Z").getTime()],
    ]);
    const result = mergeDoses(
      [local],
      [remote],
      new Set(),
      new Set(),
      baseline,
    );
    expect(result.doses[0].amount).toBe(2);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].reason).toBe("both-edited");
  });

  test("tombstones remove unchanged records", () => {
    const old = dose("1", "2020-01-01T00:00:00.000Z", 1);
    const result = mergeDoses([old], [], new Set(), new Set(["1"]));
    expect(result.doses).toEqual([]);
    expect(result.deleted.has("1")).toBe(true);
  });
});
