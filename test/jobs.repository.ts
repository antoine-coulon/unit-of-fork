import * as Context from "@effect/data/Context";
import { pipe } from "@effect/data/Function";
import * as Option from "@effect/data/Option";
import * as Z from "@effect/io/Effect";
import * as Layer from "@effect/io/Layer";
import { Knex as TKnex } from "knex";

import { Knex } from "../src/knex/client";

interface Job {
  name: string;
  id: number;
  status: boolean;
}

interface Jobs {
  createJob: (
    transaction: any
  ) => (job: { name: string; id: number }) => Z.Effect<never, unknown, void>;
  deleteJob: (transaction: any) => (id: number) => Z.Effect<never, never, void>;
  getJobById: (id: number) => Z.Effect<never, never, Option.Option<Job>>;
  getAllJobs: () => Z.Effect<never, never, Job[]>;
}

export const Jobs = Context.Tag<Jobs>();

export const JobsLive = Layer.effect(
  Jobs,
  Z.gen(function* ($) {
    const knex = yield* $(Z.service(Knex));

    return {
      getAllJobs: () => {
        return pipe(
          Z.tryPromise(() => knex<Job>("jobs")),
          Z.catchAll(() => Z.succeed([]))
        );
      },

      getJobById: (id) => {
        return pipe(
          Z.tryPromise(() => knex<Job>("jobs").where("id", id).first()),
          Z.map(Option.fromNullable),
          Z.catchAll(() => Z.succeed(Option.none()))
        );
      },

      createJob: (transaction) => (job) =>
        Z.tryPromise(() =>
          knex<Job>("jobs").transacting(transaction).insert(job)
        ),

      deleteJob: (transaction) => (id) =>
        pipe(
          Z.tryPromise(() =>
            knex<Job>("jobs").transacting(transaction).where("id", id).delete()
          ),
          Z.catchAll(() => Z.unit())
        ),
    };
  })
);
