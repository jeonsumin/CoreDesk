const assert = require('node:assert/strict')
const test = require('node:test')
require('./_ts.cjs')

const { resolveMenuPermission, buildMenuTree, filterVisibleMenus, canDeleteMenu, reorderSiblings } = require('../src/lib/menu/resolve.ts')

const FULL = { read: true, create: true, update: true, delete: true }
const NONE = { read: false, create: false, update: false, delete: false }
const READ = { ...NONE, read: true }
const perm = (groupId, p) => ({ groupId, canRead: p.read, canCreate: p.create, canUpdate: p.update, canDelete: p.delete })
const m = (id, path, perms = {}, extra = {}) => ({ id, title: id, type: 'PAGE', path, icon: 'Folder', parentId: null,
  sortOrder: 0, status: 'ACTIVE', isSystem: false, section: null,
  permissions: Object.entries(perms).map(([groupId, p]) => perm(groupId, p)), ...extra })
const admin = { role: 'ADMIN', groupId: null }
const dev = { role: 'USER', groupId: 'dev' }
const guest = { role: 'USER', groupId: 'guest' }
const noGroup = { role: 'USER', groupId: null }
const menus = [
  m('projects', '/projects', { dev: { ...READ, create: true }, guest: NONE }),
  m('pdetail', '/projects/archive', { dev: NONE }),
  m('sys', '/system/users', {}, { isSystem: true }),
  m('ext', 'https://wiki.example.com', { dev: READ }, { type: 'LINK' }),
]
const r = (viewer, path) => resolveMenuPermission(menus, viewer, path)
test('최고 관리자는 항상 전부', () => assert.deepEqual(r(admin, '/system/users'), FULL))
test('그룹 권한 그대로', () => assert.deepEqual(r(dev, '/projects'), { ...READ, create: true }))
test('하위 경로는 상위 메뉴를 따름', () => assert.deepEqual(r(dev, '/projects/abc/settings'), { ...READ, create: true }))
test('가장 긴 경로 우선', () => assert.deepEqual(r(dev, '/projects/archive/1'), NONE))
test('경로 구분 단위 매칭', () => assert.deepEqual(r(guest, '/projectsx'), FULL))
test('미등록 경로는 전부 허용', () => assert.deepEqual(r(guest, '/my-tasks'), FULL))
test('시스템 메뉴는 사용자에게 없음', () => assert.deepEqual(r(dev, '/system/users'), NONE))
test('권한 행 없는 그룹은 없음', () => assert.deepEqual(r(guest, '/projects/archive'), NONE))
test('그룹 없는 사용자는 등록 메뉴 없음', () => assert.deepEqual(r(noGroup, '/projects'), NONE))
test('LINK는 경로 매칭 대상 아님', () => assert.deepEqual(r(dev, 'https://wiki.example.com'), FULL))

const g = m('grp', null, {}, { type: 'GROUP', sortOrder: 1 })
const tree = buildMenuTree([
  m('b', '/b', { dev: READ }, { sortOrder: 2 }),
  m('a', '/a', { dev: NONE }, { sortOrder: 0 }),
  g,
  m('c1', '/c1', { dev: { ...NONE, create: true } }, { parentId: 'grp', sortOrder: 0 }),
])
test('buildMenuTree 정렬·중첩', () => {
  assert.deepEqual(tree.map((n) => n.id), ['a', 'grp', 'b'])
  assert.deepEqual(tree[1].children.map((n) => n.id), ['c1'])
})
test('filterVisibleMenus: 읽기 없으면 숨김 + 빈 그룹 제거', () =>
  assert.deepEqual(filterVisibleMenus(tree, dev).map((n) => n.id), ['b']))
test('filterVisibleMenus: 최고 관리자는 전부', () =>
  assert.deepEqual(filterVisibleMenus(tree, admin).map((n) => n.id), ['a', 'grp', 'b']))
test('canDeleteMenu', () => {
  assert.deepEqual(canDeleteMenu({ isSystem: false }, 0), { ok: true })
  assert.deepEqual(canDeleteMenu({ isSystem: false }, 2), { ok: false, error: '하위 메뉴를 먼저 옮기거나 삭제하세요' })
  assert.deepEqual(canDeleteMenu({ isSystem: true }, 0), { ok: false, error: '시스템 메뉴는 삭제할 수 없습니다' })
})
test('reorderSiblings: 중복 sortOrder에서도 한 칸 이동', () => {
  const s = [{ id: 'x', sortOrder: 0 }, { id: 'y', sortOrder: 0 }, { id: 'z', sortOrder: 5 }]
  assert.deepEqual(reorderSiblings(s, 'z', 'up'), [{ id: 'y', sortOrder: 2 }, { id: 'z', sortOrder: 1 }])
})
test('reorderSiblings: 경계는 []', () => {
  const s = [{ id: 'x', sortOrder: 0 }, { id: 'y', sortOrder: 1 }]
  assert.deepEqual(reorderSiblings(s, 'x', 'up'), [])
  assert.deepEqual(reorderSiblings(s, 'y', 'down'), [])
})

const { togglePermission } = require('../src/lib/menu/resolve.ts')
test('togglePermission: 쓰기·수정·삭제를 켜면 읽기도 켜짐', () =>
  assert.deepEqual(togglePermission(NONE, 'update', true), { ...NONE, read: true, update: true }))
test('togglePermission: 읽기를 끄면 전부 꺼짐', () =>
  assert.deepEqual(togglePermission(FULL, 'read', false), NONE))
test('togglePermission: 나머지 하나만 끄기', () =>
  assert.deepEqual(togglePermission(FULL, 'delete', false), { ...FULL, delete: false }))
