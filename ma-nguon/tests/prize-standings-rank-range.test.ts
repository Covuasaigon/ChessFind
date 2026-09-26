import assert from "node:assert/strict";
import { getPredictedPrizeForRank } from "../lib/chess";

type PrizeRule = {
    rankFrom: number;
    rankTo: number;
    medal: string;
    prizeName: string;
    group_name?: string;
};

const prizeRules: PrizeRule[] = [
    {
        rankFrom: 1,
        rankTo: 1,
        medal: "Gold Medal",
        prizeName: "Cúp Vô Địch + Huy Chương Vàng",
        group_name: "Tất cả",
    },
    {
        rankFrom: 2,
        rankTo: 2,
        medal: "Silver Medal",
        prizeName: "Huy Chương Bạc",
        group_name: "Tất cả",
    },
    {
        rankFrom: 3,
        rankTo: 4,
        medal: "Bronze Medal",
        prizeName: "Huy Chương Đồng",
        group_name: "Tất cả",
    },
    {
        rankFrom: 5,
        rankTo: 10,
        medal: "Other",
        prizeName: "Khuyến khích",
        group_name: "Tất cả",
    },
];


function checkRank(rank: number, expected: string) {
    const result = getPredictedPrizeForRank(
        rank,
        "Bảng U5",
        prizeRules as any
    );

    assert.ok(result, `Rank ${rank} phải có giải`);

    assert.equal(
        result.fullTitle,
        expected,
        `Rank ${rank} sai giải`
    );
}


// ================================
// CASE 1: Khoảng hạng cơ bản
// ================================

console.log("CASE 1: Rank range");

checkRank(
    1,
    "Cúp Vô Địch + Huy Chương Vàng"
);

checkRank(
    2,
    "Huy Chương Bạc"
);

checkRank(
    3,
    "Huy Chương Đồng"
);

checkRank(
    4,
    "Huy Chương Đồng"
);

checkRank(
    5,
    "Khuyến khích"
);

checkRank(
    10,
    "Khuyến khích"
);


// ================================
// CASE 2: Ngoài vùng giải thưởng
// ================================

console.log("CASE 2: Outside range");

const rank11 =
    getPredictedPrizeForRank(
        11,
        "Bảng U5",
        prizeRules as any
    );

assert.equal(
    rank11,
    null
);


// ================================
// CASE 3: Nhiều bảng U5/U6/U7
// ================================

console.log("CASE 3: Multiple groups");


const groups = [
    "Bảng U5",
    "Bảng U6",
    "Bảng U7",
];


for (const group of groups) {

    const gold =
        getPredictedPrizeForRank(
            1,
            group,
            prizeRules as any
        );

    assert.equal(
        gold?.fullTitle,
        "Cúp Vô Địch + Huy Chương Vàng",
        `${group} rank 1 lỗi`
    );


    const silver =
        getPredictedPrizeForRank(
            2,
            group,
            prizeRules as any
        );

    assert.equal(
        silver?.fullTitle,
        "Huy Chương Bạc",
        `${group} rank 2 lỗi`
    );


    const bronze =
        getPredictedPrizeForRank(
            3,
            group,
            prizeRules as any
        );

    assert.equal(
        bronze?.fullTitle,
        "Huy Chương Đồng",
        `${group} rank 3 lỗi`
    );


    const kk =
        getPredictedPrizeForRank(
            8,
            group,
            prizeRules as any
        );

    assert.equal(
        kk?.fullTitle,
        "Khuyến khích",
        `${group} rank 8 lỗi`
    );
}


// ================================
// CASE 4: Không phụ thuộc group
// ================================

console.log("CASE 4: Ignore group matching");


const u6 =
    getPredictedPrizeForRank(
        1,
        "Bảng U6 Nam",
        prizeRules as any
    );


const u7 =
    getPredictedPrizeForRank(
        1,
        "Bảng U7 Nữ",
        prizeRules as any
    );


assert.equal(
    u6?.fullTitle,
    u7?.fullTitle
);


// ================================
// DONE
// ================================

console.log(
    "✅ prize-standings-rank-range.test.ts PASSED"
);