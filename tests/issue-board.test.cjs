require('./_ts.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { formatIssueKey, normalizeProjectKey } = require('../src/lib/projects/issue-key.ts')
const { buildKanbanBoardModel } = require('../src/lib/projects/kanban-board.ts')
const { buildTimelineRows } = require('../src/lib/projects/issue-timeline.ts')

test('이슈 키: 프로젝트 키-번호, 번호 없으면 null', () => {
  assert.equal(formatIssueKey('BB-CIC-WEB', 6), 'BB-CIC-WEB-6')
  assert.equal(formatIssueKey(null, 6), null)
  assert.equal(formatIssueKey('BB', null), null)
})

test('프로젝트 키: 대문자로 정규화, 형식 위반은 null', () => {
  assert.equal(normalizeProjectKey(' bb-cic-web '), 'BB-CIC-WEB')
  assert.equal(normalizeProjectKey('A'), null) // 2자 미만
  assert.equal(normalizeProjectKey('1AB'), null) // 영문 시작
  assert.equal(normalizeProjectKey('AB-'), null) // 하이픈으로 끝남
  assert.equal(normalizeProjectKey('기획'), null)
})

const issue = (o) => ({
  id: o.id, title: o.title ?? o.id, description: null, type: o.type ?? 'TASK',
  status: o.status ?? 'TODO', priority: 'MEDIUM', epicId: o.epicId ?? null, number: o.number ?? 1,
  startDate: o.startDate ?? null, dueDate: o.dueDate ?? null, assignees: o.assignees ?? [],
})

const sample = [
  issue({ id: 'e1', type: 'EPIC', status: 'IN_PROGRESS' }),
  issue({ id: 'e2', type: 'EPIC' }),
  issue({ id: 'a', epicId: 'e1', status: 'DONE' }),
  issue({ id: 'b', epicId: 'e1', assignees: [{ id: 'u1', name: '이범' }] }),
  issue({ id: 'c', status: 'IN_PROGRESS' }),
]

test('보드: 에픽은 컬럼에 안 들어가고 에픽별 진행률을 계산', () => {
  const model = buildKanbanBoardModel(sample, { today: new Date('2026-07-01') })
  assert.deepEqual(model.columns.map((c) => c.status), ['TODO', 'IN_PROGRESS', 'DONE'])
  assert.deepEqual(model.columns.flatMap((c) => c.tasks.map((t) => t.id)).sort(), ['a', 'b', 'c'])
  const e1 = model.epics.find((e) => e.id === 'e1')
  assert.deepEqual([e1.total, e1.done, e1.progress], [2, 1, 50])
  assert.equal(model.stats.total, 3)
  assert.equal(model.stats.withoutEpic, 1)
})

test('보드: 에픽 필터 (특정 에픽 / 미할당) 와 다중 담당자 필터', () => {
  const ids = (m) => m.columns.flatMap((c) => c.tasks.map((t) => t.id)).sort()
  assert.deepEqual(ids(buildKanbanBoardModel(sample, { filters: { epic: 'e1' } })), ['a', 'b'])
  assert.deepEqual(ids(buildKanbanBoardModel(sample, { filters: { epic: 'none' } })), ['c'])
  assert.deepEqual(ids(buildKanbanBoardModel(sample, { filters: { assigneeId: 'u1' } })), ['b'])
  assert.deepEqual(ids(buildKanbanBoardModel(sample, { filters: { assigneeId: 'unassigned' } })), ['a', 'c'])
})

test('타임라인: 에픽 아래 하위 이슈, 미할당 이슈는 마지막 그룹, 에픽 기간은 비어있으면 하위 이슈로 계산', () => {
  const rows = buildTimelineRows([
    issue({ id: 'e1', type: 'EPIC', number: 1 }),
    issue({ id: 'x', epicId: 'e1', number: 3, startDate: '2026-07-05', dueDate: '2026-07-10' }),
    issue({ id: 'y', epicId: 'e1', number: 2, startDate: '2026-07-01', dueDate: '2026-07-03', status: 'DONE' }),
    issue({ id: 'z', number: 4 }),
  ])
  assert.deepEqual(rows.map((r) => `${r.kind}:${r.id}`), ['epic:e1', 'issue:y', 'issue:x', 'group:none', 'issue:z'])
  const epic = rows[0]
  assert.equal(epic.startDate, '2026-07-01')
  assert.equal(epic.dueDate, '2026-07-10')
  assert.equal(epic.progress, 50)
})
