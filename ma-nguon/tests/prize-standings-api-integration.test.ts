import assert from "node:assert/strict";

import {
    getPredictedPrizeForRank
} from "../lib/chess";


// Giả lập dữ liệu lấy từ API /api/tournaments
// Đây là format frontend thực nhận

const apiPrizeResponse = [
    {
        id: "1",
        tournamentId: "1461992",
        groupName: "Tất cả",

        rankFrom: 1,
        rankTo: 1,

        medal: "Gold Medal",
        prizeName: "Cúp Vô Địch + Huy Chương Vàng",
        description: "Tiền thưởng + Quà tặng",
    },

    {
        id: "2",
        tournamentId: "1461992",
        groupName: "Tất cả",

        rankFrom: 2,
        rankTo: 2,

        medal: "Silver Medal",
        prizeName: "Huy Chương Bạc",
        description: "Tiền thưởng + Bằng khen",
    },

    {
        id: "3",
        tournamentId: "1461992",
        groupName: "Tất cả",

        rankFrom: 3,
        rankTo: 4,

        medal: "Bronze Medal",
        prizeName: "Huy Chương Đồng",
        description: "Tiền thưởng + Bằng khen",
    },

    {
        id: "4",
        tournamentId: "1461992",
        groupName: "Tất cả",

        rankFrom: 5,
        rankTo: 10,

        medal: "Other",
        prizeName: "Khuyến khích",
        description: "Bằng khen + Quà lưu niệm",
    }
];



function assertPrize(
    rank: number,
    expected: string,
    group: string
) {

    const result =
        getPredictedPrizeForRank(
            rank,
            group,
            apiPrizeResponse as any
        );


    assert.ok(
        result,
        `Rank ${rank} phải có giải`
    );


    assert.equal(
        result.fullTitle,
        expected,
        `
Sai giải rank ${rank}

Expected:
${expected}

Actual:
${result.fullTitle}
`
    );
}



// =================================
// CASE 1: Rank 1
// =================================

console.log(
    "CASE 1: Rank 1"
);


assertPrize(
    1,
    "Cúp Vô Địch + Huy Chương Vàng",
    "Bảng U5"
);



// =================================
// CASE 2: Rank 2
// =================================

console.log(
    "CASE 2: Rank 2"
);


assertPrize(
    2,
    "Huy Chương Bạc",
    "Bảng U6"
);



// =================================
// CASE 3: Rank 3-4
// =================================

console.log(
    "CASE 3: Rank 3-4"
);


assertPrize(
    3,
    "Huy Chương Đồng",
    "Bảng U7"
);


assertPrize(
    4,
    "Huy Chương Đồng",
    "Bảng U7"
);



// =================================
// CASE 4: Rank 5-10
// =================================

console.log(
    "CASE 4: Rank 5-10"
);


for (
    let rank = 5;
    rank <= 10;
    rank++
) {

    assertPrize(
        rank,
        "Khuyến khích",
        "Bảng U5"
    );

}



// =================================
// CASE 5:
// nhiều bảng không phụ thuộc group
// =================================


console.log(
    "CASE 5: Multiple groups"
);


const groups = [
    "Bảng U5",
    "Bảng U6",
    "Bảng U7"
];


for (const group of groups) {

    const prize =
        getPredictedPrizeForRank(
            1,
            group,
            apiPrizeResponse as any
        );


    assert.equal(
        prize?.fullTitle,
        "Cúp Vô Địch + Huy Chương Vàng"
    );

}



// =================================
// CASE 6:
// ngoài vùng giải
// =================================

console.log(
    "CASE 6: Outside prize range"
);


const noPrize =
    getPredictedPrizeForRank(
        11,
        "Bảng U5",
        apiPrizeResponse as any
    );


assert.equal(
    noPrize,
    null
);



console.log(
    "\n✅ prize-standings-api-integration.test.ts PASSED"
);