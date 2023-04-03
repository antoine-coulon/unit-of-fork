/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex("jobs").del();
  await knex("jobs").insert([
    { id: 1, is_done: false, name: "task1" },
    { id: 2, is_done: false, name: "task2" },
    { id: 3, is_done: false, name: "task3" },
    { id: 4, is_done: false, name: "task4" },
    { id: 5, is_done: false, name: "task5" },
  ]);
};
