## Unit of Fork 

Automatically managed transactions using [@effect/io](https://github.com/Effect-TS/io) and [knex](https://knexjs.org).

`transaction()` acquires a transactional context that can be passed around.
If any of the Effects executed within the scope of that transaction produce a failure, the transaction is automatically rollbacked. Otherwise, the transaction is committed.

```typescript
const useCase = pipe(
  Z.service(Jobs),
  Z.flatMap(({ createJob }) => {
    return pipe(
      transaction((trx) => Z.gen(function* ($) {
        yield* $(createJob(trx)({ name: 'job_1', id: 1 }));
        // Transaction will be rollbacked automatically as the "id" constraint is violated
        yield* $(createJob(trx)({ name: 'job_2', id: 1 }));
      })),
      Z.tap(() => Z.log("Transaction commit")),
      Z.catchAll(() => Z.logError("Transaction rollback"))
    );
  })
);
```

For now, there is only a minimalist [knex](https://knexjs.org/) integration, but `transaction()` aims to offer an abstracted way of offering transactional and effectful computations.

### Run the local tests

**unit-of-fork** uses _testcontainers_ with a dumb repository implementation that provides few transaction examples.

```bash
$ pnpm run migrate
$ pnpm run seed
$ pnpm run test
```
