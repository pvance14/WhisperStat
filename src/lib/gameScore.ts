import type { Database } from "@/lib/database.types";
import type { Json } from "@/lib/database.types";

type StatEventRow = Database["public"]["Tables"]["stat_events"]["Row"];

export interface SetScore extends Record<string, Json> {
  setNumber: number;
  us: number;
  them: number;
}

const toSafeInteger = (value: unknown) => {
  const nextValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(nextValue)) {
    return null;
  }

  return Math.max(0, Math.trunc(nextValue));
};

const isObject = (value: Json): value is Record<string, Json> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const normalizeScoreBySet = (value: Json | null | undefined): SetScore[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const dedupedScores = new Map<number, SetScore>();

  value.forEach((entry) => {
    if (!isObject(entry)) {
      return;
    }

    const setNumber = toSafeInteger(entry.setNumber);
    const us = toSafeInteger(entry.us);
    const them = toSafeInteger(entry.them);

    if (setNumber === null || setNumber < 1 || us === null || them === null) {
      return;
    }

    dedupedScores.set(setNumber, {
      setNumber,
      us,
      them
    });
  });

  return [...dedupedScores.values()].sort((left, right) => left.setNumber - right.setNumber);
};

export const getSetScore = (scores: SetScore[], setNumber: number): SetScore =>
  scores.find((entry) => entry.setNumber === setNumber) ?? {
    setNumber,
    us: 0,
    them: 0
  };

export const upsertSetScore = (
  scores: SetScore[],
  nextScore: SetScore
): SetScore[] =>
  normalizeScoreBySet([
    ...scores.filter((entry) => entry.setNumber !== nextScore.setNumber),
    {
      setNumber: nextScore.setNumber,
      us: nextScore.us,
      them: nextScore.them
    }
  ]);

export const buildTrackedSetNumbers = (
  events: StatEventRow[],
  scores: SetScore[],
  currentSet: number
) =>
  [...new Set([...events.map((event) => event.set_number), ...scores.map((score) => score.setNumber), currentSet])]
    .filter((setNumber) => setNumber >= 1)
    .sort((left, right) => left - right);

export const summarizeMatchScore = (scores: SetScore[]) =>
  scores.reduce(
    (accumulator, score) => {
      if (score.us > score.them) {
        accumulator.us += 1;
      }

      if (score.them > score.us) {
        accumulator.them += 1;
      }

      return accumulator;
    },
    { us: 0, them: 0 }
  );
