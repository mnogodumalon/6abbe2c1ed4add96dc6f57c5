// The orchestrator's plan, as far as the running app needs it
// (docs/orchestrator/SPEC.md). Generated — do not edit; regenerated on every
// build and update from the stored plan. Without a plan every map is empty.
//
//   SYSTEM_ASSIGNED entity → fields a tool fills when a record is CREATED — the
//                   value does not exist before; dialogs hide these on create and
//                   the form-polish sets no default on them. A scheduled or
//                   update-triggered tool owns its field but is NOT in here.
//   PLAN_SENTENCES  slug → the plan in the owner's words (flows' field page)
//
// The runtime write guard (FLOW_WRITES/OWNERSHIP, planGuard.ts) left on
// 23.09.2026: a flow page composes against its generated hook, whose submit
// plan IS the Schreibliste — there is no way to spell a write outside it.

export const SYSTEM_ASSIGNED: Record<string, string[]> = {
  "anmeldungen": [
    "anmeldestatus"
  ]
};

export const PLAN_SENTENCES: Record<string, string[]> = {
  "kurs-anlegen": [
    "Legt an: kurse",
    "Automatisch: kursstatus (fester Wert „geplant“)"
  ],
  "kurs-oeffnen": [
    "Ändert: kurse",
    "Automatisch: kursstatus (fester Wert „offen“)"
  ],
  "anmeldung-verwalten": [
    "Ändert: anmeldungen"
  ]
};

export const PLAN_SUMMARY = "Ein Yoga-Studio verwaltet Kurse und Kursleiter intern und ermöglicht Teilnehmern, sich über eine öffentliche Seite für Kurse anzumelden. Intern pflegt das Team Kursleiterprofile und Kurse; Teilnehmer sehen offene Kurse und melden sich selbst an.";
