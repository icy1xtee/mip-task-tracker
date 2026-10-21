import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const rules = readFileSync('firestore.rules', 'utf8');
// Берём первый UID из allowlist в самих правилах — тест не зависит от конкретного значения.
const MEMBER = /uid in \[\s*'([^']+)'/.exec(rules)?.[1] ?? '';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-mip',
    firestore: { rules, host: '127.0.0.1', port: 8080 },
  });
});

afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const member = () => env.authenticatedContext(MEMBER).firestore();
const stranger = () => env.authenticatedContext('someone-else').firestore();
const anonymous = () => env.unauthenticatedContext().firestore();
const now = () => ({ createdAt: serverTimestamp(), updatedAt: serverTimestamp() });

const task = {
  title: 'Оплатить коммуналку',
  description: null,
  dueDate: '2026-10-25',
  estimatedCostMinor: 700000,
  assignee: null,
  isCompleted: false,
};

describe('доступ', () => {
  it('allowlist содержит UID', () => {
    if (!MEMBER) throw new Error('В firestore.rules не найден UID в allowlist');
  });

  it('без входа нельзя ни читать, ни писать', async () => {
    await assertFails(getDoc(doc(anonymous(), 'tasks/t1')));
    await assertFails(setDoc(doc(anonymous(), 'tasks/t1'), { ...task, ...now() }));
  });

  it('вошедший пользователь не из allowlist ничего не видит', async () => {
    await assertFails(getDoc(doc(stranger(), 'tasks/t1')));
    await assertFails(setDoc(doc(stranger(), 'tasks/t1'), { ...task, ...now() }));
  });

  it('неизвестные коллекции закрыты даже для участника', async () => {
    await assertFails(setDoc(doc(member(), 'secrets/x'), { a: 1 }));
    await assertFails(getDoc(doc(member(), 'appSettings/main')));
  });
});

describe('tasks', () => {
  it('участник создаёт, меняет и удаляет корректное дело', async () => {
    const ref = doc(member(), 'tasks/t1');
    await assertSucceeds(setDoc(ref, { ...task, ...now() }));
    await assertSucceeds(updateDoc(ref, { isCompleted: true, updatedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(ref));
  });

  it('отклоняет лишние и пропущенные поля, дробные копейки и клиентское время', async () => {
    const ref = doc(member(), 'tasks/t1');
    await assertFails(setDoc(ref, { ...task, priority: 'high', ...now() }));
    const { assignee: _drop, ...missing } = task;
    await assertFails(setDoc(ref, { ...missing, ...now() }));
    await assertFails(setDoc(ref, { ...task, estimatedCostMinor: 10.5, ...now() }));
    await assertFails(setDoc(ref, { ...task, dueDate: '25.10.2026', ...now() }));
    await assertFails(
      setDoc(ref, { ...task, createdAt: Timestamp.now(), updatedAt: Timestamp.now() }),
    );
    await assertFails(setDoc(ref, { ...task, title: '', ...now() }));
  });

  it('разделы: список до 10 штук; старые дела без поля tags по-прежнему обновляются', async () => {
    const db = member();
    await assertSucceeds(
      setDoc(doc(db, 'tasks/t1'), { ...task, tags: ['Медицина', 'Деньги'], ...now() }),
    );
    await assertFails(setDoc(doc(db, 'tasks/t2'), { ...task, tags: 'Медицина', ...now() }));
    await assertFails(
      setDoc(doc(db, 'tasks/t3'), {
        ...task,
        tags: Array.from({ length: 11 }, (_, i) => `t${i}`),
        ...now(),
      }),
    );
    const legacy = doc(db, 'tasks/legacy');
    await assertSucceeds(setDoc(legacy, { ...task, ...now() }));
    await assertSucceeds(updateDoc(legacy, { isCompleted: true, updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(legacy, { tags: ['Дом'], updatedAt: serverTimestamp() }));
  });

  it('createdAt нельзя переписать при обновлении', async () => {
    const ref = doc(member(), 'tasks/t1');
    await assertSucceeds(setDoc(ref, { ...task, ...now() }));
    await assertFails(
      updateDoc(ref, { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
    );
  });
});

describe('activities и links', () => {
  const idea = {
    title: 'Концерт',
    description: null,
    url: 'https://example.com',
    estimatedCostMinor: 0,
    status: 'wishlist',
    needsBooking: true,
    plannedDate: null,
  };

  it('принимает идею и отклоняет небезопасный URL и неизвестный статус', async () => {
    await assertSucceeds(setDoc(doc(member(), 'activities/a1'), { ...idea, ...now() }));
    await assertFails(
      setDoc(doc(member(), 'activities/a2'), { ...idea, url: 'javascript:alert(1)', ...now() }),
    );
    await assertFails(
      setDoc(doc(member(), 'activities/a3'), { ...idea, status: 'maybe', ...now() }),
    );
  });

  it('ссылка обязана быть http(s)', async () => {
    const link = {
      title: 'Notion',
      url: 'https://notion.so',
      description: null,
      type: 'workspace',
      tags: [],
    };
    await assertSucceeds(setDoc(doc(member(), 'links/l1'), { ...link, ...now() }));
    await assertFails(
      setDoc(doc(member(), 'links/l2'), { ...link, url: 'data:text/html,x', ...now() }),
    );
    await assertFails(setDoc(doc(member(), 'links/l3'), { ...link, type: 'video', ...now() }));
  });
});

describe('бюджет', () => {
  const entry = {
    title: 'Коммуналка',
    type: 'expense',
    amountMinor: 700000,
    accountId: 'acc',
    category: 'housing',
    note: null,
  };

  it('счёт: знаковый целый баланс и дата фиксации', async () => {
    const account = {
      name: 'Кредитка',
      type: 'credit',
      openingBalanceMinor: -1845000,
      balanceAsOfDate: '2026-10-20',
    };
    await assertSucceeds(setDoc(doc(member(), 'accounts/a1'), { ...account, ...now() }));
    await assertFails(
      setDoc(doc(member(), 'accounts/a2'), { ...account, openingBalanceMinor: -18450.5, ...now() }),
    );
  });

  it('суммы операций — только положительные целые', async () => {
    await assertSucceeds(
      setDoc(doc(member(), 'plannedEntries/p1'), {
        ...entry,
        date: '2026-10-25',
        status: 'planned',
        ...now(),
      }),
    );
    await assertFails(
      setDoc(doc(member(), 'plannedEntries/p2'), {
        ...entry,
        amountMinor: -700000,
        date: '2026-10-25',
        status: 'planned',
        ...now(),
      }),
    );
    const tx = { ...entry, date: '2026-10-25', plannedEntryId: 'p1', recurringOccurrenceId: null };
    delete (tx as Partial<typeof tx>).title;
    await assertSucceeds(setDoc(doc(member(), 'transactions/t1'), { ...tx, ...now() }));
    await assertFails(
      setDoc(doc(member(), 'transactions/t2'), { ...tx, amountMinor: 0, ...now() }),
    );
  });

  it('регулярное правило: окончание не раньше начала', async () => {
    const rule = {
      ...entry,
      frequency: 'monthly',
      startDate: '2026-01-31',
      endDate: null,
      dayOfMonth: 31,
    };
    await assertSucceeds(setDoc(doc(member(), 'recurringRules/r1'), { ...rule, ...now() }));
    await assertFails(
      setDoc(doc(member(), 'recurringRules/r2'), { ...rule, endDate: '2025-12-31', ...now() }),
    );
    await assertFails(
      setDoc(doc(member(), 'recurringRules/r3'), { ...rule, dayOfMonth: 32, ...now() }),
    );
  });

  it('экземпляр повтора: id строго «ruleId_дата», чтобы не было дублей', async () => {
    const occ = {
      ruleId: 'r1',
      date: '2026-10-31',
      status: 'completed',
      actualTransactionId: 't1',
    };
    await assertSucceeds(
      setDoc(doc(member(), 'recurringOccurrences/r1_2026-10-31'), { ...occ, ...now() }),
    );
    await assertFails(
      setDoc(doc(member(), 'recurringOccurrences/random-id'), { ...occ, ...now() }),
    );
  });
});

describe('места', () => {
  const place = {
    provider: 'osm',
    providerPlaceId: 'N1309605858',
    name: 'Stereobar',
    address: 'Дворцовая набережная, 38',
    city: 'Санкт-Петербург',
    latitude: 59.9404625,
    longitude: 30.3151887,
    category: 'bar',
    status: 'visited',
    note: null,
  };
  const visit = {
    placeId: 'p1',
    date: '2026-09-14',
    spentMinor: 684000,
    pavelRating: 8,
    milaRating: 9,
    pavelReturnScore: 7,
    milaReturnScore: 10,
    note: 'Хороший звук',
  };

  it('без входа и не из allowlist места не читаются', async () => {
    await assertFails(getDoc(doc(anonymous(), 'places/p1')));
    await assertFails(getDoc(doc(stranger(), 'places/p1')));
    await assertFails(getDoc(doc(stranger(), 'placeVisits/v1')));
  });

  it('место OSM и ручная точка', async () => {
    await assertSucceeds(setDoc(doc(member(), 'places/p1'), { ...place, ...now() }));
    await assertSucceeds(
      setDoc(doc(member(), 'places/p2'), {
        ...place,
        provider: 'manual',
        providerPlaceId: null,
        latitude: 60,
        ...now(),
      }),
    );
    // У ручной точки нет внешнего id, у OSM-места он обязателен и в формате «N123».
    await assertFails(
      setDoc(doc(member(), 'places/p3'), { ...place, provider: 'manual', ...now() }),
    );
    await assertFails(
      setDoc(doc(member(), 'places/p4'), { ...place, providerPlaceId: null, ...now() }),
    );
    await assertFails(
      setDoc(doc(member(), 'places/p5'), { ...place, providerPlaceId: 'ChIJ123', ...now() }),
    );
  });

  it('отклоняет координаты вне диапазона, неизвестную категорию и лишние поля', async () => {
    await assertFails(setDoc(doc(member(), 'places/p1'), { ...place, latitude: 91, ...now() }));
    await assertFails(
      setDoc(doc(member(), 'places/p1'), { ...place, longitude: '30.3', ...now() }),
    );
    await assertFails(setDoc(doc(member(), 'places/p1'), { ...place, category: 'spa', ...now() }));
    await assertFails(
      setDoc(doc(member(), 'places/p1'), { ...place, status: 'favorite', ...now() }),
    );
    await assertFails(
      setDoc(doc(member(), 'places/p1'), { ...place, googleData: { rating: 4.5 }, ...now() }),
    );
  });

  it('посещение: только к существующему месту, оценки — целые 1–10', async () => {
    await assertFails(setDoc(doc(member(), 'placeVisits/v0'), { ...visit, ...now() }));
    await assertSucceeds(setDoc(doc(member(), 'places/p1'), { ...place, ...now() }));
    await assertSucceeds(setDoc(doc(member(), 'placeVisits/v1'), { ...visit, ...now() }));
    await assertFails(
      setDoc(doc(member(), 'placeVisits/v2'), { ...visit, pavelRating: 11, ...now() }),
    );
    await assertFails(
      setDoc(doc(member(), 'placeVisits/v3'), { ...visit, milaRating: 8.5, ...now() }),
    );
    await assertFails(
      setDoc(doc(member(), 'placeVisits/v4'), { ...visit, spentMinor: 100.5, ...now() }),
    );
    await assertSucceeds(
      setDoc(doc(member(), 'placeVisits/v5'), {
        ...visit,
        spentMinor: null,
        pavelRating: null,
        milaRating: null,
        pavelReturnScore: null,
        milaReturnScore: null,
        note: null,
        ...now(),
      }),
    );
  });

  it('место и первое посещение создаются одним batch', async () => {
    const db = member();
    const batch = writeBatch(db);
    batch.set(doc(db, 'places/p9'), { ...place, ...now() });
    batch.set(doc(db, 'placeVisits/v9'), { ...visit, placeId: 'p9', ...now() });
    await assertSucceeds(batch.commit());
  });

  it('посещение нельзя перенести к другому месту', async () => {
    await assertSucceeds(setDoc(doc(member(), 'places/p1'), { ...place, ...now() }));
    await assertSucceeds(setDoc(doc(member(), 'places/p2'), { ...place, ...now() }));
    const ref = doc(member(), 'placeVisits/v1');
    await assertSucceeds(setDoc(ref, { ...visit, ...now() }));
    await assertSucceeds(updateDoc(ref, { milaRating: 10, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { placeId: 'p2', updatedAt: serverTimestamp() }));
  });
});
