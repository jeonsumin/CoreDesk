/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict')
const test = require('node:test')
require('./_ts.cjs')

const { menuInputSchema, menuCreateSchema } = require('../src/lib/menu/menu-schema.ts')
const page = { type: 'PAGE', title: '내 태스크', parentId: null, path: '/my-tasks', icon: 'ListTodo', status: 'ACTIVE' }
const ok = (v) => menuInputSchema.safeParse(v).success

test('PAGE 정상', () => assert.equal(ok(page), true))
test('PAGE: // 시작 거부', () => assert.equal(ok({ ...page, path: '//evil.com' }), false))
test('PAGE: http URL 거부', () => assert.equal(ok({ ...page, path: 'http://x.com' }), false))
test('PAGE: 끝 / 거부', () => assert.equal(ok({ ...page, path: '/my-tasks/' }), false))
test('PAGE: 공백·?·# 거부', () => {
  for (const p of ['/my tasks', '/a?b=1', '/a#b']) assert.equal(ok({ ...page, path: p }), false)
})
test('PAGE: 예약 경로 거부', () => {
  for (const p of ['/system', '/system/x', '/api', '/api/x', '/login', '/portfolio', '/portfolio/x'])
    assert.equal(ok({ ...page, path: p }), false, p)
})
test('PAGE: /systems 같은 유사 경로는 허용', () => assert.equal(ok({ ...page, path: '/systems' }), true))
test('LINK: https 허용', () => assert.equal(ok({ ...page, type: 'LINK', path: 'https://wiki.example.com/a' }), true))
test('LINK: javascript:/data: 거부', () => {
  for (const p of ['javascript:alert(1)', 'data:text/html,x']) assert.equal(ok({ ...page, type: 'LINK', path: p }), false)
})
test('GROUP: path는 null로 정규화되고 parentId 금지', () => {
  assert.equal(menuInputSchema.parse({ ...page, type: 'GROUP', path: '/whatever' }).path, null)
  assert.equal(ok({ ...page, type: 'GROUP', path: null, parentId: 'g1' }), false)
})
test('이름 trim, 0자·31자 거부', () => {
  assert.equal(menuInputSchema.parse({ ...page, title: '  메모  ' }).title, '메모')
  assert.equal(ok({ ...page, title: '   ' }), false)
  assert.equal(ok({ ...page, title: 'a'.repeat(31) }), false)
})
test('허용 목록 밖 아이콘 거부', () => assert.equal(ok({ ...page, icon: 'Skull' }), false))
test('create: permissions 기본값', () =>
  assert.deepEqual(menuCreateSchema.parse(page).permissions, { MANAGER: 'WRITE', MEMBER: 'WRITE', VIEWER: 'READ' }))
test('section 허용', () => assert.equal(menuInputSchema.parse({ ...page, section: '업무' }).section, '업무'))
test('section 미지정 시 null', () => assert.equal(menuInputSchema.parse(page).section, null))
test('알 수 없는 section 거부', () => assert.equal(ok({ ...page, section: '기타' }), false))
test('하위 메뉴의 section은 null로 정규화', () =>
  assert.equal(menuInputSchema.parse({ ...page, parentId: 'g1', section: '업무' }).section, null))
