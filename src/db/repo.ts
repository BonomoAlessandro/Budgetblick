import type { Category, Expense, Income, RecurringExpense } from '../types';
import { db, newId } from './db';

type WithOptionalId<T extends { id: string }> = Omit<T, 'id'> & { id?: string };

export async function saveIncome(income: WithOptionalId<Income>): Promise<string> {
  const id = income.id ?? newId();
  await db.incomes.put({ ...income, id });
  return id;
}

export async function deleteIncome(id: string): Promise<void> {
  await db.incomes.delete(id);
}

export async function saveRecurringExpense(
  expense: WithOptionalId<RecurringExpense>,
): Promise<string> {
  const id = expense.id ?? newId();
  await db.recurringExpenses.put({ ...expense, id });
  return id;
}

export async function deleteRecurringExpense(id: string): Promise<void> {
  await db.recurringExpenses.delete(id);
}

export async function saveExpense(expense: WithOptionalId<Expense>): Promise<string> {
  const id = expense.id ?? newId();
  await db.expenses.put({ ...expense, id, createdAt: expense.createdAt ?? Date.now() });
  return id;
}

export async function deleteExpense(id: string): Promise<void> {
  await db.expenses.delete(id);
}

/** Setzt oder entfernt (`undefined`) das Kündigungsdatum eines Vertrags. */
export async function setContractCancelled(id: string, cancelledOn: string | undefined) {
  await db.transaction('rw', db.recurringExpenses, async () => {
    const item = await db.recurringExpenses.get(id);
    if (!item?.contract) return;
    const contract = { ...item.contract, cancelledOn };
    if (!cancelledOn) delete contract.cancelledOn;
    // Zurückgenommene Kündigung: Posten wieder aktivieren.
    await db.recurringExpenses.update(id, { contract, ...(cancelledOn ? {} : { active: true }) });
  });
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value });
}

export async function saveCategory(category: WithOptionalId<Category>): Promise<string> {
  const id = category.id ?? newId();
  await db.categories.put({ ...category, id });
  return id;
}

/** Anzahl Fixkosten und Ausgaben, die eine Kategorie verwenden. */
export async function categoryUsageCount(id: string): Promise<number> {
  const [recurring, expenses] = await Promise.all([
    db.recurringExpenses.where('categoryId').equals(id).count(),
    db.expenses.where('categoryId').equals(id).count(),
  ]);
  return recurring + expenses;
}

export async function deleteCategory(id: string): Promise<void> {
  await db.transaction('rw', [db.categories, db.recurringExpenses, db.expenses], async () => {
    if ((await categoryUsageCount(id)) > 0) {
      throw new Error('Kategorie wird noch verwendet.');
    }
    await db.categories.delete(id);
  });
}
