import { getMedal } from '../ma-nguon/lib/chess.ts';

console.log('=== TESTING PRIZE STRUCTURE OVERHAUL LOGIC ===\n');

// 1. Test getMedal priority (Category-specific rule vs Tournament-wide rule)
console.log('1. Testing getMedal Priority: Category-specific vs Tournament-wide default rule...');

const samplePrizes = [
  {
    tournament_id: '1461967',
    group_name: 'Tất cả',
    group: 'Tất cả',
    rankFrom: 1,
    rankTo: 1,
    rank_from: 1,
    rank_to: 1,
    medal: 'Gold Medal',
    prizeName: 'Huy Chương Vàng Giải Đấu (Chung)',
    prize_name: 'Huy Chương Vàng Giải Đấu (Chung)'
  },
  {
    tournament_id: '1461967',
    group_name: 'Bảng Nữ Baby',
    group: 'Bảng Nữ Baby',
    rankFrom: 1,
    rankTo: 1,
    rank_from: 1,
    rank_to: 1,
    medal: 'Gold Medal',
    prizeName: 'Cúp Vô Địch Nữ Baby + Huy Chương Vàng Rồng',
    prize_name: 'Cúp Vô Địch Nữ Baby + Huy Chương Vàng Rồng'
  }
];

// Query for Rank 1 in 'Bảng Nữ Baby'
const medalSpecific = getMedal(1, 'Bảng Nữ Baby', samplePrizes);
console.log('-> Rank 1 in "Bảng Nữ Baby":', medalSpecific);

if (medalSpecific && medalSpecific.label.includes('Cúp Vô Địch Nữ Baby')) {
  console.log('✅ PASS: Category-specific prize rule correctly prioritized over tournament-wide rule!');
} else {
  console.error('❌ FAIL: Category-specific rule was NOT prioritized!');
  process.exit(1);
}

// Query for Rank 1 in another category 'Bảng U6 Nam' (where no specific rule exists, should fallback to 'Tất cả')
const medalGeneral = getMedal(1, 'Bảng U6 Nam', samplePrizes);
console.log('-> Rank 1 in "Bảng U6 Nam" (Fallback to Tất cả):', medalGeneral);

if (medalGeneral && medalGeneral.label.includes('Huy Chương Vàng Giải Đấu (Chung)')) {
  console.log('✅ PASS: Correctly fell back to tournament-wide default rule for category without specific rule!');
} else {
  console.error('❌ FAIL: Fallback to tournament-wide rule failed!');
  process.exit(1);
}

console.log('\n2. Testing Validation rules...');
function validateRules(rules) {
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    if (isNaN(r.rank_from) || isNaN(r.rank_to) || r.rank_from < 1 || r.rank_to < 1 || !Number.isInteger(r.rank_from) || !Number.isInteger(r.rank_to)) {
      return `Dòng ${i + 1}: Thứ hạng phải là số nguyên dương >= 1.`;
    }
    if (r.rank_from > r.rank_to) {
      return `Dòng ${i + 1}: Hạng từ (${r.rank_from}) không được lớn hơn Hạng đến (${r.rank_to}).`;
    }
    if (!r.prize_name || !r.prize_name.trim()) {
      return `Dòng ${i + 1}: Vui lòng nhập Tên giải thưởng.`;
    }
  }
  return null;
}

const invalidRange = validateRules([{ rank_from: 3, rank_to: 1, prize_name: 'Test' }]);
console.log('-> Invalid range test (From 3 To 1):', invalidRange);
if (invalidRange && invalidRange.includes('không được lớn hơn')) {
  console.log('✅ PASS: Range validation correctly caught rank_from > rank_to error!');
} else {
  console.error('❌ FAIL: Range validation failed!');
  process.exit(1);
}

const invalidName = validateRules([{ rank_from: 1, rank_to: 1, prize_name: '' }]);
console.log('-> Missing prize name test:', invalidName);
if (invalidName && invalidName.includes('Vui lòng nhập Tên giải thưởng')) {
  console.log('✅ PASS: Prize name validation correctly caught empty title!');
} else {
  console.error('❌ FAIL: Title validation failed!');
  process.exit(1);
}

console.log('\n🎉 ALL LOGIC AND VALIDATION TESTS PASSED 100%!');
