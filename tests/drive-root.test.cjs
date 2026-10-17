const assert = require('node:assert/strict')
const test = require('node:test')
require('./_ts.cjs')

const { computeRootIds } = require('../src/lib/drive/root.ts')

test('루트는 null', () => assert.equal(computeRootIds([{ id: 'a', parentId: null }]).get('a'), null))
test('손자는 최상위', () => {
  const r = computeRootIds([{ id: 'a', parentId: null }, { id: 'b', parentId: 'a' }, { id: 'c', parentId: 'b' }])
  assert.equal(r.get('b'), 'a'); assert.equal(r.get('c'), 'a')
})
test('부모 누락 고아는 null', () => assert.equal(computeRootIds([{ id: 'x', parentId: 'gone' }]).get('x'), null))
test('순환은 null', () => {
  const r = computeRootIds([{ id: 'p', parentId: 'q' }, { id: 'q', parentId: 'p' }])
  assert.equal(r.get('p'), null)
})
