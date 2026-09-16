import assert from 'node:assert';
import { getMedal, matchCategoryGroup, type PrizeRule } from '../lib/chess.ts';

const prizes: PrizeRule[] = [
  { rank_from: 1, rank_to: 1, group_name: 'Bảng U11 Nam', medal: 'Gold', prize_name: 'Huy chương Vàng' },
  { rank_from: 2, rank_to: 2, group_name: 'Bảng U11 Nam', medal: 'Silver', prize_name: 'Huy chương Bạc' },
  { rank_from: 3, rank_to: 3, group_name: 'Bảng U11 Nam', medal: 'Bronze', prize_name: 'Huy chương Đồng' },
  { rank_from: 4, rank_to: 5, group_name: 'Bảng U11 Nam', medal: 'Certificate', prize_name: 'Giải Khuyến Khích' }
];

// Mandatory Test Cases:
// Rank 1 -> Huy chương Vàng
const r1 = getMedal(1, 'Bảng U11 Nam', prizes);
assert.equal(r1.medal, '🥇');
assert.equal(r1.label, 'Huy chương Vàng');
assert.equal(r1.status, 'matched');
console.log('✓ Case Rank 1 passed: 🥇 Huy chương Vàng (matched)');

// Rank 2 -> Huy chương Bạc
const r2 = getMedal(2, 'Bảng U11 Nam', prizes);
assert.equal(r2.medal, '🥈');
assert.equal(r2.label, 'Huy chương Bạc');
assert.equal(r2.status, 'matched');
console.log('✓ Case Rank 2 passed: 🥈 Huy chương Bạc (matched)');

// Rank 3 -> Huy chương Đồng
const r3 = getMedal(3, 'Bảng U11 Nam', prizes);
assert.equal(r3.medal, '🥉');
assert.equal(r3.label, 'Huy chương Đồng');
assert.equal(r3.status, 'matched');
console.log('✓ Case Rank 3 passed: 🥉 Huy chương Đồng (matched)');

// Rank 4 -> Giải Khuyến Khích
const r4 = getMedal(4, 'Bảng U11 Nam', prizes);
assert.equal(r4.medal, '🎖');
assert.equal(r4.label, 'Giải Khuyến Khích');
assert.equal(r4.status, 'matched');
console.log('✓ Case Rank 4 passed: 🎖 Giải Khuyến Khích (matched)');

// Rank 5 -> Giải Khuyến Khích
const r5 = getMedal(5, 'Bảng U11 Nam', prizes);
assert.equal(r5.medal, '🎖');
assert.equal(r5.label, 'Giải Khuyến Khích');
assert.equal(r5.status, 'matched');
console.log('✓ Case Rank 5 passed: 🎖 Giải Khuyến Khích (matched)');

// Rank 6 (ngoài cơ cấu) -> Ngoài phạm vi giải thưởng
const r6 = getMedal(6, 'Bảng U11 Nam', prizes);
assert.equal(r6.label, 'Ngoài phạm vi giải thưởng');
assert.equal(r6.status, 'outside_range');
console.log('✓ Case Rank 6 (ngoài cơ cấu) passed: Ngoài phạm vi giải thưởng (outside_range)');

// Case 7: Không có cơ cấu áp dụng
const rNoRules = getMedal(1, 'Bảng U11 Nam', []);
assert.equal(rNoRules.label, 'Chưa cấu hình giải thưởng');
assert.equal(rNoRules.status, 'no_rules');
console.log('✓ Case Không có cơ cấu: Chưa cấu hình giải thưởng (no_rules)');

// Case 8: Chưa có thứ hạng
const rNoRank = getMedal(null, 'Bảng U11 Nam', prizes);
assert.equal(rNoRank.label, 'Chưa đủ dữ liệu xét giải');
assert.equal(rNoRank.status, 'no_rank');
console.log('✓ Case Chưa có thứ hạng: Chưa đủ dữ liệu xét giải (no_rank)');

// Case 9: Lỗi tải cơ cấu
const rError = getMedal(null, 'Bảng U11 Nam', prizes, { loadError: true });
assert.equal(rError.label, 'Chưa tải được thông tin giải thưởng');
assert.equal(rError.status, 'error');
console.log('✓ Case Lỗi tải cơ cấu: Chưa tải được thông tin giải thưởng (error)');

// Gender Matching Tests
assert.equal(matchCategoryGroup('Bảng U8 Nam', 'Bảng U8 Nữ'), false);
assert.equal(matchCategoryGroup('Bảng U8 Nam', 'Bảng U8 Nam'), true);
assert.equal(matchCategoryGroup('Tất cả các bảng', 'Bảng U8 Nữ'), true);
console.log('✓ Gender mismatch rules verified correctly!');

console.log('\n✅ ALL 5 STATUS CASES & PRIZE PREDICTION TESTS PASSED SUCCESSFULLY!');
