require('./_ts.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { parseSshEndpoint, buildForwardCommand } = require('../src/lib/ssh/target.ts')

test('IP만 있으면 22번 포트', () => assert.deepEqual(parseSshEndpoint(' 10.0.0.1 '), { host: '10.0.0.1', port: 22 }))
test('host:port 형식은 포트를 분리', () => assert.deepEqual(parseSshEndpoint('db.local:2222'), { host: 'db.local', port: 2222 }))
test('범위 밖 포트는 host로 취급', () => assert.deepEqual(parseSshEndpoint('h:70000'), { host: 'h:70000', port: 22 }))
test('IPv6는 그대로', () => assert.deepEqual(parseSshEndpoint('::1'), { host: '::1', port: 22 }))

const row = (localPort, remotePort, remoteHost = '') => ({ localPort, remoteHost, remotePort })

test('포워딩 명령: 여러 포트를 -L 로 묶고 원격 호스트 기본값은 127.0.0.1', () => {
  assert.equal(
    buildForwardCommand('ubuntu', '10.0.0.1', [row('15432', '5432'), row('16379', '6379', 'redis.internal')]),
    'ssh -N -L 15432:127.0.0.1:5432 -L 16379:redis.internal:6379 ubuntu@10.0.0.1',
  )
})
test('포워딩 명령: 22번이 아닌 SSH 포트는 -p 로', () => {
  assert.equal(
    buildForwardCommand('tester', 'host:2222', [row('15000', '80')]),
    'ssh -N -p 2222 -L 15000:127.0.0.1:80 tester@host',
  )
})
test('포워딩 명령: 미완성·잘못된 행은 빼고, 남는 게 없으면 null', () => {
  assert.equal(buildForwardCommand('u', 'h', [row('', '80'), row('0', '80'), row('abc', '80')]), null)
  assert.equal(buildForwardCommand('u', 'h', [row('8080', '80'), row('9090', '')]), 'ssh -N -L 8080:127.0.0.1:80 u@h')
})
test('포워딩 명령: IPv6 원격 호스트는 대괄호', () => {
  assert.equal(buildForwardCommand('u', 'h', [row('8080', '80', '::1')]), 'ssh -N -L 8080:[::1]:80 u@h')
})
