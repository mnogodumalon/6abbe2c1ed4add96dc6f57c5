import type { Anmeldungen, Kurse } from './app';

export type EnrichedKurse = Kurse & {
  kursleiterName: string;
};

export type EnrichedAnmeldungen = Anmeldungen & {
  kursName: string;
};
