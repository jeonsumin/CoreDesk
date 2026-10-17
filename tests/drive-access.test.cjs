/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict')
const test = require('node:test')
require('./_ts.cjs')

const { folderAccess, canModifyItem, canManageRoot, canWriteInto } = require('../src/lib/drive/access.ts')
const { folderPermsSchema } = require('../src/lib/drive/permission-schema.ts')

const base = { userId: 'u', rootOwnerId: 'o' }

test('ADMIN은 메뉴권한', () => assert.equal(folderAccess({ ...base, role: 'ADMIN', menuAccess: 'WRITE', rolePerm: null }), 'WRITE'))
test('소유자는 메뉴권한', () => assert.equal(folderAccess({ ...base, rootOwnerId: 'u', role: 'VIEWER', menuAccess: 'READ', rolePerm: null }), 'READ'))
test('행 없으면 NONE', () => assert.equal(folderAccess({ ...base, role: 'MEMBER', menuAccess: 'WRITE', rolePerm: null }), 'NONE'))
test('메뉴 READ + 폴더 WRITE → READ', () => assert.equal(folderAccess({ ...base, role: 'MEMBER', menuAccess: 'READ', rolePerm: 'WRITE' }), 'READ'))
test('메뉴 WRITE + 폴더 READ → READ', () => assert.equal(folderAccess({ ...base, role: 'MEMBER', menuAccess: 'WRITE', rolePerm: 'READ' }), 'READ'))

const mod = { userId: 'u', role: 'MEMBER', rootOwnerId: 'o' }
test('남의 항목 + WRITE → false', () => assert.equal(canModifyItem({ ...mod, access: 'WRITE', creatorId: 'x' }), false))
test('내 항목 + WRITE → true', () => assert.equal(canModifyItem({ ...mod, access: 'WRITE', creatorId: 'u' }), true))
test('루트 소유자 → true', () => assert.equal(canModifyItem({ ...mod, rootOwnerId: 'u', access: 'WRITE', creatorId: 'x' }), true))
test('ADMIN → true', () => assert.equal(canModifyItem({ ...mod, role: 'ADMIN', access: 'WRITE', creatorId: 'x' }), true))
test('READ → false', () => assert.equal(canModifyItem({ ...mod, access: 'READ', creatorId: 'u' }), false))
test('canModifyItem ADMIN + READ → false', () => assert.equal(canModifyItem({ ...mod, role: 'ADMIN', access: 'READ', creatorId: 'x' }), false))
test('canModifyItem 루트 소유자 + READ → false', () => assert.equal(canModifyItem({ ...mod, rootOwnerId: 'u', access: 'READ', creatorId: 'x' }), false))

test('포트폴리오 → false', () => assert.equal(canManageRoot({ userId: 'u', role: 'ADMIN', rootOwnerId: 'u', isPortfolio: true }), false))
test('canManageRoot ADMIN → true', () => assert.equal(canManageRoot({ userId: 'u', role: 'ADMIN', rootOwnerId: 'o', isPortfolio: false }), true))
test('비소유자 → false', () => assert.equal(canManageRoot({ userId: 'u', role: 'MANAGER', rootOwnerId: 'o', isPortfolio: false }), false))
test('canManageRoot MANAGER 소유자 → true', () => assert.equal(canManageRoot({ userId: 'u', role: 'MANAGER', rootOwnerId: 'u', isPortfolio: false }), true))

test('READ는 쓰기 불가', () => assert.equal(canWriteInto('READ'), false))

test('ADMIN 역할 거부', () => assert.equal(folderPermsSchema.safeParse([{ role: 'ADMIN', access: 'READ' }]).success, false))
test('역할 중복 거부', () => assert.equal(folderPermsSchema.safeParse([{ role: 'MEMBER', access: 'READ' }, { role: 'MEMBER', access: 'WRITE' }]).success, false))
test('잘못된 access 거부', () => assert.equal(folderPermsSchema.safeParse([{ role: 'MEMBER', access: 'ALL' }]).success, false))
test('빈 배열 허용(비공개)', () => assert.equal(folderPermsSchema.safeParse([]).success, true))
