import type en from "./en";

type Plural = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

// Same keys as the English source; plural entries may use any CLDR category
// (Polish needs one/few/many).
type Shape<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends { other: string } ? Plural : Shape<T[K]>;
};

export type Messages = Shape<typeof en>;
