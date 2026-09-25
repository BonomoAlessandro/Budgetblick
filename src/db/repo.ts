import type { Expense, Income, RecurringExpense } from '../types';
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
