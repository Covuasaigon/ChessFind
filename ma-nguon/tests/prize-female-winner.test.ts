import assert from 'node:assert/strict';
import { calculateCategoryPrizes, type Player, type PrizeRule } from '../lib/chess.ts';

console.log('--- RUNNING ALL 12 PRIZE FEMALE WINNER TEST CASES ---');

const samplePrizes: PrizeRule[] = [
  { rank_from: 1, rank_to: 1, group_name: 'Bảng U10', medal: 'Gold', prize_name: 'Huy chương Vàng & Cúp' },
  { rank_from: 2, rank_to: 2, group_name: 'Bảng U10', medal: 'Silver', prize_name: 'Huy chương Bạc' },
  { rank_from: 3, rank_to: 3, group_name: 'Bảng U10', medal: 'Bronze', prize_name: 'Huy chương Đồng' },
  { rank_from: 4, rank_to: 10, group_name: 'Bảng U10', medal: 'Certificate', prize_name: 'Giải Khuyến Khích' }
];

// CASE 1: Bảng chỉ Nam
const case1Players: Player[] = [
  { id: '1', snr: '1', name: 'A', rank: 1, points: 5, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '2', snr: '2', name: 'B', rank: 2, points: 4, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '3', snr: '3', name: 'C', rank: 3, points: 3, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '4', snr: '4', name: 'D', rank: 4, points: 2, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' }
];
const r1 = calculateCategoryPrizes(case1Players, samplePrizes, 'Bảng U10');
assert.equal(r1.get('1')?.type, 'champion');
assert.equal(r1.get('2')?.type, 'runner_up');
assert.equal(r1.get('3')?.type, 'third_place');
assert.equal(r1.get('4')?.type, 'consolation');
assert.equal(Array.from(r1.values()).some(x => x.type === 'female_winner'), false);
console.log('✓ CASE 1 Passed: Bảng chỉ Nam -> Nhất, Nhì, Ba, KK. Không có Nhất Nữ.');

// CASE 2: Bảng chỉ Nữ
const case2Players: Player[] = [
  { id: '1', snr: '1', name: 'A', rank: 1, points: 5, gender: 'female', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '2', snr: '2', name: 'B', rank: 2, points: 4, gender: 'female', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '3', snr: '3', name: 'C', rank: 3, points: 3, gender: 'female', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '4', snr: '4', name: 'D', rank: 4, points: 2, gender: 'female', ties: {}, rounds: [], detailsLoaded: true, club: '' }
];
const r2 = calculateCategoryPrizes(case2Players, samplePrizes, 'Bảng U10');
assert.equal(r2.get('1')?.type, 'champion');
assert.equal(r2.get('2')?.type, 'runner_up');
assert.equal(r2.get('3')?.type, 'third_place');
assert.equal(r2.get('4')?.type, 'consolation');
assert.equal(Array.from(r2.values()).some(x => x.type === 'female_winner'), false);
console.log('✓ CASE 2 Passed: Bảng chỉ Nữ -> Nhất, Nhì, Ba, KK. Không có Nhất Nữ.');

// CASE 3: Nam rank 1, Nữ rank 2, Nam rank 3, Nam rank 4
const case3Players: Player[] = [
  { id: '1', snr: '1', name: 'A', rank: 1, points: 5, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '2', snr: '2', name: 'B', rank: 2, points: 4, gender: 'female', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '3', snr: '3', name: 'C', rank: 3, points: 3, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '4', snr: '4', name: 'D', rank: 4, points: 2, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' }
];
const r3 = calculateCategoryPrizes(case3Players, samplePrizes, 'Bảng U10');
assert.equal(r3.get('1')?.type, 'champion');
assert.equal(r3.get('2')?.type, 'female_winner');
assert.equal(r3.get('2')?.label, 'Nhất Nữ');
assert.equal(r3.get('3')?.type, 'runner_up');
assert.equal(r3.get('3')?.label, 'Huy chương Bạc');
assert.equal(r3.get('4')?.type, 'third_place');
assert.equal(r3.get('4')?.label, 'Huy chương Đồng');
console.log('✓ CASE 3 Passed: Nam R1 = Nhất, Nữ R2 = Nhất Nữ, Nam R3 = Nhì (HC Bạc), Nam R4 = Ba (HC Đồng).');

// CASE 4: Nữ rank 1, Nam rank 2, Nữ rank 3, Nam rank 4, Nam rank 5
const case4Players: Player[] = [
  { id: '1', snr: '1', name: 'A', rank: 1, points: 5, gender: 'female', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '2', snr: '2', name: 'B', rank: 2, points: 4.5, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '3', snr: '3', name: 'C', rank: 3, points: 4, gender: 'female', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '4', snr: '4', name: 'D', rank: 4, points: 3, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '5', snr: '5', name: 'E', rank: 5, points: 2, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' }
];
const r4 = calculateCategoryPrizes(case4Players, samplePrizes, 'Bảng U10');
assert.equal(r4.get('1')?.type, 'champion');
assert.equal(r4.get('3')?.type, 'female_winner');
assert.equal(r4.get('2')?.type, 'runner_up');
assert.equal(r4.get('4')?.type, 'third_place');
assert.equal(r4.get('5')?.type, 'consolation');
console.log('✓ CASE 4 Passed: Nữ R1 = Nhất, Nữ R3 = Nhất Nữ, Nam R2 = Nhì, Nam R4 = Ba, Nam R5 = KK.');

// CASE 5: Chỉ 1 Nữ và Nữ rank 1
const case5Players: Player[] = [
  { id: '1', snr: '1', name: 'A', rank: 1, points: 5, gender: 'female', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '2', snr: '2', name: 'B', rank: 2, points: 4, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '3', snr: '3', name: 'C', rank: 3, points: 3, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '4', snr: '4', name: 'D', rank: 4, points: 2, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' }
];
const r5 = calculateCategoryPrizes(case5Players, samplePrizes, 'Bảng U10');
assert.equal(r5.get('1')?.type, 'champion');
assert.equal(r5.get('2')?.type, 'runner_up');
assert.equal(r5.get('3')?.type, 'third_place');
assert.equal(r5.get('4')?.type, 'consolation');
assert.equal(Array.from(r5.values()).some(x => x.type === 'female_winner'), false);
console.log('✓ CASE 5 Passed: Nữ R1 = Nhất, Không có Nhất Nữ (chỉ 1 nữ), R2/R3/R4 xét bình thường.');

// CASE 6: Gender unknown rank 1
const case6Players: Player[] = [
  { id: '1', snr: '1', name: 'U', rank: 1, points: 5, gender: 'unknown', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '2', snr: '2', name: 'M', rank: 2, points: 4, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '3', snr: '3', name: 'F', rank: 3, points: 3, gender: 'female', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '4', snr: '4', name: 'M2', rank: 4, points: 2, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' }
];
const r6 = calculateCategoryPrizes(case6Players, samplePrizes, 'Bảng U10');
assert.equal(r6.get('1')?.type, 'champion');
assert.equal(r6.get('3')?.type, 'female_winner');
assert.equal(r6.get('2')?.type, 'runner_up');
assert.equal(r6.get('4')?.type, 'third_place');
console.log('✓ CASE 6 Passed: Unknown R1 = Nhất, Nữ R3 = Nhất Nữ, Nam R2 = Nhì, Nam R4 = Ba.');

// CASE 7: Có unknown nhưng không có female
const case7Players: Player[] = [
  { id: '1', snr: '1', name: 'U', rank: 1, points: 5, gender: 'unknown', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '2', snr: '2', name: 'M', rank: 2, points: 4, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '3', snr: '3', name: 'M2', rank: 3, points: 3, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' }
];
const r7 = calculateCategoryPrizes(case7Players, samplePrizes, 'Bảng U10');
assert.equal(Array.from(r7.values()).some(x => x.type === 'female_winner'), false);
console.log('✓ CASE 7 Passed: Có unknown nhưng không có female -> Không có Nhất Nữ.');

// CASE 8: Có unknown nhưng không có male
const case8Players: Player[] = [
  { id: '1', snr: '1', name: 'U', rank: 1, points: 5, gender: 'unknown', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '2', snr: '2', name: 'F', rank: 2, points: 4, gender: 'female', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '3', snr: '3', name: 'F2', rank: 3, points: 3, gender: 'female', ties: {}, rounds: [], detailsLoaded: true, club: '' }
];
const r8 = calculateCategoryPrizes(case8Players, samplePrizes, 'Bảng U10');
assert.equal(Array.from(r8.values()).some(x => x.type === 'female_winner'), false);
console.log('✓ CASE 8 Passed: Có unknown nhưng không có male -> Không có Nhất Nữ.');

// CASE 9: Bằng điểm nhưng rank khác nhau
const case9Players: Player[] = [
  { id: '1', snr: '1', name: 'A', rank: 1, points: 7, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '2', snr: '2', name: 'B', rank: 2, points: 7, gender: 'female', ties: {}, rounds: [], detailsLoaded: true, club: '' }
];
const r9 = calculateCategoryPrizes(case9Players, samplePrizes, 'Bảng U10');
assert.equal(r9.get('1')?.type, 'champion');
assert.equal(r9.get('2')?.type, 'female_winner');
console.log('✓ CASE 9 Passed: Bằng điểm (7-7) xét theo official rank (R1 trước R2).');

// CASE 10: Không đủ người (Chỉ có 2 người)
const case10Players: Player[] = [
  { id: '1', snr: '1', name: 'A', rank: 1, points: 5, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '2', snr: '2', name: 'B', rank: 2, points: 4, gender: 'female', ties: {}, rounds: [], detailsLoaded: true, club: '' }
];
const r10 = calculateCategoryPrizes(case10Players, samplePrizes, 'Bảng U10');
assert.equal(r10.size, 2);
assert.equal(r10.get('1')?.type, 'champion');
assert.equal(r10.get('2')?.type, 'female_winner');
console.log('✓ CASE 10 Passed: Không đủ người -> Chỉ trao giải cho người hợp lệ, không tạo fake.');

// CASE 11: Có nhiều giải Khuyến khích
const case11Players: Player[] = [
  { id: '1', snr: '1', name: 'A', rank: 1, points: 5, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '2', snr: '2', name: 'B', rank: 2, points: 4.5, gender: 'female', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '3', snr: '3', name: 'C', rank: 3, points: 4, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '4', snr: '4', name: 'D', rank: 4, points: 3.5, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '5', snr: '5', name: 'E', rank: 5, points: 3, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '6', snr: '6', name: 'F', rank: 6, points: 2.5, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' }
];
const r11 = calculateCategoryPrizes(case11Players, samplePrizes, 'Bảng U10');
assert.equal(r11.get('1')?.type, 'champion'); // R1 (A) = Nhất
assert.equal(r11.get('2')?.type, 'female_winner'); // R2 (B) = Nhất Nữ
assert.equal(r11.get('3')?.type, 'runner_up'); // R3 (C) = Nhì
assert.equal(r11.get('4')?.type, 'third_place'); // R4 (D) = Ba
assert.equal(r11.get('5')?.type, 'consolation'); // R5 (E) = KK 1
assert.equal(r11.get('6')?.type, 'consolation'); // R6 (F) = KK 2
console.log('✓ CASE 11 Passed: Nhiều giải KK -> trao lần lượt cho người chưa có giải theo official rank.');

// CASE 12: Nữ rank 2 đã nhận Nhất Nữ -> KHÔNG nhận thêm Nhì bảng
const case12Players: Player[] = [
  { id: '1', snr: '1', name: 'A', rank: 1, points: 5, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '2', snr: '2', name: 'B', rank: 2, points: 4, gender: 'female', ties: {}, rounds: [], detailsLoaded: true, club: '' },
  { id: '3', snr: '3', name: 'C', rank: 3, points: 3, gender: 'male', ties: {}, rounds: [], detailsLoaded: true, club: '' }
];
const r12 = calculateCategoryPrizes(case12Players, samplePrizes, 'Bảng U10');
assert.equal(r12.get('2')?.type, 'female_winner');
assert.equal(r12.get('2')?.label, 'Nhất Nữ');
assert.notEqual(r12.get('2')?.type, 'runner_up');
assert.equal(r12.get('3')?.type, 'runner_up'); // R3 nhận Nhì bảng
console.log('✓ CASE 12 Passed: Nữ R2 nhận Nhất Nữ -> KHÔNG nhận thêm Nhì bảng; R3 Nam nhận Nhì bảng.');

console.log('\n🎉 ALL 12 TEST CASES PASSED PERFECTLY!');
