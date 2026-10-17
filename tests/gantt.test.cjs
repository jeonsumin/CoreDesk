
const assert = require('node:assert/strict')
const test = require('node:test')

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'CommonJS',
    moduleResolution: 'node',
  },
})

const {
  buildGanttModel,
  getWeekOfMonth,
} = require('../src/lib/projects/gantt')

test('builds a daily gantt model with inclusive bars, today, and milestone status', () => {
  const model = buildGanttModel(
    [
      {
        id: 'planning',
        title: '기획 확정',
        startDate: '2026-01-03',
        dueDate: '2026-01-05',
        isCompleted: false,
      },
      {
        id: 'release',
        title: 'MVP 릴리즈',
        startDate: null,
        dueDate: '2026-01-01',
        isCompleted: false,
      },
      {
        id: 'qa',
        title: 'QA 완료',
        startDate: '2025-12-29',
        dueDate: '2025-12-31',
        isCompleted: true,
      },
    ],
    { today: new Date('2026-01-02T12:00:00.000Z'), minDays: 21 },
  )

  assert.equal(model.rows.length, 3)
  assert.equal(model.todayIndex >= 0, true)
  assert.equal(model.days.length >= 21, true)

  const planning = model.rows.find((row) => row.id === 'planning')
  assert.ok(planning)
  assert.equal(planning.spanDays, 3)
  assert.equal(planning.endIndex - planning.startIndex + 1, 3)
  assert.equal(planning.status, 'dueSoon')
  assert.equal(planning.dDayLabel, 'D-3')

  const release = model.rows.find((row) => row.id === 'release')
  assert.ok(release)
  assert.equal(release.isPoint, true)
  assert.equal(release.status, 'overdue')
  assert.equal(release.dDayLabel, 'D+1 초과')

  assert.deepEqual(model.stats, {
    total: 3,
    completed: 1,
    overdue: 1,
    dueSoon: 1,
  })
})

test('rows keep input order and undated items get no bar', () => {
  const model = buildGanttModel(
    [
      { id: 'late', title: 'late', startDate: '2026-02-01', dueDate: '2026-02-03', isCompleted: false },
      { id: 'undated', title: 'undated', startDate: null, dueDate: null, isCompleted: false },
      { id: 'early', title: 'early', startDate: null, dueDate: '2026-01-10', isCompleted: false },
    ],
    { today: new Date('2026-01-02T12:00:00.000Z') },
  )
  assert.deepEqual(model.rows.map((row) => row.id), ['late', 'undated', 'early'])
  const undated = model.rows[1]
  assert.equal(undated.hasBar, false)
  assert.equal(undated.status, 'unscheduled')
  assert.equal(model.rows[0].hasBar, true)
})

test('numbers weeks within a month starting on Monday', () => {
  // 2026-06-01 is a Monday, 2026-07-01 is a Wednesday
  assert.equal(getWeekOfMonth(new Date('2026-06-01T00:00:00Z')), 1)
  assert.equal(getWeekOfMonth(new Date('2026-06-22T00:00:00Z')), 4)
  assert.equal(getWeekOfMonth(new Date('2026-06-29T00:00:00Z')), 5)
  assert.equal(getWeekOfMonth(new Date('2026-07-05T00:00:00Z')), 1)
  assert.equal(getWeekOfMonth(new Date('2026-07-06T00:00:00Z')), 2)
})
