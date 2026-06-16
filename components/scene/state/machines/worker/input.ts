/**
 * Data required to initialise the worker machine.
 * The slug is the only input: the actor creates a CityListingsClient bound to
 * it and disposes the client when the actor stops.
 */
export interface Input {
  readonly slug: string;
}
