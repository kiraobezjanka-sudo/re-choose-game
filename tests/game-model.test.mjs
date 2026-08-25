import assert from "node:assert/strict";
import test from "node:test";
import { GameModel, INITIAL_STATE, NODES } from "../game-model.js";

const play = (...choices) => {
  const game = new GameModel();
  game.start();
  choices.forEach((choice) => assert.equal(game.choose(choice), true));
  return game.snapshot();
};

test("dialogue tree stays within seven nodes and starts with four choices", () => {
  assert.ok(Object.keys(NODES).length <= 7);
  assert.equal(NODES.encounter.choices.length, 4);
});

test("every approved path reaches one of the three complete endings", () => {
  const paths = [
    [["calm", "request-card"], "peaceful"],
    [["medkit"], "peaceful"],
    [["calm", "ask-secret"], "secret"],
    [["lie", "admit-lie"], "secret"],
    [["lie", "double-down"], "escape"],
    [["threaten"], "escape"],
  ];

  for (const [choices, expectedEnding] of paths) {
    const snapshot = play(...choices);
    assert.equal(snapshot.status, "finished");
    assert.equal(snapshot.ending, expectedEnding);
    assert.ok(snapshot.node.result);
  }
});

test("the four opening actions have distinct immediate consequences", () => {
  const results = NODES.encounter.choices.map((choice) =>
    JSON.stringify([choice.next, choice.trust, choice.infection, choice.consequence]),
  );
  assert.equal(new Set(results).size, 4);
});

test("pause blocks dialogue mutation until resume", () => {
  const game = new GameModel();
  game.start();
  assert.equal(game.pause(), true);
  assert.equal(game.choose("calm"), false);
  assert.equal(game.snapshot().nodeId, "encounter");
  assert.equal(game.resume(), true);
  assert.equal(game.choose("calm"), true);
});

test("restart restores a clean running attempt", () => {
  const game = new GameModel();
  game.start();
  game.choose("threaten");
  game.restart();
  const snapshot = game.snapshot();
  assert.equal(snapshot.status, "running");
  assert.equal(snapshot.nodeId, INITIAL_STATE.nodeId);
  assert.equal(snapshot.ending, null);
  assert.equal(snapshot.consequence, "");
  assert.deepEqual(snapshot.history, []);
  assert.equal(snapshot.trust, INITIAL_STATE.trust);
  assert.equal(snapshot.infection, INITIAL_STATE.infection);
});
