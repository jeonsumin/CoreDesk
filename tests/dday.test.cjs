/* eslint-disable @typescript-eslint/no-require-imports */

const assert = require('node:assert/strict')
const test = require('node:test')

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'CommonJS',
    moduleResolution: 'node',
  },
})

const { getDday } = require('../src/lib/tasks/dday')

const DAY = 86400000
const now = new Date('2026-10-17T09:00:00Z').getTime()

test('overdue dates are danger with "D+N 초과" label', () => {
  assert.deepEqual(getDday(new Date(now - 2 * DAY), now), { label: 'D+2 초과', tone: 'danger' })
})

test('D-3 or less is warning', () => {
  assert.deepEqual(getDday(new Date(now + 3 * DAY), now), { label: 'D-3', tone: 'warning' })
  assert.deepEqual(getDday(new Date(now + 1 * 3600000), now), { label: 'D-1', tone: 'warning' })
})

test('further than D-3 is neutral', () => {
  assert.deepEqual(getDday(new Date(now + 4 * DAY), now), { label: 'D-4', tone: 'neutral' })
})
