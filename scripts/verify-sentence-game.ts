import assert from "node:assert/strict";
import { buildPath } from "../lib/sentence-path";
import {
  checkMission,
  fitChoices,
  MISSIONS,
  STARTER,
} from "../lib/sentence-game";

const english = [
  "She drinks coffee every day.",
  "Meera drank hot coffee yesterday.",
  "Will you play the guitar tomorrow?",
  "We didn't read a new book yesterday.",
];
let verified = 0;
for (const lang of ["ta", "kn", "hi", "fr"] as const) {
  for (const [i, mission] of MISSIONS.entries()) {
    const result = buildPath(lang, mission.target);
    assert(
      result?.sentence && !result.unsupported,
      `${lang}: challenge must produce a supported sentence`,
    );
    assert.equal(
      result.english,
      english[i],
      `${lang}: challenge must communicate the promised meaning`,
    );
    assert.equal(checkMission(mission.target, mission.target).correct, true);
    assert.equal(
      checkMission(
        { ...mission.target, negative: !mission.target.negative },
        mission.target,
      ).correct,
      false,
      "Opposite meaning must not earn a completion",
    );
    verified++;
  }
}
assert.equal(
  checkMission({ ...MISSIONS[1].target, name: "Ravi" }, MISSIONS[1].target)
    .correct,
  false,
  "The wrong proper noun must not pass",
);
assert.equal(
  checkMission({ ...MISSIONS[1].target, nameG: "m" }, MISSIONS[1].target)
    .correct,
  false,
  "The wrong gender agreement must not pass",
);
assert.equal(
  checkMission({ ...MISSIONS[2].target, question: false }, MISSIONS[2].target)
    .correct,
  false,
  "A statement cannot complete a question challenge",
);
const music = fitChoices({ ...STARTER, adjective: "hot" }, { verb: "play" });
assert.equal(music.choice.object, "piano");
assert.equal(music.choice.adjective, "none");
assert(music.notice);
const skill = fitChoices(
  { ...STARTER, verb: "do", object: "homework", when: "can" },
  { object: "shopping" },
);
assert.equal(skill.choice.when, "present");
assert(skill.notice);
const rest = fitChoices(STARTER, { verb: "sleep" });
assert.equal(rest.choice.object, null);
for (const lang of ["ta", "kn", "hi", "fr"] as const)
  assert(buildPath(lang, rest.choice)?.sentence);
console.log(
  JSON.stringify({
    challenge_meanings_verified: verified,
    wrong_meanings_rejected: true,
    proper_nouns_and_agreement_checked: true,
    compatible_word_changes_checked: true,
  }),
);
