export const INITIAL_STATE = Object.freeze({
  status: "idle",
  nodeId: "encounter",
  trust: 30,
  infection: 54,
  ending: null,
  consequence: "",
  history: [],
});

export const NODES = Object.freeze({
  encounter: {
    chapter: "КОНТАКТ 01",
    speaker: "ДОКТОР ЛИАН ВЕЙЛ",
    text: "Стойте… Не подходите. Я ещё контролирую себя. Ключ-карта у меня — и она останется здесь, пока я не пойму, кто вы.",
    choices: [
      {
        id: "calm",
        label: "Спокойно расспросить учёного",
        next: "trust",
        trust: 25,
        infection: -4,
        consequence: "Ровный голос снижает панику. Вейл ослабляет хватку на ключ-карте.",
      },
      {
        id: "medkit",
        label: "Предложить найденную аптечку",
        next: "peaceful",
        trust: 35,
        infection: -22,
        consequence: "Препарат замедляет заражение. Вейл впервые верит, что вы пришли не за его смертью.",
      },
      {
        id: "lie",
        label: "Соврать, что спасательная группа уже прибыла",
        next: "suspicion",
        trust: -20,
        infection: 12,
        consequence: "Вейл замечает молчащий аварийный лифт. Ложь усиливает страх и симптомы.",
      },
      {
        id: "threaten",
        label: "Пригрозить оружием и потребовать ключ-карту",
        next: "escape",
        trust: -40,
        infection: 35,
        consequence: "Резкое движение запускает неконтролируемую реакцию заражённой ткани.",
      },
    ],
  },
  trust: {
    chapter: "КОНТАКТ 02",
    speaker: "ДОКТОР ЛИАН ВЕЙЛ",
    text: "Я запер выход не только ради карантина. Под лабораторией есть кое-что хуже инфекции. Решайте: уходите сейчас или слушаете правду.",
    choices: [
      {
        id: "request-card",
        label: "Попросить ключ-карту и уйти",
        next: "peaceful",
        trust: 14,
        infection: 2,
        consequence: "Вы не давите на него. Вейл принимает ваше решение и отдаёт карту.",
      },
      {
        id: "ask-secret",
        label: "Убедить его рассказать о нижнем уровне",
        next: "secret",
        trust: 8,
        infection: 7,
        consequence: "Вместо побега вы выбираете правду. Вейл раскрывает последний протокол проекта.",
      },
    ],
  },
  suspicion: {
    chapter: "КОНТАКТ 02",
    speaker: "ДОКТОР ЛИАН ВЕЙЛ",
    text: "Лифт обесточен уже трое суток. Никакой группы нет. Ещё одна ложь — и я перестану понимать, кто из нас опаснее.",
    choices: [
      {
        id: "admit-lie",
        label: "Признаться во лжи и спросить, чего он боится",
        next: "secret",
        trust: 18,
        infection: 5,
        consequence: "Признание не возвращает доверие полностью, но Вейл решает оставить вам правду.",
      },
      {
        id: "double-down",
        label: "Продолжать настаивать, что помощь близко",
        next: "escape",
        trust: -18,
        infection: 27,
        consequence: "Последняя опора Вейла рушится. Паника окончательно вытесняет разум.",
      },
    ],
  },
  peaceful: {
    chapter: "ФИНАЛ 01 · ПОСЛЕДНЯЯ ПРОСЬБА",
    speaker: "ДОКТОР ЛИАН ВЕЙЛ",
    text: "Возьмите карту. Когда выберетесь, передайте мои записи наружу. Пусть никто больше не повторит нашу ошибку.",
    ending: "peaceful",
    result: "Ключ-карта получена мирно. Основной выход открыт.",
  },
  escape: {
    chapter: "ФИНАЛ 02 · ПОТЕРЯ КОНТРОЛЯ",
    speaker: "АВАРИЙНАЯ СИСТЕМА",
    text: "Биологическая угроза! Вейл больше не отвечает. Существо разбивает гермодверь — остаётся только технический тоннель.",
    ending: "escape",
    result: "Вы спасаетесь без ключ-карты, пока за спиной гаснет сектор N-17.",
  },
  secret: {
    chapter: "ФИНАЛ 03 · ПРОЕКТ «ЭХО»",
    speaker: "ДОКТОР ЛИАН ВЕЙЛ",
    text: "Инфекция не была оружием. Мы пытались сохранять человеческую память в живой ткани. Код — 4-1-7. Люк за камерой обеззараживания приведёт к архиву.",
    ending: "secret",
    result: "Секрет лаборатории раскрыт. За стеной открывается скрытый путь.",
  },
});

const clamp = (value) => Math.max(0, Math.min(100, value));

export class GameModel {
  constructor() {
    this.state = { ...INITIAL_STATE, history: [] };
  }

  start() {
    if (this.state.status !== "idle") return false;
    this.state.status = "running";
    return true;
  }

  choose(choiceId) {
    if (this.state.status !== "running") return false;
    const node = NODES[this.state.nodeId];
    const choice = node?.choices?.find((item) => item.id === choiceId);
    if (!choice) return false;

    const nextNode = NODES[choice.next];
    this.state.history = [...this.state.history, choiceId];
    this.state.trust = clamp(this.state.trust + (choice.trust ?? 0));
    this.state.infection = clamp(this.state.infection + (choice.infection ?? 0));
    this.state.nodeId = choice.next;
    this.state.consequence = choice.consequence;
    this.state.ending = nextNode.ending ?? null;
    if (nextNode.ending) this.state.status = "finished";
    return true;
  }

  pause() {
    if (this.state.status !== "running") return false;
    this.state.status = "paused";
    return true;
  }

  resume() {
    if (this.state.status !== "paused") return false;
    this.state.status = "running";
    return true;
  }

  restart() {
    this.state = { ...INITIAL_STATE, status: "running", history: [] };
    return true;
  }

  snapshot() {
    const node = NODES[this.state.nodeId];
    return JSON.parse(JSON.stringify({ ...this.state, node }));
  }
}
