import { pipe } from "@effect/data/Function";
import * as Z from "@effect/io/Effect";
import * as Layer from "@effect/io/Layer";

import { GenericTransaction, UnitOfWork } from "../transaction/generic";
import { Knex } from "./client";

export const makeKnexUnitOfWork = pipe(
  Z.service(Knex),
  Z.map((knex) => ({
    start: () =>
      pipe(
        Z.async<never, never, GenericTransaction>((resume) =>
          knex.transaction((trx) =>
            resume(Z.succeed(trx as GenericTransaction))
          )
        )
      ),
  }))
);

export const KnexUnitOfWorkLive = Layer.effect(UnitOfWork, makeKnexUnitOfWork);
