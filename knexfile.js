/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  client: "pg",
  connection: {
    host: "127.0.0.1",
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: "postgres",
  },
  seeds: {
    directory: "./seeds",
  },
  migrations: {
    directory: "./migrations",
    loadExtensions: [".js"],
  },
};
