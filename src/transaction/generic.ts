import * as Context from "@effect/data/Context";
import { pipe } from "@effect/data/Function";
import * as Z from "@effect/io/Effect";
import * as Exit from "@effect/io/Exit";

export interface GenericTransaction {
  commit: () => Promise<any>;
  rollback: () => Promise<any>;
}

export interface UnitOfWork {
  start: () => Z.Effect<never, never, GenericTransaction>;
}

export const UnitOfWork = Context.Tag<UnitOfWork>();

export function transaction<R, E, A>(
  self: (transaction: GenericTransaction) => Z.Effect<R, E, A>
): Z.Effect<UnitOfWork | R, E, A> {
  return Z.serviceWithEffect(UnitOfWork, (db) =>
    pipe(
      Z.acquireUseRelease(db.start(), self, (trx, exit) => {
        if (Exit.isFailure(exit)) {
          return Z.promise(() => trx.rollback());
        }
        return Z.promise(() => trx.commit());
      })
    )
  );
}
