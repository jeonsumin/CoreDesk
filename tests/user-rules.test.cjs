require('./_ts.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { canChangeUser } = require('../src/lib/system/user-rules.ts')

const admin = { id: 'a1', role: 'ADMIN', isActive: true }
const member = { id: 'm1', role: 'MEMBER', isActive: true }

test('자기 비활성화 거부', () =>
  assert.deepEqual(canChangeUser('a1', admin, { isActive: false }, 2),
    { ok: false, error: '자기 자신은 비활성화할 수 없습니다' }))
test('자기 강등 거부', () =>
  assert.deepEqual(canChangeUser('a1', admin, { role: 'MEMBER' }, 2),
    { ok: false, error: '자기 자신의 관리자 권한은 해제할 수 없습니다' }))
test('마지막 활성 ADMIN을 다른 ADMIN이 강등하면 거부', () =>
  assert.deepEqual(canChangeUser('x', { ...admin, id: 'a2' }, { role: 'MANAGER' }, 1),
    { ok: false, error: '활성 관리자가 최소 1명 필요합니다' }))
test('마지막 활성 ADMIN 비활성화 거부', () =>
  assert.equal(canChangeUser('x', { ...admin, id: 'a2' }, { isActive: false }, 1).ok, false))
test('ADMIN이 2명 이상이면 다른 ADMIN 강등 허용', () =>
  assert.deepEqual(canChangeUser('a1', { ...admin, id: 'a2' }, { role: 'MEMBER' }, 2), { ok: true }))
test('일반 사용자 비활성화 허용', () =>
  assert.deepEqual(canChangeUser('a1', member, { isActive: false }, 1), { ok: true }))
test('비활성 ADMIN 재활성화는 개수와 무관하게 허용', () =>
  assert.deepEqual(canChangeUser('a1', { ...admin, id: 'a2', isActive: false }, { isActive: true }, 1), { ok: true }))
test('자기 이름만 바꾸는 패치(빈 patch) 허용', () =>
  assert.deepEqual(canChangeUser('a1', admin, {}, 1), { ok: true }))
