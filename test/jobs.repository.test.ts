import path from "node:path";

import { pipe } from "@effect/data/Function";
import * as Option from "@effect/data/Option";
import * as Effect from "@effect/io/Effect";
import * as Layer from "@effect/io/Layer";
import * as Runtime from "@effect/io/Runtime";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { Knex, KnexLive } from "../src/knex/client";
import { KnexUnitOfWorkLive } from "../src/knex/unit-of-work";
import { transaction } from "../src/transaction/generic";
import { Jobs, JobsLive } from "./jobs.repository";

async function startPGContainer() {
  const genericContainer = new GenericContainer("postgres:12")
    .withExposedPorts(5432)
    .withReuse()
    .withEnvironment({
      POSTGRES_DB: "postgres",
      POSTGRES_USER: "postgres",
      POSTGRES_PASSWORD: "postgres",
    });

  const container = await genericContainer.start();
  const host = await container.getHost();
  const port = container.getMappedPort(5432);

  return { container, host, port };
}

const migrationsPath = path.join(process.cwd(), "migrations");

const createJobsTable = pipe(
  Effect.service(Knex),
  Effect.flatMap((knex) => {
    return Effect.tryPromise(() =>
      knex.migrate.latest({
        directory: migrationsPath,
      })
    );
  })
);

const dropJobsTable = pipe(
  Effect.service(Knex),
  Effect.flatMap((knex) => {
    return Effect.tryPromise(() =>
      knex.migrate.rollback({
        directory: migrationsPath,
      })
    );
  })
);

const truncateJobsTable = pipe(
  Effect.service(Knex),
  Effect.flatMap((knex) => {
    return Effect.tryPromise(() => knex("jobs").del());
  })
);

describe("Jobs Repository", () => {
  let startedContainer: StartedTestContainer;
  let runtimeWithKnex: Runtime.Runtime<Knex>;

  beforeAll(async () => {
    const { container, host, port } = await startPGContainer();
    startedContainer = container;

    runtimeWithKnex = await pipe(
      createJobsTable,
      Effect.zipRight(Effect.runtime<Knex>()),
      Effect.provideSomeLayer(KnexLive({ host, port })),
      Effect.runPromise
    );
  });

  afterEach(async () => {
    await Runtime.runPromise(runtimeWithKnex)(truncateJobsTable);
  });

  afterAll(async () => {
    await Runtime.runPromise(runtimeWithKnex)(dropJobsTable);
    startedContainer.stop();
  });

  describe("When processing transactions", () => {
    it("Should retrieve a newly inserted job", async () => {
      const job = await pipe(
        Effect.service(Jobs),
        Effect.flatMap(({ createJob, getJobById }) => {
          return pipe(
            transaction((transaction) =>
              createJob(transaction)({ name: "job_1", id: 1 })
            ),
            Effect.zipRight(getJobById(1))
          );
        }),
        Effect.provideSomeLayer(
          pipe(KnexUnitOfWorkLive, Layer.provideMerge(JobsLive))
        ),
        Runtime.runPromise(runtimeWithKnex)
      );

      expect(Option.getOrThrow(job)).toEqual({
        name: "job_1",
        id: 1,
        is_done: false,
      });
    });

    it("Should rollback the transaction when adding two jobs with the same id", async () => {
      const jobs = await pipe(
        Effect.service(Jobs),
        Effect.flatMap(({ createJob, getAllJobs }) => {
          return pipe(
            transaction((transaction) =>
              pipe(
                createJob(transaction)({ name: "job_1", id: 1 }),
                Effect.zipRight(
                  createJob(transaction)({ name: "job_2", id: 1 })
                )
              )
            ),
            Effect.catchAll(getAllJobs)
          );
        }),
        Effect.provideSomeLayer(
          pipe(KnexUnitOfWorkLive, Layer.provideMerge(JobsLive))
        ),
        Runtime.runPromise(runtimeWithKnex)
      );

      expect(jobs).toEqual([]);
    });

    it("Should commit the transaction when adding two different jobs", async () => {
      const jobs = await pipe(
        Effect.service(Jobs),
        Effect.flatMap(({ createJob, getAllJobs }) => {
          return pipe(
            transaction((transaction) =>
              pipe(
                createJob(transaction)({ name: "job_1", id: 1 }),
                Effect.zipRight(
                  createJob(transaction)({ name: "job_2", id: 2 })
                )
              )
            ),
            Effect.flatMap(getAllJobs)
          );
        }),
        Effect.provideSomeLayer(
          pipe(KnexUnitOfWorkLive, Layer.provideMerge(JobsLive))
        ),
        Runtime.runPromise(runtimeWithKnex)
      );

      expect(jobs).toEqual([
        { name: "job_1", id: 1, is_done: false },
        { name: "job_2", id: 2, is_done: false },
      ]);
    });
  });
});
