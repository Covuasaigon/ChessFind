import assert from 'node:assert';
import { getMedal, type PrizeRule } from '../lib/chess.ts';

const prizes: PrizeRule[] = [
  { rank_from: 1, rank_to: 1, group_name: 'Bảng U11 Nam', medal: 'Gold', prize_name: 'Huy chương Vàng' },
  { rank_from: 2, rank_to: 2, group_name: 'Bảng U11 Nam', medal: 'Silver', prize_name: 'Huy chương Bạc' },
  { rank_from: 3, rank_to: 3, group_name: 'Bảng U11 Nam', medal: 'Bronze', prize_name: 'Huy chương Đồng' },
  { rank_from: 4, rank_to: 5, group_name: 'Bảng U11 Nam', medal: 'Certificate', prize_name: 'Giải Khuyến Khích' }
];

// Mandatory Test Cases:
// Rank 1 -> Huy chương Vàng
const r1 = getMedal(1, 'Bảng U11 Nam', prizes);
assert.notEqual(r1, null);
assert.equal(r1?.medal, '🥇');
assert.equal(r1?.label, 'Huy chương Vàng');
console.log('✓ Case Rank 1 passed: 🥇 Huy chương Vàng');

// Rank 2 -> Huy chương Bạc
const r2 = getMedal(2, 'Bảng U11 Nam', prizes);
assert.notEqual(r2, null);
assert.equal(r2?.medal, '🥈');
assert.equal(r2?.label, 'Huy chương Bạc');
console.log('✓ Case Rank 2 passed: 🥈 Huy chương Bạc');

// Rank 3 -> Huy chương Đồng
const r3 = getMedal(3, 'Bảng U11 Nam', prizes);
assert.notEqual(r3, null);
assert.equal(r3?.medal, '🥉');
assert.equal(r3?.label, 'Huy chương Đồng');
console.log('✓ Case Rank 3 passed: 🥉 Huy chương Đồng');

// Rank 4 -> Giải Khuyến Khích
const r4 = getMedal(4, 'Bảng U11 Nam', prizes);
assert.notEqual(r4, null);
assert.equal(r4?.medal, '🎖');
assert.equal(r4?.label, 'Giải Khuyến Khích');
console.log('✓ Case Rank 4 passed: 🎖 Giải Khuyến Khích');

// Rank 5 -> Giải Khuyến Khích
const r5 = getMedal(5, 'Bảng U11 Nam', prizes);
assert.notEqual(r5, null);
assert.equal(r5?.medal, '🎖');
assert.equal(r5?.label, 'Giải Khuyến Khích');
console.log('✓ Case Rank 5 passed: 🎖 Giải Khuyến Khích');

// Rank 6 (ngoài cơ cấu) -> null (Chưa đạt giải / Không đạt giải)
const r6 = getMedal(6, 'Bảng U11 Nam', prizes);
assert.equal(r6, null);
console.log('✓ Case Rank 6 (ngoài cơ cấu) passed: null (Không đạt giải)');

console.log('\n✅ ALL MANDATORY PRIZE PREDICTION TESTS PASSED SUCCESSFULLY!');
