import {
  adjectiveAllowed,
  objectsFor,
  whenAllowed,
  type PathChoice,
} from "./sentence-path";

export type WordStep = "who" | "action" | "what" | "describe" | "when";
export const STARTER: PathChoice = {
  who: "i",
  name: "Ravi",
  nameG: "m",
  verb: "drink",
  object: "coffee",
  when: "present",
  timeWord: true,
  negative: false,
  question: false,
  gender: "m",
  adjective: "none",
};
export const WORD_ROLES: Record<
  WordStep,
  { title: string; question: string; lesson: string }
> = {
  who: {
    title: "Pronoun",
    question: "Who does it?",
    lesson:
      "A pronoun stands in for a person. A proper noun names someone. This choice can change the verb form.",
  },
  action: {
    title: "Verb",
    question: "What happens?",
    lesson:
      "The verb carries the action. The language, person and time shape its form. Some forms also follow the noun. Pick an action to see the nouns that fit.",
  },
  what: {
    title: "Noun",
    question: "What or where?",
    lesson:
      "A noun names a thing, person or place. Here it gives the action something to work with. Some actions need no object.",
  },
  describe: {
    title: "Adjective",
    question: "What is it like?",
    lesson:
      "An adjective describes the noun. Hot fits coffee; new fits a book. Its form and position follow the language.",
  },
  when: {
    title: "Time & tense",
    question: "When does it happen?",
    lesson:
      "Yesterday, now and tomorrow change the verb. A time word or phrase adds context. Want to and know how to express intention or skill.",
  },
};

export function fitChoices(current: PathChoice, patch: Partial<PathChoice>) {
  const next = { ...current, ...patch };
  const notices: string[] = [];
  const objects = objectsFor(next.verb);
  if (next.object && !objects.includes(next.object)) {
    next.object = objects[0] ?? null;
    notices.push(
      next.object
        ? "The new verb needs a different kind of noun. A matching noun is selected for you."
        : "This verb works on its own, so it needs no object.",
    );
  } else if (patch.verb && !next.object && objects.length) {
    next.object = objects[0];
  }
  if (!whenAllowed(next.verb, next.when, next.object)) {
    next.when = "present";
    notices.push(
      "Know how to is for a skill. This action uses the everyday form instead.",
    );
  }
  if (!adjectiveAllowed(next.adjective ?? "none", next.object)) {
    next.adjective = "none";
    notices.push(
      "The adjective did not fit the new noun. Choose a new description if you want one.",
    );
  }
  return { choice: next, notice: notices.join(" ") };
}

export const MISSIONS: {
  id: string;
  title: string;
  goal: string;
  target: PathChoice;
}[] = [
  {
    id: "the-doer",
    title: "Change the doer",
    goal: "She drinks coffee every day.",
    target: { ...STARTER, who: "she" },
  },
  {
    id: "a-little-detail",
    title: "Give it a name and a detail",
    goal: "Meera drank hot coffee yesterday.",
    target: {
      ...STARTER,
      who: "name",
      name: "Meera",
      nameG: "f",
      when: "past",
      adjective: "hot",
    },
  },
  {
    id: "ask-a-friend",
    title: "Turn it into a question",
    goal: "Will you play the guitar tomorrow? Use polite you.",
    target: {
      ...STARTER,
      who: "youp",
      verb: "play",
      object: "guitar",
      when: "future",
      question: true,
    },
  },
  {
    id: "change-the-story",
    title: "Change the story",
    goal: "We didn't read a new book yesterday.",
    target: {
      ...STARTER,
      who: "we",
      verb: "read",
      object: "book",
      when: "past",
      adjective: "new",
      negative: true,
    },
  },
];

export function checkMission(
  choice: PathChoice,
  target: PathChoice,
): { correct: boolean; hint: string; step?: WordStep } {
  if (choice.who !== target.who)
    return {
      correct: false,
      step: "who",
      hint:
        target.who === "name"
          ? "Meera is a name. Choose Proper noun in the doer slot."
          : target.who === "youp"
            ? "Choose the polite you pronoun."
            : "Start with the person in the challenge. Change the pronoun.",
    };
  if (
    target.who === "name" &&
    (choice.name?.trim().toLowerCase() !== target.name?.toLowerCase() ||
      choice.nameG !== target.nameG)
  )
    return {
      correct: false,
      step: "who",
      hint: "Use the name Meera and choose She for the verb agreement.",
    };
  if (choice.verb !== target.verb)
    return {
      correct: false,
      step: "action",
      hint: "The action is different. Choose the verb in the challenge.",
    };
  if (choice.object !== target.object)
    return {
      correct: false,
      step: "what",
      hint: "Find the thing the action is about. Choose that noun.",
    };
  if ((choice.adjective ?? "none") !== (target.adjective ?? "none"))
    return {
      correct: false,
      step: "describe",
      hint:
        target.adjective === "none"
          ? "This challenge needs no adjective. Remove the extra description."
          : "Add the description from the challenge. It belongs to the noun.",
    };
  if (choice.when !== target.when || choice.timeWord !== target.timeWord)
    return {
      correct: false,
      step: "when",
      hint: "Check the time. Yesterday is past, every day is a habit, and tomorrow is future. Include the time word.",
    };
  if (choice.negative !== target.negative)
    return {
      correct: false,
      hint: target.negative
        ? "Didn't tells us the action did not happen. Switch on Make it negative."
        : "This is a positive sentence. Switch off Make it negative.",
    };
  if (choice.question !== target.question)
    return {
      correct: false,
      hint: target.question
        ? "The challenge asks something. Switch on Ask a question."
        : "This tells a story. Switch off Ask a question.",
    };
  return {
    correct: true,
    hint: "The pieces fit. Hear your sentence, then try saying it with your teacher.",
  };
}
