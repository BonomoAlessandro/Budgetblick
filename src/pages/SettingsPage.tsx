import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BottomSheet } from '../components/BottomSheet';
import { Card } from '../components/Card';
import { CategoryForm } from '../components/CategoryForm';
import { Field } from '../components/fields';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { buttonClass, inputClass } from '../components/styles';
import { createBackup, deleteAllData, restoreBackup } from '../db/backup';
import {
  SETTING_PRODUCT_LOOKUP,
  SETTING_REMINDER_LEAD_DAYS,
  useCategories,
  useSetting,
} from '../db/hooks';
import { categoryUsageCount, deleteCategory, saveCategory, setSetting } from '../db/repo';
import { BackupError, backupFileName, parseBackup } from '../lib/backup';
import { DEFAULT_REMINDER_LEAD_DAYS } from '../lib/contracts';
import { formatDate, todayISO } from '../lib/date';
import { downloadTextFile } from '../lib/download';
import { getTheme, setTheme, THEME_LABELS, type Theme } from '../lib/theme';
import type { Category, CategoryKind } from '../types';

type Editing = { category?: Category; kind: CategoryKind } | null;

interface PendingImport {
  json: unknown;
  exportedAt?: string;
  counts: { expenses: number; recurring: number };
}

function CategoryList({
  categories,
  onEdit,
}: {
  categories: Category[];
  onEdit: (category: Category) => void;
}) {
  return (
    <ul className="-mx-4 divide-y divide-slate-100 dark:divide-slate-800">
      {categories.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => onEdit(c)}
            className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-full text-lg"
              style={{ backgroundColor: `${c.color}22` }}
            >
              {c.icon}
            </span>
            <span className="flex-1">{c.name}</span>
            <span
              aria-hidden="true"
              className="size-3 rounded-full"
              style={{ backgroundColor: c.color }}
            />
          </button>
        </li>
      ))}
    </ul>
  );
}

function StatusMessage({ children, error }: { children: ReactNode; error?: boolean }) {
  return (
    <p
      role={error ? 'alert' : 'status'}
      className={`mt-3 rounded-xl px-3 py-2 text-sm ${
        error
          ? 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200'
          : 'bg-brand-50 text-brand-800 dark:bg-slate-800 dark:text-slate-200'
      }`}
    >
      {children}
    </p>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const fixed = useCategories('fixed') ?? [];
  const variable = useCategories('variable') ?? [];
  const leadDays = useSetting(SETTING_REMINDER_LEAD_DAYS, DEFAULT_REMINDER_LEAD_DAYS);
  const productLookup = useSetting(SETTING_PRODUCT_LOOKUP, true);

  const [theme, setThemeState] = useState<Theme>(getTheme);
  const [leadInput, setLeadInput] = useState<string | null>(null);
  const [leadError, setLeadError] = useState<string>();
  const [editing, setEditing] = useState<Editing>(null);
  const [dataMessage, setDataMessage] = useState<{ text: string; error?: boolean }>();
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const usageCount = useLiveQuery(
    () => (editing?.category ? categoryUsageCount(editing.category.id) : 0),
    [editing?.category?.id],
  );

  async function handleExport() {
    const backup = await createBackup();
    downloadTextFile(
      JSON.stringify(backup, null, 2),
      backupFileName(todayISO()),
      'application/json',
    );
    setDataMessage({ text: 'Sicherung wurde heruntergeladen.' });
  }

  async function handleImportFile(file: File) {
    try {
      const json: unknown = JSON.parse(await file.text());
      const data = parseBackup(json); // nur prüfen, noch nichts ändern
      const exportedAt = (json as { exportedAt?: unknown }).exportedAt;
      setPendingImport({
        json,
        exportedAt: typeof exportedAt === 'string' ? exportedAt : undefined,
        counts: { expenses: data.expenses.length, recurring: data.recurringExpenses.length },
      });
    } catch (error) {
      setDataMessage({
        error: true,
        text:
          error instanceof BackupError
            ? error.message
            : 'Die Datei konnte nicht gelesen werden. Ist es eine JSON-Sicherung von Budgetblick?',
      });
    }
  }

  function saveLeadDays() {
    if (leadInput === null) return;
    const value = Number(leadInput);
    if (!/^\d+$/.test(leadInput.trim()) || value > 365) {
      setLeadError('Ganze Zahl zwischen 0 und 365.');
      return;
    }
    setLeadError(undefined);
    void setSetting(SETTING_REMINDER_LEAD_DAYS, value);
    setLeadInput(null);
  }

  const sectionTitle = 'mb-2 flex items-center justify-between gap-2';

  return (
    <>
      <PageHeader
        title="Einstellungen"
        action={
          <Link
            to="/"
            aria-label="Zurück zur Übersicht"
            className="flex size-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Icon name="back" />
          </Link>
        }
      />
      <div className="space-y-4">
        <Card title="Darstellung">
          <fieldset>
            <legend className="sr-only">Farbschema</legend>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {(Object.keys(THEME_LABELS) as Theme[]).map((t) => (
                <label
                  key={t}
                  className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600 ${
                    theme === t
                      ? 'bg-white shadow-sm dark:bg-slate-950'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={t}
                    checked={theme === t}
                    onChange={() => {
                      setTheme(t);
                      setThemeState(t);
                    }}
                    className="sr-only"
                  />
                  {THEME_LABELS[t]}
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card title="Erinnerungen">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveLeadDays();
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1">
              <Field
                label="Standard-Vorlaufzeit (Tage vor dem Kündigungstermin)"
                error={leadError}
                hint="Gilt für neu erfasste Verträge."
              >
                {(p) => (
                  <input
                    {...p}
                    inputMode="numeric"
                    className={inputClass}
                    value={leadInput ?? String(leadDays)}
                    onChange={(e) => setLeadInput(e.target.value)}
                  />
                )}
              </Field>
            </div>
            {leadInput !== null && (
              <button type="submit" className={buttonClass('primary', 'mb-6')}>
                Speichern
              </button>
            )}
          </form>
        </Card>

        <Card title="Barcode-Scan">
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              className="size-5 shrink-0 accent-brand-700"
              checked={productLookup}
              onChange={(e) => void setSetting(SETTING_PRODUCT_LOOKUP, e.target.checked)}
            />
            <span>Produktnamen bei Open Food Facts nachschlagen</span>
          </label>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Nur beim ersten Scan eines Produkts wird die Artikelnummer an Open Food Facts gesendet,
            sonst nichts. Bekannte Produkte erkennt die App lokal, auch offline.
          </p>
        </Card>

        {(
          [
            ['Kategorien · Fixkosten', 'fixed', fixed],
            ['Kategorien · Variabel', 'variable', variable],
          ] as const
        ).map(([title, kind, list]) => (
          <Card key={kind}>
            <div className={sectionTitle}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {title}
              </h2>
              <button
                type="button"
                className={buttonClass('ghost', 'shrink-0 px-3 text-sm')}
                aria-label="Neue Kategorie"
                onClick={() => setEditing({ kind })}
              >
                <Icon name="plus" className="size-5" />
                Neu
              </button>
            </div>
            <CategoryList
              categories={list}
              onEdit={(category) => setEditing({ category, kind: category.kind })}
            />
          </Card>
        ))}

        <Card title="Daten">
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
            Alle Daten liegen ausschliesslich auf diesem Gerät. Erstelle regelmässig eine Sicherung,
            z. B. vor einem Gerätewechsel.
          </p>
          <div className="flex flex-col gap-2">
            <button type="button" className={buttonClass('secondary')} onClick={handleExport}>
              Daten exportieren (JSON)
            </button>
            <label
              className={buttonClass(
                'secondary',
                'cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600',
              )}
            >
              Daten importieren
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void handleImportFile(file);
                }}
              />
            </label>
            <button
              type="button"
              className={buttonClass('secondary', 'text-red-600 dark:text-red-400')}
              onClick={() => setConfirmDelete(true)}
            >
              Alle Daten löschen
            </button>
          </div>
          {dataMessage && (
            <StatusMessage error={dataMessage.error}>{dataMessage.text}</StatusMessage>
          )}
        </Card>

        <p className="pb-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Budgetblick · Keine Anmeldung, kein Tracking, keine Daten verlassen das Gerät.
        </p>
      </div>

      <BottomSheet
        open={editing !== null}
        title={editing?.category ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <CategoryForm
            key={editing.category?.id ?? `new-${editing.kind}`}
            initial={editing.category}
            defaultKind={editing.kind}
            usageCount={usageCount ?? 0}
            onSubmit={async (draft) => {
              await saveCategory(draft);
              setEditing(null);
            }}
            onDelete={
              editing.category
                ? async () => {
                    await deleteCategory(editing.category!.id);
                    setEditing(null);
                  }
                : undefined
            }
          />
        )}
      </BottomSheet>

      <BottomSheet
        open={pendingImport !== null}
        title="Sicherung importieren"
        onClose={() => setPendingImport(null)}
      >
        {pendingImport && (
          <div className="space-y-4">
            <p>
              Sicherung
              {pendingImport.exportedAt &&
                ` vom ${formatDate(pendingImport.exportedAt.slice(0, 10))}`}{' '}
              mit {pendingImport.counts.recurring} Fixkosten und {pendingImport.counts.expenses}{' '}
              Ausgaben.
            </p>
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              Alle aktuellen Daten auf diesem Gerät werden dabei ersetzt.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={buttonClass('secondary')}
                onClick={() => setPendingImport(null)}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className={buttonClass('primary')}
                onClick={async () => {
                  try {
                    await restoreBackup(pendingImport.json);
                    setDataMessage({ text: 'Sicherung wurde importiert.' });
                  } catch (error) {
                    setDataMessage({
                      error: true,
                      text: error instanceof Error ? error.message : 'Import fehlgeschlagen.',
                    });
                  }
                  setPendingImport(null);
                }}
              >
                Daten ersetzen
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={confirmDelete}
        title="Alle Daten löschen?"
        onClose={() => setConfirmDelete(false)}
      >
        <div className="space-y-4">
          <p>
            Einkommen, Fixkosten, Verträge, Ausgaben, Quittungsbilder und eigene Kategorien werden
            unwiderruflich von diesem Gerät gelöscht.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Tipp: Exportiere vorher eine Sicherung.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={buttonClass('secondary')}
              onClick={() => setConfirmDelete(false)}
            >
              Abbrechen
            </button>
            <button
              type="button"
              className={buttonClass('danger')}
              onClick={async () => {
                await deleteAllData();
                setConfirmDelete(false);
                navigate('/');
              }}
            >
              Endgültig löschen
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
