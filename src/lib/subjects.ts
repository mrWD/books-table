/**
 * Open Library subjects are crowd-entered and mostly not genres: a single work carries
 * "Fiction", "Fiction in English", "Accessible book", "Protected DAISY", "Reading
 * Level-Grade 7", "nyt:series_books=2011-11-05" and "Translations into Spanish" side by
 * side. Shown raw they are noise, and taste matching on them matches nothing.
 *
 * So subjects are folded into a small closed vocabulary. Anything that does not map is
 * dropped rather than guessed at — a wrong genre is worse than a missing one.
 */
export const CANON_SUBJECTS = [
  'Fantasy',
  'Science Fiction',
  'Mystery',
  'Thriller',
  'Horror',
  'Romance',
  'Historical Fiction',
  'Classics',
  'Adventure',
  'Young Adult',
  'Children',
  'Comics',
  'Poetry',
  'Drama',
  'Humor',
  'Biography',
  'History',
  'Philosophy',
  'Psychology',
  'Science',
  'Business',
  'Self-Help',
  'True Crime',
  'Travel',
  'Art',
  'Cooking',
  'Religion',
  'Politics',
] as const

export type Subject = (typeof CANON_SUBJECTS)[number]

const CANON_LOOKUP = new Map<string, Subject>(
  CANON_SUBJECTS.map((s) => [s.toLowerCase().replace(/[^a-z]/g, ''), s]),
)

/**
 * Spellings that do not normalise on their own. Keys are lowercase letters only, so
 * "Detective and mystery stories" and "detective_and_mystery_stories" collapse to the
 * same key before lookup.
 */
const ALIASES: Record<string, Subject> = {
  sciencefiction: 'Science Fiction',
  sciencefictionamerican: 'Science Fiction',
  sciencefictionenglish: 'Science Fiction',
  scifi: 'Science Fiction',
  dystopian: 'Science Fiction',
  dystopias: 'Science Fiction',
  spaceopera: 'Science Fiction',
  timetravel: 'Science Fiction',
  fantasyfiction: 'Fantasy',
  epicfantasy: 'Fantasy',
  magic: 'Fantasy',
  wizards: 'Fantasy',
  dragons: 'Fantasy',
  detectiveandmysterystories: 'Mystery',
  detectivestories: 'Mystery',
  mysteryanddetectivestories: 'Mystery',
  crime: 'Mystery',
  crimefiction: 'Mystery',
  suspense: 'Thriller',
  suspensefiction: 'Thriller',
  thrillers: 'Thriller',
  espionage: 'Thriller',
  spystories: 'Thriller',
  horrortales: 'Horror',
  horrorstories: 'Horror',
  ghoststories: 'Horror',
  vampires: 'Horror',
  lovestories: 'Romance',
  romancefiction: 'Romance',
  historicalfiction: 'Historical Fiction',
  historicalnovels: 'Historical Fiction',
  warstories: 'Historical Fiction',
  classicliterature: 'Classics',
  literature: 'Classics',
  englishliterature: 'Classics',
  americanliterature: 'Classics',
  adventurestories: 'Adventure',
  adventureandadventurers: 'Adventure',
  survival: 'Adventure',
  youngadultfiction: 'Young Adult',
  youngadultliterature: 'Young Adult',
  ya: 'Young Adult',
  juvenilefiction: 'Children',
  juvenileliterature: 'Children',
  childrensfiction: 'Children',
  childrensstories: 'Children',
  picturebooks: 'Children',
  comicsandgraphicnovels: 'Comics',
  graphicnovels: 'Comics',
  manga: 'Comics',
  comicbooksstripsetc: 'Comics',
  poetryenglish: 'Poetry',
  poems: 'Poetry',
  verse: 'Poetry',
  plays: 'Drama',
  theater: 'Drama',
  tragedies: 'Drama',
  comedies: 'Humor',
  humorous: 'Humor',
  humorousstories: 'Humor',
  satire: 'Humor',
  wit: 'Humor',
  witandhumor: 'Humor',
  autobiography: 'Biography',
  memoir: 'Biography',
  memoirs: 'Biography',
  biographies: 'Biography',
  worldhistory: 'History',
  militaryhistory: 'History',
  ancienthistory: 'History',
  historic: 'History',
  ethics: 'Philosophy',
  logic: 'Philosophy',
  metaphysics: 'Philosophy',
  stoicism: 'Philosophy',
  selfactualization: 'Psychology',
  cognitivepsychology: 'Psychology',
  behavior: 'Psychology',
  mentalhealth: 'Psychology',
  physics: 'Science',
  astronomy: 'Science',
  mathematics: 'Science',
  biology: 'Science',
  evolution: 'Science',
  popularscience: 'Science',
  economics: 'Business',
  management: 'Business',
  entrepreneurship: 'Business',
  finance: 'Business',
  personalfinance: 'Business',
  leadership: 'Business',
  selfhelp: 'Self-Help',
  successinbusiness: 'Self-Help',
  conductoflife: 'Self-Help',
  habit: 'Self-Help',
  motivation: 'Self-Help',
  productivity: 'Self-Help',
  truecrime: 'True Crime',
  murder: 'True Crime',
  serialmurderers: 'True Crime',
  voyagesandtravels: 'Travel',
  descriptionandtravel: 'Travel',
  arthistory: 'Art',
  painting: 'Art',
  photography: 'Art',
  music: 'Art',
  design: 'Art',
  cookery: 'Cooking',
  cooking: 'Cooking',
  recipes: 'Cooking',
  food: 'Cooking',
  christianity: 'Religion',
  buddhism: 'Religion',
  islam: 'Religion',
  spirituality: 'Religion',
  theology: 'Religion',
  bible: 'Religion',
  politicalscience: 'Politics',
  government: 'Politics',
  democracy: 'Politics',
  socialism: 'Politics',
}

/**
 * Cataloguing and accessibility tags that carry no meaning for a reader. Matched as
 * substrings on the lowercased subject, so "Reading Level-Grade 7" and "Reading
 * Level-Grade 11" both go in one line.
 */
const NOISE = [
  'accessible book',
  'protected daisy',
  'in library',
  'internet archive',
  'overdrive',
  'lending library',
  'print disabled',
  'large type',
  'reading level',
  'nyt:',
  'new york times',
  'bestseller',
  'open_syllabus',
  'translations into',
  'fiction in english',
  'texts',
  'collection',
  'readers',
  'award',
  // A subject about an adaptation describes a different work: Open Library carries
  // "Comics & graphic novels, adaptations" on Sapiens because a graphic novel of it
  // exists, and that tag was enough to file a history book under Comics.
  'adaptation',
]

export function isNoiseSubject(raw: string): boolean {
  const s = raw.toLowerCase()
  return NOISE.some((n) => s.includes(n))
}

/**
 * Shelf labels that name two genres but claim only the first. "Science Fiction &
 * Fantasy" is a shop's shelf, not a statement that the book is fantasy — split blindly
 * it filed The Martian under Fantasy.
 */
const COMBINED_SHELVES: Record<string, Subject> = {
  sciencefictionfantasy: 'Science Fiction',
  mysterythriller: 'Mystery',
  romancewomensfiction: 'Romance',
}

function normalizeOne(raw: string): Subject | null {
  const key = raw.toLowerCase().replace(/[^a-z]/g, '')
  return COMBINED_SHELVES[key] ?? ALIASES[key] ?? CANON_LOOKUP.get(key) ?? null
}

/**
 * Fold a work's raw subject list into the closed vocabulary, best-first.
 *
 * Order is preserved from the source: Open Library lists the strongest subjects first
 * often enough that keeping the order beats sorting alphabetically.
 */
export function canonicalSubjects(raw: readonly (string | null | undefined)[]): Subject[] {
  const out = new Set<Subject>()
  for (const value of raw) {
    if (!value || isNoiseSubject(value)) continue
    const whole = normalizeOne(value)
    if (whole) {
      out.add(whole)
      continue
    }
    // A combined shelf is answered as a whole above; splitting it here would put the
    // second genre back.
    if (COMBINED_SHELVES[value.toLowerCase().replace(/[^a-z]/g, '')]) continue
    // "Fiction, fantasy, general" and "Science fiction & fantasy" hide two genres each.
    // The colon belongs here too: Open Library carries machine-tagged subjects like
    // `genre:fantasy` and `form:novel`, and without splitting on it Piranesi lost the
    // Fantasy that was sitting in plain sight.
    for (const part of value.split(/[&,/:—-]/)) {
      const hit = normalizeOne(part.trim())
      if (hit) out.add(hit)
    }
  }
  return [...out]
}

/** Human-readable subjects for the detail page: noise removed, originals kept. */
export function displaySubjects(raw: readonly string[], limit = 6): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of raw) {
    if (isNoiseSubject(s)) continue
    const trimmed = s.trim()
    if (!trimmed || trimmed.length > 34) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
    if (out.length >= limit) break
  }
  return out
}

/** The genre strip on Explore. Every slug here was checked against the live index. */
export const BROWSE_SUBJECTS: Subject[] = [
  'Fantasy',
  'Science Fiction',
  'Mystery',
  'Thriller',
  'Romance',
  'Horror',
  'Historical Fiction',
  'Young Adult',
  'Biography',
  'History',
  'Philosophy',
  'Psychology',
  'Science',
  'Business',
  'Self-Help',
  'True Crime',
]
