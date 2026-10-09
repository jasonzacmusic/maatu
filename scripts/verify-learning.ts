import assert from 'node:assert/strict';
import { buildPath, VERB_TILES, WHO_TILES, WHEN_TILES, ADJECTIVES, adjectiveAllowed, whenAllowed, type PathChoice, type PathLang } from '../lib/sentence-path';
import { ALL_LESSONS, personaMeta } from '../lib/curriculum';
import { PERSONAS } from '../lib/personas.generated';

const base: PathChoice = { who: 'i', gender: 'm', verb: 'drink', object: 'coffee', when: 'present', timeWord: false, negative: false, question: false, adjective: 'none' };
function sentence(lang: PathLang, patch: Partial<PathChoice>) { return buildPath(lang, { ...base, ...patch })!; }
const goldens: [PathLang, Partial<PathChoice>, string][] = [
 ['fr', { adjective: 'hot' }, 'je bois du café chaud'],
 ['fr', { adjective: 'hot', negative: true }, 'je bois pas de café chaud'],
 ['fr', { object: 'water', adjective: 'cold' }, "je bois de l'eau froide"],
 ['fr', { who: 'we', when: 'future' }, 'on va boire du café'],
 ['fr', { who: 'name', name: 'Camille', nameG: 'f', verb: 'go', object: 'school', when: 'past', adjective: 'new' }, 'Camille est allée à la nouvelle école'],
 ['fr', { verb: 'do', object: 'order' }, 'je commande'],
 ['fr', { verb: 'do', object: 'download' }, 'je télécharge'],
 ['fr', { verb: 'do', object: 'ticket' }, 'je réserve un billet'],
 ['fr', { verb: 'go', object: 'city' }, 'je vais à Paris'],
 ['hi', { who: 'name', name: 'Meera', nameG: 'f', verb: 'read', object: 'book', when: 'past', adjective: 'new' }, 'Meera ne ek nayi kitaab padhi'],
 ['hi', { verb: 'sing', object: 'thissong', adjective: 'good' }, 'main yeh achha gaana gaata hoon'],
 ['kn', { verb: 'read', object: 'book', adjective: 'new' }, 'naanu ondu hosa pustaka odtini'],
 ['ta', { verb: 'read', object: 'book', adjective: 'new' }, 'naan oru pudhu puthagam padikkiren'],
];
for (const [lang, patch, expected] of goldens) assert.equal(sentence(lang, patch).sentence, expected, `${lang} ${JSON.stringify(patch)}`);
assert.equal(sentence('fr', { verb: 'go', object: 'school', adjective: 'new', when: 'past' }).english, 'I went to the new school.');
assert.equal(sentence('ta', { verb: 'sing', object: 'thissong', adjective: 'good' }).english, 'I sing this good song.');
assert.equal(whenAllowed('sleep', 'can'), false);
assert.equal(adjectiveAllowed('hot', 'book'), false);
let count = 0;
for (const lang of ['ta', 'kn', 'hi', 'fr'] as const) {
 assert.equal(Object.values(PERSONAS).filter(p => p.language === lang).length, 20);
 assert.ok(personaMeta(`tutor-${lang}`));
 for (const lesson of ALL_LESSONS) { assert.ok(lesson.lexicon[lang].length, `${lang} ${lesson.id}`); assert.equal(personaMeta(`teacher-${lang}-${lesson.id}`)?.language, lang); }
 for (const who of WHO_TILES) for (const verb of VERB_TILES) for (const object of [...verb.objects, null]) for (const when of WHEN_TILES) for (const adjective of ADJECTIVES) {
  if (!whenAllowed(verb.id, when.id, object) || !adjectiveAllowed(adjective.id, object)) continue;
  for (const negative of [false, true]) for (const question of [false, true]) {
   const result = sentence(lang, { who: who.id, name: 'Meera', nameG: 'f', verb: verb.id, object, when: when.id, adjective: adjective.id, negative, question, timeWord: true });
   assert.ok(result && !result.unsupported, JSON.stringify({lang,who,verb,object,when,adjective}));
   assert.ok(result.sentence && result.english && result.parts.length);
   assert.doesNotMatch(result.sentence, /undefined|NaN|\u2014|[\u0900-\u097f\u0b80-\u0bff\u0c80-\u0cff]/u);
   assert.doesNotMatch(result.english, /(?:new|good|big|small) to |good this |new this /);
   count++;
  }
 }
}
console.log(`${goldens.length} linguistic goldens, ${count.toLocaleString()} supported sentences, 80 scenarios, and 64 lesson routes passed.`);
