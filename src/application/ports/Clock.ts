/** Time port — the equivalent of `IDateTimeProvider` in the .NET repo. Tests use a fixed clock. */
export interface Clock {
  now(): Date;
}
