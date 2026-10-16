require('./_ts.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { createUserSchema, updateUserSchema, ROLES } = require('../src/lib/system/user-schema.ts')

const base = { name: '홍길동', email: 'a@b.com', role: 'MEMBER', password: 'secret1' }

test('ROLES는 4개 역할', () => assert.deepEqual([...ROLES], ['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER']))
test('생성: 정상 입력 통과', () => assert.equal(createUserSchema.safeParse(base).success, true))
test('생성: 비밀번호 6자 미만 거부', () =>
  assert.equal(createUserSchema.safeParse({ ...base, password: '12345' }).success, false))
test('생성: 이메일 trim + 소문자', () =>
  assert.equal(createUserSchema.parse({ ...base, email: '  Admin@X.com ' }).email, 'admin@x.com'))
test('생성: 공백뿐인 이름 거부', () =>
  assert.equal(createUserSchema.safeParse({ ...base, name: '   ' }).success, false))
test('생성: 이름 51자 거부', () =>
  assert.equal(createUserSchema.safeParse({ ...base, name: 'a'.repeat(51) }).success, false))
test('생성: 없는 역할 거부', () =>
  assert.equal(createUserSchema.safeParse({ ...base, role: 'ROOT' }).success, false))
test('수정: 빈 비밀번호 허용', () =>
  assert.equal(updateUserSchema.safeParse({ ...base, password: '' }).success, true))
test('수정: 1~5자 비밀번호 거부', () =>
  assert.equal(updateUserSchema.safeParse({ ...base, password: 'abc' }).success, false))
