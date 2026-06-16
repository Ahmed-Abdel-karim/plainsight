/**
 * UI machine actions are defined inline in `machine.ts`'s `setup({ actions })`
 * so they pick up the machine's context + event types automatically. Defining
 * `assign(...)` outside `setup` infers `MachineContext / AnyEventObject` and
 * causes a type mismatch when registered — same decision as the map machine.
 */
export {};
