import { TransactionManager } from "@/components/transaction-manager";
import { prisma } from "@/lib/prisma";
import { createExpense, deleteExpense, updateExpense } from "./actions";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const expenses = await prisma.expense.findMany({ orderBy: [{ date: "desc" }, { id: "desc" }] });

  return (
    <TransactionManager
      title="Gastos"
      newLabel="+ Novo gasto"
      emptyLabel="Nenhum gasto cadastrado."
      records={expenses.map((expense) => ({
        id: expense.id,
        name: expense.name,
        unitValue: expense.unitValue.toString(),
        quantity: expense.quantity,
        totalValue: expense.totalValue.toString(),
        date: expense.date.toISOString(),
      }))}
      createAction={createExpense}
      updateAction={updateExpense}
      deleteAction={deleteExpense}
    />
  );
}
