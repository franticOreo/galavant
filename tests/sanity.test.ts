import { describe, it, expect } from "vitest";

describe("vitest sanity", () => {
  it("runs and asserts truthy", () => {
    expect(1 + 1).toBe(2);
  });

  it("has jsdom available", () => {
    expect(typeof window).toBe("object");
    expect(typeof document).toBe("object");
  });
});
