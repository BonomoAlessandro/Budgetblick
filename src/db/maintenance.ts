import { computeContractState } from '../lib/contracts';
import { db } from './db';

/**
 * Setzt Fixkosten mit gekündigtem und abgelaufenem Vertrag auf inaktiv.
 * Gibt die Anzahl deaktivierter Posten zurück.
 */
export async function deactivateEndedContracts(todayISO: string): Promise<number> {
  return db.transaction('rw', db.recurringExpenses, async () => {
    const ended = (await db.recurringExpenses.toArray()).filter(
      (r) =>
        r.active &&
        r.contract?.cancelledOn &&
        computeContractState(r.contract, todayISO).status === 'beendet',
    );
    await Promise.all(ended.map((r) => db.recurringExpenses.update(r.id, { active: false })));
    return ended.length;
  });
}
