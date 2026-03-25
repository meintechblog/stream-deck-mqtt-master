import { describe, it, expect } from "vitest";
import { resolveJsonPath, applyDisplayTemplate } from "./resolve-json-path";

describe("resolveJsonPath", () => {
  it("extracts a top-level key", () => {
    expect(resolveJsonPath('{"temperature": 22.5}', "temperature")).toBe("22.5");
  });

  it("extracts a nested key via dot-notation", () => {
    expect(resolveJsonPath('{"data": {"value": 42}}', "data.value")).toBe("42");
  });

  it("falls back to raw payload on invalid JSON", () => {
    expect(resolveJsonPath("not json", "foo")).toBe("not json");
  });

  it("falls back to raw payload on missing key", () => {
    const payload = '{"a": 1}';
    expect(resolveJsonPath(payload, "missing")).toBe(payload);
  });

  it("falls back to raw payload when value is null", () => {
    const payload = '{"a": null}';
    expect(resolveJsonPath(payload, "a")).toBe(payload);
  });

  it("returns raw payload when path is empty", () => {
    const payload = '{"a": 1}';
    expect(resolveJsonPath(payload, "")).toBe(payload);
  });

  it("handles boolean values", () => {
    expect(resolveJsonPath('{"on": true}', "on")).toBe("true");
  });

  it("handles numeric zero", () => {
    expect(resolveJsonPath('{"val": 0}', "val")).toBe("0");
  });
});

describe("applyDisplayTemplate", () => {
  it("substitutes {{value}} in template", () => {
    expect(applyDisplayTemplate("{{value}} °C", "22.5")).toBe("22.5 °C");
  });

  it("returns value unchanged when template is empty", () => {
    expect(applyDisplayTemplate("", "22.5")).toBe("22.5");
  });

  it("returns value unchanged when template is undefined-like", () => {
    expect(applyDisplayTemplate(undefined as unknown as string, "22.5")).toBe("22.5");
  });

  it("handles template without placeholder", () => {
    expect(applyDisplayTemplate("static text", "22.5")).toBe("static text");
  });
});
