/**
 * Kurs zur Anmeldung öffnen — 2-Schritt-Wizard.
 * Steps: 1) Kurs auswählen (nur Status "geplant") → 2) Prüfen & Status setzen.
 * Reads: kurse (filter: kursstatus=geplant, columns: titel, startzeit, kursstatus, max_teilnehmer).
 * Writes: kurse (update kursstatus → 'offen').
 * Composes: IntentWizardShell, EntitySelectStep, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { useKursOeffnenFlow } from '@/lib/journey/flows/KursOeffnen';
import { fieldText, fieldLookup, fieldDate } from '@/lib/journey';
import { tx } from '@/i18n';
import { format, parseISO } from 'date-fns';

export default function KursOeffnenPage() {
  const [step, setStep] = useState(1);

  const flow = useKursOeffnenFlow({
    steps: { kurse: 1 },
    items: {
      kurse: r => {
        const startzeit = fieldDate(r, 'startzeit');
        const startFormatted = startzeit
          ? format(parseISO(startzeit), 'dd.MM.yyyy HH:mm')
          : '';
        const status = fieldLookup(r, 'kursstatus');
        const maxTeilnehmer = r.fields['max_teilnehmer'];
        return {
          id: r.id,
          title: fieldText(r, 'titel'),
          subtitle: startFormatted,
          status: status ?? undefined,
          stats: maxTeilnehmer != null
            ? [{ label: tx('Max. Plätze'), value: String(maxTeilnehmer) }]
            : [],
        };
      },
    },
  });

  return (
    <IntentWizardShell
      title={tx('Kurs zur Anmeldung öffnen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Einen geplanten Kurs freischalten, damit sich Teilnehmer anmelden können.'),
        needs: [tx('Name des Kurses')],
      }}
    >
      <WizardStep
        label={tx('Kurs wählen')}
        description={tx('Nur Kurse im Status „Geplant" können geöffnet werden.')}
      >
        <EntitySelectStep
          {...flow.picks.kurse.select}
          {...flow.pick('kurse')}
          searchPlaceholder={tx('Kurstitel suchen …')}
          emptyText={tx('Keine geplanten Kurse gefunden. Lege zuerst einen Kurs an.')}
          create={false}
        />
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              {
                key: 'kursstatus_neu',
                label: tx('Neuer Status'),
                value: tx('Anmeldung offen'),
              },
            ]}
            whatHappensNext={tx('Der Kurs ist sofort für Anmeldungen sichtbar.')}
            confirmLabel={tx('Kurs öffnen')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          verb="updated"
          actions={{ copy: false, print: false }}
          whatHappensNext={tx('Teilnehmer können sich ab sofort für diesen Kurs anmelden.')}
          next={[
            {
              label: tx('Anmeldung verwalten'),
              href: '#/intents/anmeldung-verwalten',
            },
            {
              label: tx('Weiteren Kurs öffnen'),
            },
            {
              label: tx('Zum Dashboard'),
              href: '#/',
            },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
