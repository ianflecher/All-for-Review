import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Transaction, TransactionKind } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { FormModal, Field, ChipRow } from '../components/FormModal';
import { DateField } from '../components/DateField';
import { colors, radius, spacing, typography, card, shadow } from '../theme';
import { showAlert } from '../utils/alert';
import { useAndroidBack } from '../utils/useAndroidBack';
import { loadJson, saveJson, STORAGE_KEYS } from '../utils/storage';
import { formatDateLabel, isValidDate, toISODate, todayISO } from '../utils/datetime';
import { CURRENCY, formatMoney, parseAmount } from '../utils/money';

interface WalletScreenProps {
  onBack: () => void;
}

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'School', 'Load', 'Fun', 'Other'];
const INCOME_CATEGORIES = ['Allowance', 'Gift', 'Work', 'Other'];

/** Monday of the current week, as an ISO date, for the weekly spend total. */
function startOfWeekISO(): string {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((now.getDay() + 6) % 7));
  return toISODate(monday);
}

export const WalletScreen: React.FC<WalletScreenProps> = ({ onBack }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [formOpen, setFormOpen] = useState(false);

  const [kind, setKind] = useState<TransactionKind>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    loadJson<Transaction[]>(STORAGE_KEYS.transactions, []).then(setTransactions);
  }, []);

  const persist = useCallback((next: Transaction[]) => {
    setTransactions(next);
    saveJson(STORAGE_KEYS.transactions, next);
  }, []);

  const closeForm = useCallback(() => setFormOpen(false), []);

  useAndroidBack(
    useCallback(() => {
      if (formOpen) {
        closeForm();
        return true;
      }
      onBack();
      return true;
    }, [formOpen, closeForm, onBack])
  );

  const totals = useMemo(() => {
    const weekStart = startOfWeekISO();
    let income = 0;
    let spent = 0;
    let spentThisWeek = 0;

    for (const item of transactions) {
      if (item.kind === 'income') {
        income += item.amount;
      } else {
        spent += item.amount;
        if (item.date >= weekStart) spentThisWeek += item.amount;
      }
    }
    return { income, spent, balance: income - spent, spentThisWeek };
  }, [transactions]);

  const byCategory = useMemo(() => {
    const totalsByCategory = new Map<string, number>();
    for (const item of transactions) {
      if (item.kind !== 'expense') continue;
      totalsByCategory.set(item.category, (totalsByCategory.get(item.category) ?? 0) + item.amount);
    }
    return [...totalsByCategory.entries()].sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  /** Newest first, grouped under one heading per day. */
  const grouped = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      return byDate !== 0 ? byDate : b.id.localeCompare(a.id);
    });

    const days: { date: string; items: Transaction[] }[] = [];
    for (const item of sorted) {
      const last = days[days.length - 1];
      if (last && last.date === item.date) last.items.push(item);
      else days.push({ date: item.date, items: [item] });
    }
    return days;
  }, [transactions]);

  const categories = kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const switchKind = (next: TransactionKind) => {
    setKind(next);
    setCategory((next === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES)[0]);
  };

  const openNew = () => {
    setKind('expense');
    setAmount('');
    setCategory(EXPENSE_CATEGORIES[0]);
    setNote('');
    setDate(todayISO());
    setFormOpen(true);
  };

  const parsedAmount = parseAmount(amount);
  const amountError =
    amount.trim().length === 0 || parsedAmount !== null
      ? undefined
      : 'Enter an amount greater than zero';
  const dateError = isValidDate(date) ? undefined : 'Use the format YYYY-MM-DD';
  const canSave = parsedAmount !== null && !dateError;

  const submit = () => {
    if (parsedAmount === null || !canSave) return;
    const created: Transaction = {
      id: `${Date.now()}`,
      kind,
      amount: parsedAmount,
      category,
      note: note.trim() || undefined,
      date,
    };
    persist([created, ...transactions]);
    closeForm();
  };

  const remove = (item: Transaction) => {
    showAlert(
      'Delete entry',
      `Remove ${formatMoney(item.amount)} from ${item.category}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => persist(transactions.filter((t) => t.id !== item.id)),
        },
      ]
    );
  };

  const maxCategory = byCategory.length > 0 ? byCategory[0][1] : 0;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Allowance"
        subtitle="Money in and out"
        onBack={onBack}
        accent={colors.accentQuiz}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>BALANCE LEFT</Text>
          <Text style={[styles.balanceValue, totals.balance < 0 && styles.balanceNegative]}>
            {formatMoney(totals.balance)}
          </Text>
          <View style={styles.balanceSplit}>
            <View style={styles.balanceHalf}>
              <Text style={styles.balanceHalfLabel}>Received</Text>
              <Text style={styles.balanceHalfValue}>{formatMoney(totals.income)}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceHalf}>
              <Text style={styles.balanceHalfLabel}>Spent</Text>
              <Text style={styles.balanceHalfValue}>{formatMoney(totals.spent)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.weekCard}>
          <Text style={styles.weekLabel}>Spent since Monday</Text>
          <Text style={styles.weekValue}>{formatMoney(totals.spentThisWeek)}</Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={openNew} activeOpacity={0.85}>
          <Text style={styles.addButtonText}>+ Add entry</Text>
        </TouchableOpacity>

        {transactions.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptyText}>
              Log your allowance when you receive it and each thing you spend on. The balance and
              weekly total update as you go.
            </Text>
          </View>
        )}

        {byCategory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>WHERE IT GOES</Text>
            <View style={styles.breakdownCard}>
              {byCategory.map(([name, value]) => (
                <View key={name} style={styles.breakdownRow}>
                  <View style={styles.breakdownHead}>
                    <Text style={styles.breakdownName}>{name}</Text>
                    <Text style={styles.breakdownValue}>{formatMoney(value)}</Text>
                  </View>
                  <View style={styles.breakdownTrack}>
                    <View
                      style={[
                        styles.breakdownFill,
                        { width: `${maxCategory > 0 ? (value / maxCategory) * 100 : 0}%` },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {grouped.map((day) => (
          <View key={day.date} style={styles.section}>
            <Text style={styles.sectionTitle}>{formatDateLabel(day.date).toUpperCase()}</Text>
            {day.items.map((item) => (
              <View key={item.id} style={styles.row}>
                <View
                  style={[
                    styles.rowIcon,
                    item.kind === 'income' ? styles.rowIconIncome : styles.rowIconExpense,
                  ]}
                >
                  <Text style={styles.rowIconText}>{item.kind === 'income' ? '↓' : '↑'}</Text>
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowCategory}>{item.category}</Text>
                  {item.note ? (
                    <Text style={styles.rowNote} numberOfLines={1}>
                      {item.note}
                    </Text>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.rowAmount,
                    item.kind === 'income' ? styles.rowAmountIncome : styles.rowAmountExpense,
                  ]}
                >
                  {item.kind === 'income' ? '+' : '−'}
                  {formatMoney(item.amount)}
                </Text>
                <TouchableOpacity onPress={() => remove(item)} style={styles.deleteButton}>
                  <Text style={styles.deleteText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <FormModal
        visible={formOpen}
        title="New entry"
        submitLabel="Add"
        submitDisabled={!canSave}
        onSubmit={submit}
        onClose={closeForm}
      >
        <View style={styles.kindRow}>
          <TouchableOpacity
            style={[styles.kindButton, kind === 'expense' && styles.kindButtonActive]}
            onPress={() => switchKind('expense')}
          >
            <Text style={[styles.kindText, kind === 'expense' && styles.kindTextActive]}>
              Spent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.kindButton, kind === 'income' && styles.kindButtonActive]}
            onPress={() => switchKind('income')}
          >
            <Text style={[styles.kindText, kind === 'income' && styles.kindTextActive]}>
              Received
            </Text>
          </TouchableOpacity>
        </View>

        <Field
          label={`AMOUNT (${CURRENCY})`}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={amountError}
        />
        <ChipRow label="CATEGORY" options={categories} selected={category} onSelect={setCategory} />
        <DateField label="DATE" value={date} onChange={setDate} />
        <Field
          label="NOTE (OPTIONAL)"
          value={note}
          onChangeText={setNote}
          placeholder="e.g. lunch at the canteen"
        />
      </FormModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },

  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow(2),
  },
  balanceLabel: { ...typography.micro, color: colors.onPrimaryMuted, letterSpacing: 1 },
  balanceValue: { fontSize: 34, fontWeight: '800', color: colors.onPrimary, marginTop: spacing.sm },
  balanceNegative: { color: '#ffd7d7' },
  balanceSplit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    width: '100%',
  },
  balanceHalf: { flex: 1, alignItems: 'center' },
  balanceHalfLabel: { ...typography.micro, color: colors.onPrimaryMuted, fontWeight: '400' },
  balanceHalfValue: { ...typography.bodyStrong, color: colors.onPrimary, marginTop: 2 },
  balanceDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.25)' },

  weekCard: {
    ...card(1),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  weekLabel: { ...typography.caption, color: colors.textSecondary },
  weekValue: { ...typography.subheading, color: colors.textPrimary },

  addButton: {
    backgroundColor: colors.primaryDark,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    ...shadow(2),
  },
  addButtonText: { ...typography.bodyStrong, color: colors.onPrimary, fontSize: 16 },

  section: { marginTop: spacing.xxl },
  sectionTitle: {
    ...typography.micro,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    letterSpacing: 0.4,
  },

  breakdownCard: { ...card(1), padding: spacing.lg, gap: spacing.md },
  breakdownRow: { gap: 6 },
  breakdownHead: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownName: { ...typography.caption, color: colors.textPrimary },
  breakdownValue: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  breakdownTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
  },
  breakdownFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.pill },

  row: {
    ...card(1),
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowIconIncome: { backgroundColor: colors.successSoft },
  rowIconExpense: { backgroundColor: colors.dangerSoft },
  rowIconText: { fontSize: 14, fontWeight: '800', color: colors.textSecondary },
  rowBody: { flex: 1 },
  rowCategory: { ...typography.bodyStrong, color: colors.textPrimary },
  rowNote: { ...typography.micro, color: colors.textMuted, fontWeight: '400', marginTop: 2 },
  rowAmount: { ...typography.bodyStrong },
  rowAmountIncome: { color: colors.success },
  rowAmountExpense: { color: colors.danger },
  deleteButton: { paddingLeft: spacing.md, paddingVertical: spacing.xs },
  deleteText: { fontSize: 13 },

  kindRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  kindButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kindButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  kindText: { ...typography.bodyStrong, color: colors.textSecondary },
  kindTextActive: { color: colors.onPrimary },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: spacing.lg },
  emptyIcon: { fontSize: 46, marginBottom: spacing.md, opacity: 0.5 },
  emptyTitle: { ...typography.subheading, color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
