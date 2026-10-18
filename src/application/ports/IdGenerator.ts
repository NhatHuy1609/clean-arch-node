/** Id generation port. Ids are assigned before saving → an entity is valid from creation, without waiting on the database. */
export interface IdGenerator {
  next(): string;
}
