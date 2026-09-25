import assert from 'node:assert';
import { getPrizeBadge, type PrizeRule } from '../lib/chess.ts';

console.log('=== RUNNING PRIZE BADGE STANDINGS TEST SUITE ===\n');

// -------------------------------------------------------------
// TEST CASE 1: Standard structure
// 1-1 HCV, 2-2 HCB, 3-3 HCĐ, 4-5 KK
// -------------------------------------------------------------
console.log('Test Case 1: Standard Prize Structure');
const case1Prizes: PrizeRule[] = [
  { rank_from: 1, rank_to: 1, group_name: 'U5', medal: 'Gold', prize_name: 'Cúp Vô Địch + Huy Chương Vàng' },
  { rank_from: 2, rank_to: 2, group_name: 'U5', medal: 'Silver', prize_name: 'Huy Chương Bạc' },
  { rank_from: 3, rank_to: 3, group_name: 'U5', medal: 'Bronze', prize_name: 'Huy Chương Đồng' },
  { rank_from: 4, rank_to: 5, group_name: 'U5', medal: 'Consolation', prize_name: 'Giải Khuyến Khích' }
];

const r1_1 = getPrizeBadge(1, 'U5', case1Prizes);
assert.notEqual(r1_1, null);
assert.equal(r1_1?.icon, '🥇');
assert.equal(r1_1?.shortLabel, 'HCV');
assert.equal(r1_1?.fullTitle, 'Cúp Vô Địch + Huy Chương Vàng');
assert.equal(r1_1?.type, 'gold');
console.log('  ✓ Rank 1 -> 🥇 HCV (Cúp Vô Địch + Huy Chương Vàng)');

const r1_2 = getPrizeBadge(2, 'U5', case1Prizes);
assert.notEqual(r1_2, null);
assert.equal(r1_2?.icon, '🥈');
assert.equal(r1_2?.shortLabel, 'HCB');
assert.equal(r1_2?.fullTitle, 'Huy Chương Bạc');
assert.equal(r1_2?.type, 'silver');
console.log('  ✓ Rank 2 -> 🥈 HCB (Huy Chương Bạc)');

const r1_3 = getPrizeBadge(3, 'U5', case1Prizes);
assert.notEqual(r1_3, null);
assert.equal(r1_3?.icon, '🥉');
assert.equal(r1_3?.shortLabel, 'HCĐ');
assert.equal(r1_3?.fullTitle, 'Huy Chương Đồng');
assert.equal(r1_3?.type, 'bronze');
console.log('  ✓ Rank 3 -> 🥉 HCĐ (Huy Chương Đồng)');

const r1_4 = getPrizeBadge(4, 'U5', case1Prizes);
assert.notEqual(r1_4, null);
assert.equal(r1_4?.icon, '🎖');
assert.equal(r1_4?.shortLabel, 'KK');
assert.equal(r1_4?.fullTitle, 'Giải Khuyến Khích');
assert.equal(r1_4?.type, 'encouragement');
console.log('  ✓ Rank 4 -> 🎖 KK (Giải Khuyến Khích)');

const r1_5 = getPrizeBadge(5, 'U5', case1Prizes);
assert.notEqual(r1_5, null);
assert.equal(r1_5?.icon, '🎖');
assert.equal(r1_5?.shortLabel, 'KK');
assert.equal(r1_5?.fullTitle, 'Giải Khuyến Khích');
assert.equal(r1_5?.type, 'encouragement');
console.log('  ✓ Rank 5 -> 🎖 KK (Giải Khuyến Khích)');

const r1_6 = getPrizeBadge(6, 'U5', case1Prizes);
assert.equal(r1_6, null);
console.log('  ✓ Rank 6 -> null (outside range)');


// -------------------------------------------------------------
// TEST CASE 2: Custom Admin structure
// 1-1 HCV, 2-3 HCB, 4-6 KK
// -------------------------------------------------------------
console.log('\nTest Case 2: Custom Admin Structure (2-3 HCB, 4-6 KK)');
const case2Prizes: PrizeRule[] = [
  { rank_from: 1, rank_to: 1, group_name: 'Open', medal: 'Gold', prize_name: 'Huy Chương Vàng' },
  { rank_from: 2, rank_to: 3, group_name: 'Open', medal: 'Silver', prize_name: 'Huy Chương Bạc' },
  { rank_from: 4, rank_to: 6, group_name: 'Open', medal: 'Consolation', prize_name: 'Giải Khuyến Khích' }
];

assert.equal(getPrizeBadge(1, 'Open', case2Prizes)?.shortLabel, 'HCV');
assert.equal(getPrizeBadge(2, 'Open', case2Prizes)?.shortLabel, 'HCB');
assert.equal(getPrizeBadge(3, 'Open', case2Prizes)?.shortLabel, 'HCB');
assert.equal(getPrizeBadge(4, 'Open', case2Prizes)?.shortLabel, 'KK');
assert.equal(getPrizeBadge(5, 'Open', case2Prizes)?.shortLabel, 'KK');
assert.equal(getPrizeBadge(6, 'Open', case2Prizes)?.shortLabel, 'KK');
assert.equal(getPrizeBadge(7, 'Open', case2Prizes), null);
console.log('  ✓ Case 2 passed: Custom ranges 1(HCV), 2-3(HCB), 4-6(KK), 7+(none)');


// -------------------------------------------------------------
// TEST CASE 3: No Prize Structure Configured
// -------------------------------------------------------------
console.log('\nTest Case 3: No Prize Structure Configured');
assert.equal(getPrizeBadge(1, 'U5', []), null);
assert.equal(getPrizeBadge(1, 'U5', undefined), null);
console.log('  ✓ Case 3 passed: Empty prizes array produces null (no crash, no default badges)');


// -------------------------------------------------------------
// TEST CASE 4: Multiple Groups with Different Structures
// -------------------------------------------------------------
console.log('\nTest Case 4: Multiple Groups with Separate Structures');
const multiGroupPrizes: PrizeRule[] = [
  { rank_from: 1, rank_to: 1, group_name: 'Bảng U5', medal: 'Gold', prize_name: 'Vàng U5' },
  { rank_from: 1, rank_to: 1, group_name: 'Bảng U7', medal: 'Gold', prize_name: 'Vàng U7' }
];

const u5Badge = getPrizeBadge(1, 'Bảng U5', multiGroupPrizes);
const u7Badge = getPrizeBadge(1, 'Bảng U7', multiGroupPrizes);
assert.equal(u5Badge?.fullTitle, 'Vàng U5');
assert.equal(u7Badge?.fullTitle, 'Vàng U7');
console.log('  ✓ Case 4 passed: Correct group-specific prize resolution (U5 vs U7)');


// -------------------------------------------------------------
// TEST CASE 5: Title override for Khuyến khích
// (Admin accidentally selected medal="Gold" for "Giải Khuyến Khích (Bằng khen)")
// -------------------------------------------------------------
console.log('\nTest Case 5: Prize Name Priority for Encouragement');
const case5Prizes: PrizeRule[] = [
  { rank_from: 4, rank_to: 8, group_name: 'U8', medal: 'Gold', prize_name: 'Giải Khuyến Khích (Bằng khen)' }
];

const kkBadge = getPrizeBadge(4, 'U8', case5Prizes);
assert.equal(kkBadge?.icon, '🎖');
assert.equal(kkBadge?.shortLabel, 'KK');
assert.equal(kkBadge?.fullTitle, 'Giải Khuyến Khích (Bằng khen)');
assert.equal(kkBadge?.type, 'encouragement');
console.log('  ✓ Case 5 passed: "Giải Khuyến Khích (Bằng khen)" with Gold medal type renders as 🎖 KK');


// -------------------------------------------------------------
// TEST CASE 6: Rank Outside All Rules
// -------------------------------------------------------------
console.log('\nTest Case 6: Rank Outside All Rules');
assert.equal(getPrizeBadge(99, 'U8', case5Prizes), null);
console.log('  ✓ Case 6 passed: Rank outside any rule returns null');

// -------------------------------------------------------------
// TEST CASE 7: Prompt Section 11 Exact Expected Rules & Ranks
// 1-1 Gold, 2-2 Silver, 3-4 Bronze, 5-10 KK
// -------------------------------------------------------------
console.log('\nTest Case 7: Prompt Section 11 Exact Expected Ranges (1..11)');
const section11Prizes: PrizeRule[] = [
  { rank_from: 1, rank_to: 1, group_name: 'Tất cả', medal: 'Gold Medal', prize_name: 'Cúp Vô Địch + Huy Chương Vàng' },
  { rank_from: 2, rank_to: 2, group_name: 'Tất cả', medal: 'Silver Medal', prize_name: 'Huy Chương Bạc' },
  { rank_from: 3, rank_to: 4, group_name: 'Tất cả', medal: 'Bronze Medal', prize_name: 'Huy Chương Đồng' },
  { rank_from: 5, rank_to: 10, group_name: 'Tất cả', medal: 'Other', prize_name: 'Khuyến khích' }
];

assert.equal(getPrizeBadge(1, 'U5', section11Prizes)?.shortLabel, 'HCV');
assert.equal(getPrizeBadge(2, 'U5', section11Prizes)?.shortLabel, 'HCB');
assert.equal(getPrizeBadge(3, 'U5', section11Prizes)?.shortLabel, 'HCĐ');
assert.equal(getPrizeBadge(4, 'U5', section11Prizes)?.shortLabel, 'HCĐ');
assert.equal(getPrizeBadge(5, 'U5', section11Prizes)?.shortLabel, 'KK');
assert.equal(getPrizeBadge(6, 'U5', section11Prizes)?.shortLabel, 'KK');
assert.equal(getPrizeBadge(7, 'U5', section11Prizes)?.shortLabel, 'KK');
assert.equal(getPrizeBadge(8, 'U5', section11Prizes)?.shortLabel, 'KK');
assert.equal(getPrizeBadge(9, 'U5', section11Prizes)?.shortLabel, 'KK');
assert.equal(getPrizeBadge(10, 'U5', section11Prizes)?.shortLabel, 'KK');
assert.equal(getPrizeBadge(11, 'U5', section11Prizes), null);
console.log('  ✓ Case 7 passed: 1=HCV, 2=HCB, 3=HCĐ, 4=HCĐ, 5-10=KK, 11=null');

// -------------------------------------------------------------
// TEST CASE 8: String rank and string rankFrom/rankTo inputs
// -------------------------------------------------------------
console.log('\nTest Case 8: String rank and rankFrom/rankTo conversion');
const stringPrizes: any[] = [
  { rankFrom: "3", rankTo: "4", group_name: 'Tất cả', medal: 'Bronze Medal', prize_name: 'Huy Chương Đồng' }
];
assert.equal(getPrizeBadge("3", 'U5', stringPrizes)?.shortLabel, 'HCĐ');
console.log('  ✓ Case 8 passed: rank="3", rankFrom="3", rankTo="4" -> HCĐ');

console.log('\n✅ ALL 8 TEST CASES PASSED SUCCESSFULLY!');

