import { describe, expect, it } from "vitest";

import type { RoomType } from "@/data/contract";
import type { ListingFilters } from "@/data/types";
import { selectListings } from "@/lib/listings";

import { pointsFilterExpression } from "./points-filter";

/**
 * The GPU dot filter restates the list predicate (`selectListings`) as a MapLibre
 * expression, so the dots and the Browse list must agree on the visible set.
 * This evaluates the expression against the same rows and asserts the id sets
 * match. The mini-evaluator handles only the clause shapes the function emits.
 */

type Row = {
  id: number;
  price: number;
  roomType: RoomType;
  neighbourhoodId: string;
};

type Expr = unknown[];

function evalExpr(expr: Expr, props: Record<string, unknown>): boolean {
  const [op, ...args] = expr;
  const get = (node: unknown) => props[(node as [string, string])[1]];
  switch (op) {
    case "all":
      return (args as Expr[]).every((a) => evalExpr(a, props));
    case ">=":
      return (get(args[0]) as number) >= (args[1] as number);
    case "<=":
      return (get(args[0]) as number) <= (args[1] as number);
    case "==":
      return get(args[0]) === args[1];
    case "in": {
      const literal = (args[1] as [string, unknown[]])[1];
      return literal.includes(get(args[0]));
    }
    default:
      throw new Error(`unhandled expression op: ${String(op)}`);
  }
}

const rows: Row[] = [
  { id: 1, price: 50, roomType: "Entire home/apt", neighbourhoodId: "centre" },
  { id: 2, price: 200, roomType: "Private room", neighbourhoodId: "centre" },
  { id: 3, price: 900, roomType: "Entire home/apt", neighbourhoodId: "north" },
  { id: 4, price: 120, roomType: "Shared room", neighbourhoodId: "north" },
  { id: 5, price: 1500, roomType: "Hotel room", neighbourhoodId: "centre" },
];

const cases: { filters: ListingFilters; neighbourhood: string | null }[] = [
  {
    filters: { roomTypes: [], priceRange: [0, Infinity] },
    neighbourhood: null,
  },
  { filters: { roomTypes: [], priceRange: [100, 1000] }, neighbourhood: null },
  {
    filters: { roomTypes: ["Entire home/apt"], priceRange: [0, Infinity] },
    neighbourhood: null,
  },
  {
    filters: { roomTypes: [], priceRange: [0, Infinity] },
    neighbourhood: "centre",
  },
  {
    filters: {
      roomTypes: ["Private room", "Shared room"],
      priceRange: [0, 500],
    },
    neighbourhood: "north",
  },
];

describe("pointsFilterExpression parity with selectListings", () => {
  it.each(cases)(
    "agrees on the visible set ($neighbourhood)",
    ({ filters, neighbourhood }) => {
      const expr = pointsFilterExpression(filters, neighbourhood) as Expr;
      const fromExpr = rows
        .filter((r) => evalExpr(expr, r as unknown as Record<string, unknown>))
        .map((r) => r.id);
      const fromPredicate = selectListings<Row>({
        neighbourhood,
        filters,
      })(rows).map((r) => r.id);
      expect(fromExpr.sort()).toEqual(fromPredicate.sort());
    },
  );
});
