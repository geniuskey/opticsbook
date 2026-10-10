const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../chapters/aberration.html'), 'utf8');
const loopStart = source.indexOf('      const infl = [];');
const loopEnd = source.indexOf('      const [pa, pb] = split(w, h);', loopStart);
assert(loopStart >= 0 && loopEnd > loopStart);
const detector = new Function('rm', 'dz', 'kap',
  'const NS = 200, slope = []; let smax = 0;\n' + source.slice(loopStart, loopEnd) + 'return infl;');
const context = {};
vm.createContext(context);
vm.runInContext(source.match(/  function sagConic[^\n]+/)[0], context);
const asphereSource = source.slice(source.indexOf('Sim 8: 짝수차 비구면'));
const presets = new Function('return ' + asphereSource.match(/    const PRE = (\{[\s\S]*?\n    \});/)[1])();
function roots(preset) {
  const [c, k, A4, A6, A8, rm] = preset;
  const z = r => context.sagConic(c, k, r) + A4 * r ** 4 + A6 * r ** 6 + A8 * r ** 8;
  const dz = r => (z(r + 1e-4) - z(r - 1e-4)) / 2e-4;
  const kap = r => (z(r + 1e-3) - 2 * z(r) + z(r - 1e-3)) / 1e-6 / (1 + dz(r) ** 2) ** 1.5;
  return detector(rm, dz, kap);
}
const gull = roots(presets.gull);
assert.equal(gull.length, 2);
assert(Math.abs(gull[0] - 0.86056) < 1e-3);
assert(Math.abs(gull[1] - 2.51230) < 1e-3);
assert.equal(roots(presets.l1).length, 0);
assert.equal(roots(presets.sph).length, 0);
for (const kap of [() => 0, () => 2, r => r * r, r => (r - 1.2) ** 2]) {
  assert.equal(detector(2, () => 0, kap).length, 0);
}
const zeroCrossing = detector(2, () => 0, r => r - 1.2);
assert.equal(zeroCrossing.length, 1);
assert(Math.abs(zeroCrossing[0] - 1.2) < 1e-12);
assert.equal(detector(2, () => 0, r => r < 0.9 ? -1 : r > 1.1 ? 1 : NaN).length, 0);
assert.equal(detector(2, r => r > 0.9 && r < 1.1 ? NaN : 0, r => r - 1).length, 0);
const zeroPlateau = detector(2, () => 0, r => r < 0.9 ? -1 : r > 1.1 ? 1 : 0);
assert.equal(zeroPlateau.length, 1);
assert(Math.abs(zeroPlateau[0] - 1) < 1e-12);
assert.equal(detector(2, () => 0, r => r < 0.9 || r > 1.1 ? 1 : 0).length, 0);
console.log('Passed: actual inflection detector presets, zero crossings/touches/plateaus, invalid intervals.');
