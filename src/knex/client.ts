import * as Context from "@effect/data/Context";
import * as Z from "@effect/io/Effect";
import * as Layer from "@effect/io/Layer";
import type { Knex as KnexType } from "knex";
import knex from "knex";

export const Knex = Context.Tag<KnexType>();

export interface Knex extends KnexType {}

export const KnexLive = ({
  host = "127.0.0.1",
  port = 5433,
}: {
  host: string;
  port: number;
}) =>
  Layer.effect(
    Knex,
    Z.sync(() =>
      knex({
        client: "pg",
        connection: {
          host,
          port,
          user: "postgres",
          password: "postgres",
          database: "postgres",
        },
        pool: {
          min: 0,
          max: 7,
          idleTimeoutMillis: 2000,
        },
      })
    )
  );
