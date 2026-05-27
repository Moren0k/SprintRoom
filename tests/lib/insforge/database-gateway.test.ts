import { describe, expect, it } from "vitest";
import { SdkInsForgeDatabaseGateway } from "../../../src/lib/insforge/database-gateway";

describe("SdkInsForgeDatabaseGateway", () => {
  it("short-circuits empty IN filters without sending invalid UUID sentinels", async () => {
    let fromCalled = false;
    const gateway = new SdkInsForgeDatabaseGateway({
      database: {
        from() {
          fromCalled = true;
          throw new Error("The SDK should not be called for empty IN filters.");
        },
        rpc() {
          throw new Error("RPC should not be called in this test.");
        },
      },
    });

    const rows = await gateway.selectRows("projects", {
      filters: [{ operator: "in", column: "id", value: [] }],
    });

    await gateway.deleteRows("projects", [
      { operator: "in", column: "id", value: [] },
    ]);

    expect(rows).toEqual([]);
    expect(fromCalled).toBe(false);
  });
});
