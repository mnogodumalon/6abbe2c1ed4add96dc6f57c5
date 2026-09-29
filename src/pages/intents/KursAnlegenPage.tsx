/**
 * Kurs anlegen — 4-Schritt-Wizard.
 * Steps: 1) Kursdetails eingeben (Titel, Stil, Niveau, Kursleiter) →
 *        2) Zeit & Ort festlegen (Datum, Dauer, Ort) →
 *        3) Kapazität & Preis (max. Teilnehmer, Preis, Beschreibung) →
 *        4) Prüfen & anlegen.
 * Reads: kursleiter. Writes: kurse (createKurseEntry); kursstatus wird auf 'geplant' gesetzt.
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
import { useKursAnlegenFlow } from '@/lib/journey/flows/KursAnlegen';
import { tx } from '@/i18n';

export default function KursAnlegenPage() {
  const [step, setStep] = useState(1);

  const flow = useKursAnlegenFlow({
    steps: {
      titel: 1,
      yogastil: 1,
      niveau: 1,
      kursleiter: 1,
      startzeit: 2,
      dauer_minuten: 2,
      ort: 2,
      max_teilnehmer: 3,
      preis: 3,
      beschreibung: 3,
    },
    items: {
      kursleiter: r => ({
        id: r.id,
        title: `${fieldText(r, 'kursleiter_firstname')} ${fieldText(r, 'kursleiter_lastname')}`.trim(),
        subtitle: fieldText(r, 'email'),
        status: fieldLookup(r, 'status') ?? undefined,
      }),
    },
  });

  return (
    <IntentWizardShell
      title={tx('Kurs anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Einen neuen Yoga-Kurs anlegen und einen Kursleiter zuweisen.'),
        needs: [tx('Name des Kurses'), tx('Kursleiter'), tx('Startzeit und Ort')],
      }}
    >
      <WizardStep
        label={tx('Kursdetails')}
        description={tx('Titel, Stil, Niveau und Kursleiter des neuen Kurses festlegen.')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.kurse} name="titel" placeholder={tx('z. B. Hatha-Yoga für Anfänger')} />
          <Bound form={flow.forms.kurse} name="yogastil" />
          <Bound form={flow.forms.kurse} name="niveau" />
          <div className="pt-2">
            <p className="text-sm font-medium text-foreground mb-2">{tx('Kursleiter')}</p>
            <EntitySelectStep
              {...flow.picks.kursleiter.select}
              {...flow.pick('kursleiter')}
              avatar="initials"
              searchPlaceholder={tx('Name suchen …')}
            />
          </div>
          <StepNav
            onBack={undefined}
            hideBack
            onNext={() => flow.validateStep(1)}
            nextStepLabel={tx('Zeit & Ort')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Zeit & Ort')}
        description={tx('Beginn, Dauer und Veranstaltungsort des Kurses eintragen.')}
        needs={['titel']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.kurse} name="startzeit" />
          <Bound form={flow.forms.kurse} name="dauer_minuten" hint={tx('Angabe in Minuten, z. B. 60 oder 90')} />
          <Bound form={flow.forms.kurse} name="ort" placeholder={tx('z. B. Raum 1 oder Online')} />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Kapazität & Preis')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Kapazität & Preis')}
        description={tx('Maximale Teilnehmerzahl, Kursgebühr und optionale Beschreibung angeben.')}
        needs={['startzeit']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.kurse} name="max_teilnehmer" hint={tx('Maximale Anzahl an Teilnehmenden')} />
          <Bound form={flow.forms.kurse} name="preis" hint={tx('Preis in Euro, z. B. 15')} />
          <Bound form={flow.forms.kurse} name="beschreibung" rows={3} />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              {
                key: 'kursstatus',
                label: tx('Kursstatus'),
                value: tx('Geplant'),
              },
            ]}
            whatHappensNext={tx('Der Kurs wird mit dem Status „Geplant" angelegt und kann danach zur Anmeldung geöffnet werden.')}
            confirmLabel={tx('Kurs anlegen')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Öffne den Kurs zur Anmeldung, damit Teilnehmende sich einschreiben können.')}
          next={[
            { label: tx('Kurs zur Anmeldung öffnen'), href: '#/intents/kurs-oeffnen' },
            { label: tx('Weiteren Kurs anlegen') },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
