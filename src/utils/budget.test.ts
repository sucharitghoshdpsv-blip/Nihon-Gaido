import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeBudget, type ExpenseEntry } from './budget';

test('summarizeBudget computes totals, categories, and nominal/warning/over status', () => {
  const entries: ExpenseEntry[] = [
    {
      id: '1',
      title: 'Ichiran Ramen',
      amountJpy: 1480,
      category: 'food',
      city: 'Tokyo',
      date: '2026-11-14',
      createdAt: 1,
    },
    {
      id: '2',
      title: 'Suica Charge',
      amountJpy: 3000,
      category: 'transit',
      city: 'Tokyo',
      date: '2026-11-14',
      createdAt: 2,
    },
    {
      id: '3',
      title: 'Kiyomizu-dera Entry',
      amountJpy: 500,
      category: 'sightseeing',
      city: 'Kyoto',
      date: '2026-11-15',
      createdAt: 3,
    },
  ];

  const summary = summarizeBudget(entries, 10000, 2);
  assert.equal(summary.totalSpentJpy, 4980);
  assert.equal(summary.totalBudgetJpy, 20000);
  assert.equal(summary.remainingJpy, 15020);
  assert.equal(summary.dailyAverageJpy, 2490);
  assert.equal(summary.status, 'nominal');

  const foodCat = summary.categories.find((c) => c.category === 'food');
  assert.equal(foodCat?.totalJpy, 1480);

  const overSummary = summarizeBudget(entries, 1000, 2);
  assert.equal(overSummary.status, 'over');
});
