const assert = require('node:assert/strict')
const test = require('node:test')
require('./_ts.cjs')

const { folderAccess, canModifyItem, canManageRoot, canWriteInto } = require('../src/lib/drive/access.ts')
const { folderPermsSchema } = require('../src/lib/drive/permission-schema.ts')

const base = { userId: 'u', rootOwnerId: 'o' }

test('ADMIN은 메뉴권한', () => assert.equal(folderAccess({ ...base, role: 'ADMIN', menuAccess: 'WRITE', userPerm: null }), 'WRITE'))
test('소유자는 메뉴권한', () => assert.equal(folderAccess({ ...base, rootOwnerId: 'u', role: 'USER', menuAccess: 'READ', userPerm: null }), 'READ'))
test('행 없으면 NONE', () => assert.equal(folderAccess({ ...base, role: 'USER', menuAccess: 'WRITE', userPerm: null }), 'NONE'))
test('메뉴 READ + 폴더 WRITE → READ', () => assert.equal(folderAccess({ ...base, role: 'USER', menuAccess: 'READ', userPerm: 'WRITE' }), 'READ'))
test('메뉴 WRITE + 폴더 READ → READ', () => assert.equal(folderAccess({ ...base, role: 'USER', menuAccess: 'WRITE', userPerm: 'READ' }), 'READ'))

const mod = { userId: 'u', role: 'USER', rootOwnerId: 'o' }
test('남의 항목 + WRITE → false', () => assert.equal(canModifyItem({ ...mod, access: 'WRITE', creatorId: 'x' }), false))
test('내 항목 + WRITE → true', () => assert.equal(canModifyItem({ ...mod, access: 'WRITE', creatorId: 'u' }), true))
test('루트 소유자 → true', () => assert.equal(canModifyItem({ ...mod, rootOwnerId: 'u', access: 'WRITE', creatorId: 'x' }), true))
test('ADMIN → true', () => assert.equal(canModifyItem({ ...mod, role: 'ADMIN', access: 'WRITE', creatorId: 'x' }), true))
test('READ → false', () => assert.equal(canModifyItem({ ...mod, access: 'READ', creatorId: 'u' }), false))
test('canModifyItem ADMIN + READ → false', () => assert.equal(canModifyItem({ ...mod, role: 'ADMIN', access: 'READ', creatorId: 'x' }), false))
test('canModifyItem 루트 소유자 + READ → false', () => assert.equal(canModifyItem({ ...mod, rootOwnerId: 'u', access: 'READ', creatorId: 'x' }), false))

test('포트폴리오 → false', () => assert.equal(canManageRoot({ userId: 'u', role: 'ADMIN', rootOwnerId: 'u', isPortfolio: true }), false))
test('canManageRoot ADMIN → true', () => assert.equal(canManageRoot({ userId: 'u', role: 'ADMIN', rootOwnerId: 'o', isPortfolio: false }), true))
test('비소유자 → false', () => assert.equal(canManageRoot({ userId: 'u', role: 'USER', rootOwnerId: 'o', isPortfolio: false }), false))
test('canManageRoot 사용자 소유자 → true', () => assert.equal(canManageRoot({ userId: 'u', role: 'USER', rootOwnerId: 'u', isPortfolio: false }), true))

test('READ는 쓰기 불가', () => assert.equal(canWriteInto('READ'), false))

test('사용자 없는 행 거부', () => assert.equal(folderPermsSchema.safeParse([{ userId: '', access: 'READ' }]).success, false))
test('NONE은 저장 값이 아님', () => assert.equal(folderPermsSchema.safeParse([{ userId: 'u1', access: 'NONE' }]).success, false))
test('사용자 중복 거부', () => assert.equal(folderPermsSchema.safeParse([{ userId: 'u1', access: 'READ' }, { userId: 'u1', access: 'WRITE' }]).success, false))
test('잘못된 access 거부', () => assert.equal(folderPermsSchema.safeParse([{ userId: 'u1', access: 'ALL' }]).success, false))
test('빈 배열 허용(비공개)', () => assert.equal(folderPermsSchema.safeParse([]).success, true))

const { toggleShare } = require('../src/lib/drive/permission-schema.ts')
test('toggleShare: 쓰기를 켜면 읽기 포함 WRITE', () => assert.deepEqual(toggleShare([], 'u1', 'WRITE', true), [{ userId: 'u1', access: 'WRITE' }]))
test('toggleShare: 쓰기를 끄면 READ로', () => assert.deepEqual(toggleShare([{ userId: 'u1', access: 'WRITE' }], 'u1', 'WRITE', false), [{ userId: 'u1', access: 'READ' }]))
test('toggleShare: 읽기를 끄면 공유 해제', () => assert.deepEqual(toggleShare([{ userId: 'u1', access: 'WRITE' }], 'u1', 'READ', false), []))
test('toggleShare: 읽기를 켜도 기존 WRITE 유지', () => assert.deepEqual(toggleShare([{ userId: 'u1', access: 'WRITE' }], 'u1', 'READ', true), [{ userId: 'u1', access: 'WRITE' }]))
test('toggleShare: 다른 사용자는 그대로', () => assert.deepEqual(toggleShare([{ userId: 'u2', access: 'READ' }], 'u1', 'READ', true), [{ userId: 'u2', access: 'READ' }, { userId: 'u1', access: 'READ' }]))
