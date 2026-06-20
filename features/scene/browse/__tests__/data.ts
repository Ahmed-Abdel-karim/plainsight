/**
 * Browse-region test data. The shared trimmed-real fixtures live in
 * `test/fixtures/browse.ts` (re-exported here as the region-local handle); the
 * MSW default handlers already serve them, so most cases need no data wiring.
 */
export {
  boundariesFixture,
  browsePointsFixture,
  makeMapCityPayload,
} from "@/test/fixtures/browse";
