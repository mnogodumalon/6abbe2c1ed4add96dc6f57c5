/**
 * Anmeldung verwalten — 2-Schritt-Wizard.
 * Steps: 1) Anmeldung auswählen → 2) Prüfen & aktualisieren.
 * Reads: anmeldungen (alle Records, durchsuchbar nach teilnehmer_firstname, teilnehmer_lastname, email).
 * Writes: anmeldungen — aktualisiert anmeldestatus.
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup } from '@/lib/journey';
import { useAnmeldungVerwaltenFlow } from '@/lib/journey/flows/AnmeldungVerwalten';
import { tx } from '@/i18n';

export default function AnmeldungVerwaltenPage() {
  const [step, setStep] = useState(1);

  const flow = useAnmeldungVerwaltenFlow({
    steps: { anmeldungen: 1 },
    items: {
      anmeldungen: r => ({
        id: r.id,
        title: `${fieldText(r, 'teilnehmer_firstname')} ${fieldText(r, 'teilnehmer_lastname')}`.trim(),
        subtitle: fieldText(r, 'email'),
        status: fieldLookup(r, 'anmeldestatus') ?? undefined,
      }),
    },
  });

  return (
    <IntentWizardShell
      title={tx('Anmeldung verwalten')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Ändere den Status einer bestehenden Anmeldung.'),
        needs: [tx('Name des Teilnehmers oder E-Mail-Adresse')],
      }}
    >
      <WizardStep
        label={tx('Anmeldung')}
        description={tx('Suche nach Name oder E-Mail-Adresse des Teilnehmers.')}
      >
        <EntitySelectStep
          {...flow.picks.anmeldungen.select}
          {...flow.pick('anmeldungen')}
          searchPlaceholder={tx('Vor- oder Nachname, E-Mail …')}
          avatar="initials"
        />
      </WizardStep>

      <WizardStep
        label={tx('Neuer Status')}
        description={tx('Wähle den neuen Anmeldestatus für diese Person.')}
        needs={['anmeldungen']}
      >
        <Bound form={flow.forms.anmeldungen} name="anmeldestatus" />
        <StepNav
          onBack={() => setStep(1)}
          onNext={() => flow.validateStep(2)}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Anmeldestatus wird sofort aktualisiert.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          actions={{ copy: false, print: false }}
          next={[
            { label: tx('Weitere Anmeldung verwalten') },
            { label: tx('Kurs öffnen'), href: '#/intents/kurs-oeffnen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Die Änderung ist im System gespeichert.')}
        />
      )}
    </IntentWizardShell>
  );
}
