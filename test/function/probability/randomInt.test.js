const assert = require('assert')
const math = require('../../../src/main')

describe('randomInt', function () {
  // Note: randomInt is a convenience function generated by distribution
  // it is tested in distribution.test.js

  it('should have a function randomInt', function () {
    assert.equal(typeof math.randomInt, 'function')
  })

  it('should LaTeX randomInt', function () {
    const expression = math.parse('randomInt(0,100)')
    assert.equal(expression.toTex(), '\\mathrm{randomInt}\\left(0,100\\right)')
  })
})