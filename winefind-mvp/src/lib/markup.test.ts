import { describe, expect, it } from "vitest";
import { classifyMarkup } from "./markup";

describe("classifyMarkup", () => {
  it("marks fair under 3×", () => {
    const r = classifyMarkup(50, 25);
    expect(r.tier).toBe("fair");
    expect(r.ratio).toBe(2);
  });

  it("marks steep from 3×", () => {
    expect(classifyMarkup(90, 30).tier).toBe("steep");
  });

  it("marks extreme at 7× retail", () => {
    const r = classifyMarkup(196, 28);
    expect(r.tier).toBe("extreme");
    expect(r.ratio).toBe(7);
  });

  it("handles missing market price", () => {
    expect(classifyMarkup(40, 0).tier).toBe("fair");
  });
});
