import { useEffect, useMemo, useState } from 'react';
import { PublicShell } from '@/components/PublicShell';
import {
  loadPublicPagesConfig,
  prepareChallenge,
  PageUnavailableError,
  type PublicPagesConfig,
  type PublicPageConfig,
} from '@/lib/publicClient';
import { createPublicPort } from '@/lib/journey/publicPort';
import {
  useStepForm,
  useJourneySubmit,
  useRecordSearch,
  todayIso,
  fieldText,
  fieldLookup,
  fieldDate,
  fieldNumber,
  labelOf,
} from '@/lib/journey';
import { IntentWizardShell, type WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { Bound } from '@/components/blocks/Bound';
import { tx } from '@/i18n';
import { format } from 'date-fns';

const SLUG = 'kurs-anmeldung';

function formatKursTime(iso: string | null): string {
  if (!iso) return '';
  try {
    return format(new Date(iso), 'dd.MM.yyyy, HH:mm') + ' Uhr';
  } catch {
    return iso;
  }
}

function KursAnmeldungInner({ cfg, page }: { cfg: PublicPagesConfig; page: PublicPageConfig }) {
  const STEPS: WizardStep[] = [
  { label: tx('Kurs wählen'), key: 'kurs', description: tx('Wähle einen offenen Kurs aus der Liste.') },
  { label: tx('Deine Daten'), key: 'daten', description: tx('Trag deine Kontaktdaten und Erfahrung ein.') },
  { label: tx('Prüfen'), key: 'pruefen' },
];

  const [step, setStep] = useState(1);

  const port = useMemo(() => createPublicPort(cfg, page), [cfg, page]);

  const kursSearch = useRecordSearch(port, 'kurse', {
    searchFields: ['titel', 'ort'],
    toItem: (r) => {
      const yogastil = fieldLookup(r, 'yogastil');
      const niveau = fieldLookup(r, 'niveau');
      const startzeit = fieldDate(r, 'startzeit');
      const ort = fieldText(r, 'ort');
      const preis = fieldNumber(r, 'preis');
      const subtitleParts: string[] = [];
      if (startzeit) subtitleParts.push(formatKursTime(startzeit));
      if (ort) subtitleParts.push(ort);
      const statsParts: { label: string; value: string | number }[] = [];
      if (yogastil) statsParts.push({ label: tx('Stil'), value: yogastil.label });
      if (niveau) statsParts.push({ label: tx('Niveau'), value: niveau.label });
      if (preis != null) statsParts.push({ label: tx('Preis'), value: `${preis} €` });
      return {
        id: r.id,
        title: fieldText(r, 'titel'),
        subtitle: subtitleParts.join(' · ') || undefined,
        stats: statsParts.length > 0 ? statsParts : undefined,
      };
    },
  });

  const anmeldungForm = useStepForm('anmeldungen', {
    fields: ['kurs', 'teilnehmer_firstname', 'teilnehmer_lastname', 'email', 'telefon', 'erfahrung', 'gesundheitshinweise', 'bemerkungen', 'teilnahmebedingungen', 'anmeldedatum'],
    required: {
      kurs: true,
      teilnehmer_firstname: true,
      teilnehmer_lastname: true,
      email: true,
      teilnahmebedingungen: true,
      anmeldedatum: true,
    },
    steps: {
      kurs: 1,
      teilnehmer_firstname: 2,
      teilnehmer_lastname: 2,
      email: 2,
      telefon: 2,
      erfahrung: 2,
      gesundheitshinweise: 2,
      bemerkungen: 2,
      teilnahmebedingungen: 2,
      anmeldedatum: 2,
    },
    initial: {
      anmeldedatum: todayIso(),
    },
    autoComplete: true,
  });

  const submit = useJourneySubmit(
    port,
    [{ key: 'anmeldung', entity: 'anmeldungen', form: anmeldungForm, primary: true }],
    { draftKey: 'kurs-anmeldung' },
  );

  const createEp = page.endpoints?.find((e) => e.op === 'create' && e.entity === 'anmeldungen');

  function handleKursSelect(id: string) {
    const label = kursSearch.labelOf(id) ?? '';
    anmeldungForm.set('kurs', id, label);
    prepareChallenge(cfg, page, 'POST', `/apps/${createEp?.app_id ?? ''}/records`);
    setStep(2);
  }

  function handleRestart() {
    submit.reset();
    anmeldungForm.reset();
    setStep(1);
  }

  return (
    <IntentWizardShell
      steps={STEPS}
      currentStep={step}
      onStepChange={setStep}
      back={false}
      forms={[anmeldungForm]}
      draftKey="kurs-anmeldung"
    >
      {step === 1 && (
        <>
          <EntitySelectStep
            {...kursSearch.select}
            onSelect={handleKursSelect}
            selectedId={anmeldungForm.get('kurs') as string | null}
            avatar="none"
            searchPlaceholder={tx('Kurs suchen …')}
            emptyText={tx('Derzeit sind keine offenen Kurse verfügbar.')}
            columns={1}
          />
          <StepNav
            hideBack
            onNext={() => anmeldungForm.validate(['kurs'])}
            nextStepLabel={tx('Deine Daten')}
          />
        </>
      )}

      {step === 2 && (
        <>
          <div className="space-y-4">
            <Bound form={anmeldungForm} name="teilnehmer_firstname" />
            <Bound form={anmeldungForm} name="teilnehmer_lastname" />
            <Bound form={anmeldungForm} name="email" />
            <Bound form={anmeldungForm} name="telefon" />
            <Bound form={anmeldungForm} name="anmeldedatum" />
            <Bound form={anmeldungForm} name="erfahrung" />
            <Bound form={anmeldungForm} name="gesundheitshinweise" rows={3} />
            <Bound form={anmeldungForm} name="bemerkungen" rows={3} />
            <Bound form={anmeldungForm} name="teilnahmebedingungen" />
          </div>
          <StepNav
            onBack={() => setStep(1)}
            onNext={() =>
              anmeldungForm.validate([
                'teilnehmer_firstname',
                'teilnehmer_lastname',
                'email',
                'anmeldedatum',
                'teilnahmebedingungen',
              ])
            }
            nextStepLabel={tx('Prüfen')}
          />
        </>
      )}

      {step === 3 && !submit.done && (
        <SummaryStep
          forms={[anmeldungForm]}
          submit={submit}
          whatHappensNext={tx('Nach deiner Anmeldung erhältst du eine Bestätigung per E-Mail.')}
          confirmLabel={tx('Jetzt anmelden')}
        />
      )}

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[anmeldungForm]}
          submit={submit}
          restartLabel={tx('Weitere Anmeldung')}
          whatHappensNext={tx('Wir freuen uns auf dich! Du erhältst in Kürze eine Bestätigung per E-Mail.')}
        />
      )}
    </IntentWizardShell>
  );
}

export default function KursAnmeldung() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicPagesConfig(SLUG)
      .then((c) => {
        setCfg(c);
        setPage(c?.pages[SLUG] ?? null);
      })
      .catch((err) => {
        if (err instanceof PageUnavailableError) {
          setPage(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !cfg || !page) {
    return <PublicShell loading={loading} unavailable={!loading && (!cfg || !page)} />;
  }

  return (
    <PublicShell title={tx('Kursanmeldung')} description={tx('Melde dich für einen Yoga-Kurs an.')}>
      <KursAnmeldungInner cfg={cfg} page={page} />
    </PublicShell>
  );
}
