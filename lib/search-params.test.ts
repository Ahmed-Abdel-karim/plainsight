import { describe, expect, it } from "vitest";

import { loadScene, serializeScene } from "./search-params";

describe("scene params (de)serialization", () => {
  it("round-trips filters and structural params through the URL", () => {
    const search = serializeScene("", {
      rooms: ["Private room", "Shared room"],
      price: [80, 240],
      lens: "browse",
      listing: 12345,
      nbhd: "camden",
    });
    const parsed = loadScene(search);
    expect(parsed.rooms).toEqual(["Private room", "Shared room"]);
    expect(parsed.price).toEqual([80, 240]);
    expect(parsed.lens).toBe("browse");
    expect(parsed.listing).toBe(12345);
    expect(parsed.nbhd).toBe("camden");
  });

  it("drops keys for default values — clearOnDefault keeps the URL clean", () => {
    // Default scene: analyse lens, no listing/nbhd, all rooms, full range.
    expect(
      serializeScene("", {
        rooms: [],
        price: null,
        lens: "analyse",
        listing: null,
        nbhd: null,
      }),
    ).toBe("");
  });

  it("merges into an existing query, preserving unrelated params", () => {
    const search = serializeScene("?utm=launch", {
      lens: "browse",
      rooms: ["Private room"],
      price: null,
      listing: null,
      nbhd: null,
    });
    const params = new URLSearchParams(search);
    expect(params.get("utm")).toBe("launch");
    expect(params.get("lens")).toBe("browse");
    expect(params.get("rooms")).toBe("Private room");
    expect(params.get("price")).toBeNull();
  });

  it("clears a previously-set param when its value goes to the default", () => {
    const search = serializeScene("?price=80,240&lens=browse&listing=9", {
      price: null,
      lens: "analyse",
      listing: null,
      rooms: [],
      nbhd: null,
    });
    const params = new URLSearchParams(search);
    expect(params.get("price")).toBeNull();
    expect(params.get("lens")).toBeNull();
    expect(params.get("listing")).toBeNull();
  });
});
