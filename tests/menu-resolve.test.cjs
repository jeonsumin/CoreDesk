const assert = require('node:assert/strict')
const test = require('node:test')
require('./_ts.cjs')

const { resolveMenuAccess, buildMenuTree, filterVisibleMenus, canDeleteMenu, reorderSiblings } = require('../src/lib/menu/resolve.ts')

const m = (id, path, perms = {}, extra = {}) => ({ id, title: id, type: 'PAGE', path, icon: 'Folder', parentId: null,
  sortOrder: 0, status: 'ACTIVE', isSystem: false, section: null,
  permissions: Object.entries(perms).map(([role, access]) => ({ role, access })), ...extra })
const menus = [
  m('projects', '/projects', { MEMBER: 'READ', VIEWER: 'NONE' }),
  m('pdetail', '/projects/archive', { MEMBER: 'NONE' }),
  m('sys', '/system/users', {}, { isSystem: true }),
  m('ext', 'https://wiki.example.com', { MEMBER: 'READ' }, { type: 'LINK' }),
]
test('ADMIN은 항상 WRITE', () => assert.equal(resolveMenuAccess(menus, 'ADMIN', '/system/users'), 'WRITE'))
test('정확히 일치', () => assert.equal(resolveMenuAccess(menus, 'MEMBER', '/projects'), 'READ'))
test('하위 경로는 상위 메뉴를 따름', () => assert.equal(resolveMenuAccess(menus, 'MEMBER', '/projects/abc/settings'), 'READ'))
test('가장 긴 경로 우선', () => assert.equal(resolveMenuAccess(menus, 'MEMBER', '/projects/archive/1'), 'NONE'))
test('경로 구분 단위 매칭', () => assert.equal(resolveMenuAccess(menus, 'VIEWER', '/projectsx'), 'WRITE'))
test('미등록 경로는 WRITE', () => assert.equal(resolveMenuAccess(menus, 'VIEWER', '/my-tasks'), 'WRITE'))
test('isSystem은 비ADMIN NONE', () => assert.equal(resolveMenuAccess(menus, 'MANAGER', '/system/users'), 'NONE'))
test('권한 행 없으면 NONE', () => assert.equal(resolveMenuAccess(menus, 'MANAGER', '/projects'), 'NONE'))
test('LINK는 경로 매칭 대상 아님', () => assert.equal(resolveMenuAccess(menus, 'MEMBER', 'https://wiki.example.com'), 'WRITE'))

const g = m('grp', null, {}, { type: 'GROUP', sortOrder: 1 })
const tree = buildMenuTree([
  m('b', '/b', { MEMBER: 'WRITE' }, { sortOrder: 2 }),
  m('a', '/a', { MEMBER: 'NONE' }, { sortOrder: 0 }),
  g,
  m('c1', '/c1', { MEMBER: 'NONE' }, { parentId: 'grp', sortOrder: 0 }),
])
test('buildMenuTree 정렬·중첩', () => {
  assert.deepEqual(tree.map((n) => n.id), ['a', 'grp', 'b'])
  assert.deepEqual(tree[1].children.map((n) => n.id), ['c1'])
})
test('filterVisibleMenus: NONE 제거 + 빈 그룹 제거', () =>
  assert.deepEqual(filterVisibleMenus(tree, 'MEMBER').map((n) => n.id), ['b']))
test('filterVisibleMenus: ADMIN은 전부', () =>
  assert.deepEqual(filterVisibleMenus(tree, 'ADMIN').map((n) => n.id), ['a', 'grp', 'b']))
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
