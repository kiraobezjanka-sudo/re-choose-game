import { GameModel } from "./game-model.js";

const model = new GameModel();

const elements = {
  shell: document.querySelector(".game-shell"),
  briefing: document.querySelector("#briefing"),
  start: document.querySelector("#start-button"),
  speaker: document.querySelector("#speaker"),
  text: document.querySelector("#dialogue-text"),
  chapter: document.querySelector("#chapter"),
  choices: document.querySelector("#choices"),
  consequence: document.querySelector("#consequence"),
  consequenceText: document.querySelector("#consequence-text"),
  trustMeter: document.querySelector("#trust-meter"),
  trustValue: document.querySelector("#trust-value"),
  infectionMeter: document.querySelector("#infection-meter"),
  infectionValue: document.querySelector("#infection-value"),
  terminalActions: document.querySelector("#terminal-actions"),
  restart: document.querySelector("#restart-button"),
  restartTop: document.querySelector("#restart-top"),
  pause: document.querySelector("#pause-button"),
  pauseOverlay: document.querySelector("#pause-overlay"),
  resume: document.querySelector("#resume-button"),
  systemState: document.querySelector("#system-state"),
};

const STATE_LABELS = {
  idle: "ОЖИДАНИЕ",
  running: "КОНТАКТ",
  paused: "ПАУЗА",
  finished: "ПРОТОКОЛ ЗАВЕРШЁН",
};

function render({ focusChoice = false } = {}) {
  const snapshot = model.snapshot();
  const { node } = snapshot;

  elements.shell.dataset.state = snapshot.status;
  if (snapshot.ending) elements.shell.dataset.ending = snapshot.ending;
  else delete elements.shell.dataset.ending;

  elements.speaker.textContent = node.speaker;
  elements.text.textContent = node.text;
  elements.chapter.textContent = node.chapter;
  elements.systemState.textContent = STATE_LABELS[snapshot.status];
  elements.trustMeter.style.width = `${snapshot.trust}%`;
  elements.trustValue.textContent = `${snapshot.trust}%`;
  elements.infectionMeter.style.width = `${snapshot.infection}%`;
  elements.infectionValue.textContent = `${snapshot.infection}%`;

  elements.consequence.hidden = !snapshot.consequence;
  elements.consequenceText.textContent = snapshot.consequence || "";
  elements.choices.replaceChildren();

  if (snapshot.status === "running") {
    node.choices.forEach((choice) => {
      const button = document.createElement("button");
      button.className = "choice-button";
      button.type = "button";
      button.dataset.choice = choice.id;
      button.textContent = choice.label;
      button.addEventListener("click", () => {
        if (model.choose(choice.id)) render({ focusChoice: true });
      });
      elements.choices.append(button);
    });
  }

  elements.terminalActions.hidden = snapshot.status !== "finished";
  elements.pause.hidden = snapshot.status !== "running";
  elements.restartTop.hidden = snapshot.status === "idle";

  if (snapshot.status === "finished") {
    const result = document.createElement("p");
    result.className = "ending-result";
    result.textContent = node.result;
    elements.choices.append(result);
    elements.restart.focus({ preventScroll: true });
  } else if (focusChoice) {
    elements.choices.querySelector("button")?.focus({ preventScroll: true });
  }
}

function startGame() {
  if (!model.start()) return;
  elements.briefing.hidden = true;
  render({ focusChoice: true });
}

function restartGame() {
  model.restart();
  elements.pauseOverlay.hidden = true;
  render({ focusChoice: true });
}

function pauseGame() {
  if (!model.pause()) return;
  elements.pauseOverlay.hidden = false;
  elements.resume.focus({ preventScroll: true });
  render();
}

function resumeGame() {
  if (!model.resume()) return;
  elements.pauseOverlay.hidden = true;
  render({ focusChoice: true });
}

elements.start.addEventListener("click", startGame);
elements.restart.addEventListener("click", restartGame);
elements.restartTop.addEventListener("click", restartGame);
elements.pause.addEventListener("click", pauseGame);
elements.resume.addEventListener("click", resumeGame);

document.addEventListener("keydown", (event) => {
  if (event.code === "Escape" || event.code === "KeyP") {
    if (model.state.status === "running") pauseGame();
    else if (model.state.status === "paused") resumeGame();
  }
});

render();
