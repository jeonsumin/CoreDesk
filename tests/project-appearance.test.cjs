
const assert = require('node:assert/strict')
const test = require('node:test')

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'CommonJS',
    moduleResolution: 'node',
  },
})

const { projectColor } = require('../src/lib/projects/appearance')

test('assigns a stable tailwind color per project id', () => {
  assert.equal(projectColor('seed-project-1'), projectColor('seed-project-1'))
  assert.match(projectColor('abc'), /^bg-[a-z]+-\d{3}$/)
})
