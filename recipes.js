// 흔한 외식/일반 음식 칼로리 참고표 (1인분 기준, "먹은 거 기록"에서 자동 매칭용)
const COMMON_FOODS = [
  { name: "흰쌀밥 1공기", calories: 310 },
  { name: "현미밥 1공기", calories: 300 },
  { name: "라면", calories: 500 },
  { name: "김밥 1줄", calories: 480 },
  { name: "떡볶이 1인분", calories: 450 },
  { name: "치킨(후라이드) 3조각", calories: 700 },
  { name: "삼겹살 200g", calories: 600 },
  { name: "짜장면", calories: 700 },
  { name: "짬뽕", calories: 650 },
  { name: "된장찌개", calories: 200 },
  { name: "김치찌개", calories: 250 },
  { name: "순두부찌개", calories: 280 },
  { name: "비빔밥", calories: 550 },
  { name: "냉면", calories: 500 },
  { name: "삼각김밥", calories: 180 },
  { name: "샌드위치", calories: 350 },
  { name: "피자 2조각", calories: 500 },
  { name: "햄버거", calories: 500 },
  { name: "커피(아메리카노)", calories: 10 },
  { name: "라떼", calories: 180 },
  { name: "맥주 500ml", calories: 220 },
  { name: "소주 1잔", calories: 70 },
  { name: "과자 1봉지", calories: 450 },
  { name: "초콜릿 1개", calories: 250 },
  { name: "아이스크림 1개", calories: 200 },
  { name: "바나나 1개", calories: 105 },
  { name: "사과 1개", calories: 95 },
  { name: "고구마 1개", calories: 130 },
  { name: "계란 1개(삶은)", calories: 70 },
  { name: "우유 200ml", calories: 130 },
];

// 재료 마스터 목록 (재고 탭에서 사용)
const INGREDIENT_CATALOG = [
  { name: "계란", cat: "단백질" },
  { name: "닭가슴살", cat: "단백질" },
  { name: "훈제닭가슴살", cat: "단백질" },
  { name: "두부", cat: "단백질" },
  { name: "참치캔", cat: "단백질" },
  { name: "소고기다짐육", cat: "단백질" },
  { name: "오징어(손질)", cat: "단백질" },
  { name: "당근", cat: "채소" },
  { name: "애호박", cat: "채소" },
  { name: "양파", cat: "채소" },
  { name: "오이", cat: "채소" },
  { name: "브로콜리", cat: "채소" },
  { name: "시금치", cat: "채소" },
  { name: "단호박", cat: "채소" },
  { name: "방울토마토", cat: "채소" },
  { name: "김치", cat: "채소" },
  { name: "대파", cat: "채소" },
  { name: "새우(손질)", cat: "단백질" },
  { name: "연어(손질)", cat: "단백질" },
  { name: "조개(손질)", cat: "단백질" },
  { name: "낙지(손질)", cat: "단백질" },
  { name: "닭발(조리된 손질)", cat: "단백질" },
  { name: "미역(건조)", cat: "기타" },
  { name: "양배추", cat: "채소" },
  { name: "알배추", cat: "채소" },
  { name: "팽이버섯", cat: "채소" },
  { name: "순두부", cat: "단백질" },
  { name: "닭안심", cat: "단백질" },
  { name: "밥(현미/흰밥)", cat: "곡물" },
  { name: "김", cat: "곡물" },
  { name: "견과류", cat: "기타" },
  { name: "참기름", cat: "양념" },
  { name: "간장", cat: "양념" },
  { name: "소금", cat: "양념" },
  { name: "고춧가루", cat: "양념" },
  { name: "고추장", cat: "양념" },
  { name: "마늘", cat: "양념" },
  { name: "사과", cat: "과일" },
  { name: "땅콩버터", cat: "기타" },
];

// 운동 전후 스트레칭 (항상 표시)
const STRETCHES = [
  { name: "목·어깨 돌리기", steps: ["목을 좌우로 천천히 5회씩 돌리기", "어깨를 크게 앞뒤로 10회씩 돌리기"] },
  { name: "허벅지 뒤 스트레칭", steps: ["다리 뻗고 앉아 상체를 앞으로 숙여 20초", "반대쪽도 20초"] },
  { name: "골반·허리 스트레칭", steps: ["누워서 무릎을 가슴 쪽으로 당겨 20초", "좌우 번갈아 반복"] },
];

// 상황별 운동 풀: 홈트(도구 없이)/러닝/헬스장
const EXERCISE_MODES = {
  home: [
    { name: "빠르게 걷기 15분", kcal: 80, note: "집 앞 산책, 아이랑 같이 해도 좋아요", steps: ["팔을 크게 흔들며 15분 걷기"] },
    { name: "여리탄탄 하체 홈트 1분 x 3세트", kcal: 60, note: "스쿼트-런지 번갈아, 허벅지 라인 집중", steps: ["스쿼트 20초", "런지(좌우) 20초", "제자리 뛰기 20초", "1분 휴식 후 2세트 더 반복"] },
    { name: "복근 홈트 1분 x 3세트", kcal: 60, note: "허리 아프면 무리하지 않기", steps: ["크런치 20초", "플랭크 20초", "레그레이즈 20초", "1분 휴식 후 2세트 더 반복"] },
    { name: "계단 오르내리기 10분", kcal: 90, note: "엘리베이터 대신", steps: ["10분간 계단 오르내리기, 힘들면 걷기로 전환"] },
    { name: "팔뚝 탄력 홈트 5분", kcal: 40, note: "TV 보면서 틈틈이", steps: ["팔 벌려 원 그리기 30초 x 2", "팔굽혀펴기(무릎대고) 10회 x 3세트"] },
    { name: "홈트 서킷 12분", kcal: 100, note: "유튜브에서 '홈트' 검색해서 아무 영상 하나 틀어놓고 따라하기 좋아요", steps: ["스쿼트-런지-니업을 1분씩 순서대로, 3바퀴 반복"] },
    { name: "줄넘기 10분", kcal: 110, note: "베란다·거실에서 매트 깔고, 무릎 부담되면 천천히", steps: ["가볍게 제자리 뛰기로 1분 몸풀기", "줄넘기 1분 + 30초 휴식을 6~7세트 반복"] },
    { name: "가벼운 요가·스트레칭 15분", kcal: 40, note: "몸이 무거운 회복일에", steps: ["아래 스트레칭 루틴을 천천히 2바퀴"] },
  ],
  running: [
    { name: "가볍게 걷기+뛰기 20분", kcal: 150, note: "숨차면 바로 걷기로 전환, 무리하지 않기", steps: ["5분 걷기로 몸풀기", "1분 뛰기 + 2분 걷기를 반복", "5분 걷기로 마무리"] },
    { name: "가벼운 조깅 25분", kcal: 210, note: "옆사람과 대화 가능한 페이스 유지", steps: ["5분 걷기로 몸풀기", "15분 조깅", "5분 걷기로 마무리"] },
    { name: "인터벌 러닝 20분", kcal: 200, note: "체력 붙었을 때만, 무리 금지", steps: ["5분 걷기 워밍업", "빠르게 1분 + 천천히 2분을 4세트 반복"] },
  ],
  gym: [
    { name: "유산소 15분 + 하체 근력 3종", kcal: 220, note: "레그프레스·레그컬·힙쓰러스트 가볍게 3세트씩", steps: ["트레드밀/사이클 15분", "레그프레스 3세트", "레그컬 3세트", "힙쓰러스트 3세트"] },
    { name: "유산소 15분 + 상체 근력 3종", kcal: 210, note: "랫풀다운·체스트프레스·숄더프레스 가볍게 3세트씩", steps: ["트레드밀/사이클 15분", "랫풀다운 3세트", "체스트프레스 3세트", "숄더프레스 3세트"] },
    { name: "전신 순환 운동 30분", kcal: 250, note: "기구 4~5개를 가볍게 순환하며 1세트씩", steps: ["유산소 5분 워밍업", "기구 4~5개를 각 1세트씩 순환, 3바퀴"] },
  ],
};
const EXERCISE_MODE_LABEL = { home: "🏠 집에서", running: "🏃 러닝", gym: "🏋️ 헬스장" };
// 하위 호환용 별칭
const EXERCISE_POOL = EXERCISE_MODES.home;

// 레시피 시드 데이터 — 전부 10분 이내, 기본적으로 밀가루/유제품 미포함
const SEED_RECIPES = [
  {
    id: "r01", name: "숨은채소 계란볶음밥", mealType: "lunch",
    calories: 450, prepTimeMin: 8, costWon: 2500,
    ingredients: ["계란", "밥(현미/흰밥)", "당근", "애호박", "참기름", "간장"],
    tags: ["고단백", "볶음밥", "아이반찬"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: true,
    mealPrep: { ok: true, storage: "냉동 2주" },
    steps: ["당근·애호박 잘게 다지기", "계란 풀어 채소와 섞어 볶기", "밥 넣고 간장·참기름으로 볶기"]
  },
  {
    id: "r02", name: "닭가슴살 계란찜", mealType: "dinner",
    calories: 320, prepTimeMin: 9, costWon: 2200,
    ingredients: ["계란", "닭가슴살", "소금"],
    tags: ["고단백", "저탄수", "부드러움"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    mealPrep: { ok: true, storage: "냉장 2일" },
    steps: ["닭가슴살 잘게 다지기", "계란물에 섞어 소금 간", "전자레인지 or 찜기 5분"]
  },
  {
    id: "r03", name: "두부 스크램블", mealType: "breakfast",
    calories: 280, prepTimeMin: 7, costWon: 1800,
    ingredients: ["두부", "계란", "당근"],
    tags: ["고단백", "저탄수", "간단"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: true,
    mealPrep: { ok: false, storage: "" },
    steps: ["두부 으깨기", "당근 다져 계란과 섞기", "팬에 스크램블처럼 볶기"]
  },
  {
    id: "r04", name: "순한맛 참치김치볶음밥", mealType: "lunch",
    calories: 480, prepTimeMin: 8, costWon: 2300,
    ingredients: ["참치캔", "김치", "밥(현미/흰밥)", "대파"],
    tags: ["고단백", "볶음밥", "매콤"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    mealPrep: { ok: true, storage: "냉동 2주" },
    steps: ["김치 잘게 썰어 기름 없이 볶기 (아이용은 물에 헹궈 순하게)", "참치 넣고 볶기", "밥 넣고 볶기"]
  },
  {
    id: "r05", name: "소고기 미역국", mealType: "dinner",
    calories: 260, prepTimeMin: 10, costWon: 3000,
    ingredients: ["소고기다짐육", "미역(건조)", "참기름", "간장"],
    tags: ["국물", "저탄수", "고단백"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    mealPrep: { ok: true, storage: "냉장 3일 / 냉동 2주" },
    steps: ["미역 불리기", "소고기 참기름에 볶기", "물 붓고 간장 간해서 끓이기"]
  },
  {
    id: "r06", name: "닭가슴살 오이무침", mealType: "lunch",
    calories: 300, prepTimeMin: 8, costWon: 2400,
    ingredients: ["훈제닭가슴살", "오이", "고춧가루", "간장"],
    tags: ["고단백", "저탄수", "샐러드"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    mealPrep: { ok: false, storage: "" },
    steps: ["닭가슴살 찢기", "오이 얇게 썰기", "양념 넣고 무치기"]
  },
  {
    id: "r07", name: "두부김가루 주먹밥", mealType: "lunch",
    calories: 400, prepTimeMin: 7, costWon: 2000,
    ingredients: ["두부", "밥(현미/흰밥)", "김", "참기름"],
    tags: ["아이반찬", "간단", "도시락"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    mealPrep: { ok: true, storage: "냉장 2일" },
    steps: ["두부 으깨서 물기 빼기", "밥과 섞어 참기름 간", "동글게 뭉쳐 김가루 묻히기"]
  },
  {
    id: "r08", name: "애호박새우전 (부침가루 없이)", mealType: "dinner",
    calories: 340, prepTimeMin: 10, costWon: 3200,
    ingredients: ["애호박", "새우(손질)", "계란", "소금"],
    tags: ["아이반찬", "고단백"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    mealPrep: { ok: true, storage: "냉동 2주" },
    steps: ["애호박 동그랗게 썰기", "새우 다져 계란물에 섞기", "애호박에 계란물 얹어 부치기"]
  },
  {
    id: "r09", name: "브로콜리 계란볶음", mealType: "lunch",
    calories: 260, prepTimeMin: 7, costWon: 1900,
    ingredients: ["브로콜리", "계란", "소금"],
    tags: ["저탄수", "고단백", "반찬"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    mealPrep: { ok: true, storage: "냉장 2일" },
    steps: ["브로콜리 데치기", "계란 풀어 부드럽게 볶기", "브로콜리 섞어 소금 간"]
  },
  {
    id: "r10", name: "닭가슴살 김치두부조림", mealType: "dinner",
    calories: 380, prepTimeMin: 10, costWon: 3000,
    ingredients: ["닭가슴살", "김치", "두부", "간장"],
    tags: ["고단백", "매콤", "조림"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    mealPrep: { ok: true, storage: "냉장 3일" },
    steps: ["닭가슴살 한입 크기로 썰기", "김치와 함께 볶다가 물 붓기", "두부 넣고 조리듯 끓이기"]
  },
  {
    id: "r11", name: "견과류 & 방울토마토", mealType: "snack",
    calories: 180, prepTimeMin: 2, costWon: 1500,
    ingredients: ["견과류", "방울토마토"],
    tags: ["간단", "간식", "아이간식"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    mealPrep: { ok: false, storage: "" },
    steps: ["견과류 한 줌 + 방울토마토 씻어서 담기"]
  },
  {
    id: "r12", name: "삶은계란 + 오이스틱", mealType: "snack",
    calories: 160, prepTimeMin: 8, costWon: 1200,
    ingredients: ["계란", "오이"],
    tags: ["간단", "고단백", "간식"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    mealPrep: { ok: true, storage: "계란은 냉장 4일 (오이는 먹기 직전에)" },
    steps: ["계란 삶기 (전날 미리 삶아두면 0분)", "오이 스틱 모양으로 썰기"]
  },
  {
    id: "r13", name: "단호박찜", mealType: "snack",
    calories: 150, prepTimeMin: 10, costWon: 1500,
    ingredients: ["단호박"],
    tags: ["아이간식", "자연단맛", "간식"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    mealPrep: { ok: true, storage: "냉장 3일 / 냉동 2주" },
    steps: ["단호박 썰어 전자레인지 8분 찌기"]
  },
  {
    id: "r14", name: "소고기채소죽", mealType: "dinner",
    calories: 350, prepTimeMin: 10, costWon: 2800,
    ingredients: ["소고기다짐육", "당근", "애호박", "밥(현미/흰밥)", "참기름"],
    tags: ["아이반찬", "부드러움", "숨은채소"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: true,
    mealPrep: { ok: true, storage: "냉동 2주" },
    steps: ["당근·애호박 잘게 다지기", "소고기와 참기름에 볶기", "밥과 물 넣고 죽처럼 끓이기"]
  },
  {
    id: "r15", name: "두부마요 참치야채무침", mealType: "lunch",
    calories: 310, prepTimeMin: 8, costWon: 2400,
    ingredients: ["두부", "참치캔", "오이", "당근"],
    tags: ["고단백", "유제품무첨가", "샐러드"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    mealPrep: { ok: false, storage: "" },
    steps: ["두부 으깨서 물기 제거", "참치와 다진 채소 섞기", "소금 살짝 간"]
  },
  {
    id: "r16", name: "야채계란말이", mealType: "dinner",
    calories: 300, prepTimeMin: 9, costWon: 2200,
    ingredients: ["계란", "당근", "애호박", "대파"],
    tags: ["아이반찬", "숨은채소", "고단백"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: true,
    mealPrep: { ok: true, storage: "냉장 3일" },
    steps: ["채소 잘게 다지기", "계란물에 섞기", "돌돌 말아가며 부치기"]
  },
  {
    id: "r17", name: "오징어채소볶음", mealType: "dinner",
    calories: 290, prepTimeMin: 10, costWon: 3500,
    ingredients: ["오징어(손질)", "양파", "당근", "고춧가루"],
    tags: ["고단백", "매콤", "저탄수"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    mealPrep: { ok: true, storage: "냉장 2일" },
    steps: ["오징어 한입크기로 썰기", "채소와 함께 센불에 볶기", "고춧가루·간장으로 마무리"]
  },
  {
    id: "r18", name: "훈제닭가슴살 도시락 (조리 없음)", mealType: "lunch",
    calories: 320, prepTimeMin: 3, costWon: 3000,
    ingredients: ["훈제닭가슴살", "방울토마토", "오이"],
    tags: ["초간단", "고단백", "저탄수"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    mealPrep: { ok: false, storage: "" },
    steps: ["닭가슴살 데우기(전자레인지 1분)", "방울토마토·오이 곁들이기"]
  },
  {
    id: "r19", name: "시금치계란국", mealType: "breakfast",
    calories: 200, prepTimeMin: 8, costWon: 1800,
    ingredients: ["시금치", "계란", "간장"],
    tags: ["국물", "저칼로리", "아침"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    mealPrep: { ok: true, storage: "냉장 2일" },
    steps: ["물 끓이고 간장 간", "시금치 넣고 한소끔", "계란 풀어 넣기"]
  },
  {
    id: "r20", name: "참치오이덮밥", mealType: "lunch",
    calories: 430, prepTimeMin: 6, costWon: 2200,
    ingredients: ["참치캔", "오이", "밥(현미/흰밥)", "간장", "참기름"],
    tags: ["초간단", "고단백"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    mealPrep: { ok: false, storage: "" },
    steps: ["오이 잘게 썰기", "참치와 양념 섞기", "밥 위에 얹기"]
  },
  {
    id: "r21", name: "양배추 계란덮밥", mealType: "lunch",
    calories: 350, prepTimeMin: 7, costWon: 1800,
    ingredients: ["양배추", "계란", "밥(현미/흰밥)", "간장"],
    tags: ["초간단", "저칼로리", "다이어트유튜브"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: true,
    mealPrep: { ok: true, storage: "냉장 2일" },
    steps: ["양배추 잘게 채썰기", "계란과 함께 부드럽게 볶기", "밥 위에 얹고 간장 살짝"]
  },
  {
    id: "r22", name: "양배추 참치볶음", mealType: "lunch",
    calories: 300, prepTimeMin: 8, costWon: 2200,
    ingredients: ["양배추", "참치캔", "간장"],
    tags: ["고단백", "저탄수", "다이어트유튜브"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    mealPrep: { ok: true, storage: "냉장 3일" },
    steps: ["양배추 굵게 채썰기", "팬에 참치와 함께 볶기", "간장으로 간하기"]
  },
  {
    id: "r23", name: "닭가슴살 양배추볶음", mealType: "dinner",
    calories: 330, prepTimeMin: 9, costWon: 3200,
    ingredients: ["닭가슴살", "양배추", "당근", "간장"],
    tags: ["고단백", "저탄수", "다이어트유튜브"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    mealPrep: { ok: true, storage: "냉장 3일" },
    steps: ["닭가슴살 한입크기로 썰어 먼저 볶기", "양배추·당근 넣고 센불에 볶기", "간장으로 마무리"]
  },
  {
    id: "r24", name: "팽이버섯 두부구이", mealType: "breakfast",
    calories: 220, prepTimeMin: 6, costWon: 2000,
    ingredients: ["팽이버섯", "두부", "간장"],
    tags: ["초간단", "저칼로리", "다이어트유튜브"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    mealPrep: { ok: true, storage: "냉장 2일" },
    steps: ["두부 도톰하게 썰어 팬에 굽기", "팽이버섯 곁들여 같이 굽기", "간장 살짝 둘러 마무리"]
  },
  {
    id: "r25", name: "오이두부냉채", mealType: "snack",
    calories: 150, prepTimeMin: 5, costWon: 1500,
    ingredients: ["오이", "두부", "간장", "참기름"],
    tags: ["초간단", "저칼로리", "다이어트유튜브"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    mealPrep: { ok: false, storage: "" },
    steps: ["두부·오이 얇게 썰어 접시에 담기", "간장·참기름 뿌리기"]
  },
  {
    id: "r26", name: "알배추 순두부국", mealType: "dinner",
    calories: 190, prepTimeMin: 9, costWon: 2000,
    ingredients: ["알배추", "순두부", "간장", "대파"],
    tags: ["국물", "저칼로리", "다이어트유튜브"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    mealPrep: { ok: true, storage: "냉장 2일" },
    steps: ["물 끓으면 알배추 넣기", "순두부 큼직하게 떠 넣기", "간장 간, 대파 넣고 마무리"]
  },
  {
    id: "r27", name: "양배추 오이 아삭무침", mealType: "lunch",
    calories: 120, prepTimeMin: 6, costWon: 1500,
    ingredients: ["양배추", "오이", "간장", "고춧가루"],
    tags: ["저칼로리", "아삭", "다이어트유튜브"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    mealPrep: { ok: false, storage: "" },
    steps: ["양배추·오이 채썰기", "간장·고춧가루로 무치기"]
  },
  {
    id: "r28", name: "닭안심 팽이버섯볶음", mealType: "dinner",
    calories: 300, prepTimeMin: 9, costWon: 3200,
    ingredients: ["닭안심", "팽이버섯", "간장", "참기름"],
    tags: ["고단백", "저탄수", "밀프렙유튜브"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    mealPrep: { ok: true, storage: "냉동 2주" },
    steps: ["닭안심 한입크기로 썰기", "팽이버섯과 함께 센불에 볶기", "간장·참기름으로 마무리"]
  },
  {
    id: "r29", name: "소고기 육개장", mealType: "dinner",
    calories: 270, prepTimeMin: 10, costWon: 3500,
    ingredients: ["소고기다짐육", "대파", "고춧가루", "간장"],
    tags: ["국물", "매콤", "밀프렙유튜브"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    mealPrep: { ok: true, storage: "냉장 3일 / 냉동 2주" },
    steps: ["소고기 참기름 없이 볶기", "대파 듬뿍 넣고 같이 볶기", "물 붓고 고춧가루·간장으로 얼큰하게 끓이기"]
  },
  {
    id: "r30", name: "냉장고털이 비빔밥", mealType: "lunch",
    calories: 420, prepTimeMin: 10, costWon: 2500,
    ingredients: ["밥(현미/흰밥)", "당근", "오이", "계란", "고춧가루", "참기름"],
    tags: ["초간단", "냉장고털이", "밀프렙유튜브"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: true,
    mealPrep: { ok: true, storage: "밥·나물은 냉동 2주, 계란은 그때그때" },
    steps: ["집에 있는 채소들 잘게 채썰기 (당근·오이 기본, 뭐든 대체 가능)", "밥 위에 채소 올리고 계란 얹기", "고춧가루·참기름 넣고 비비기"]
  },
  {
    id: "r31", name: "사과 땅콩버터", mealType: "breakfast",
    calories: 220, prepTimeMin: 2, costWon: 1500,
    ingredients: ["사과", "땅콩버터"],
    tags: ["초간단", "아침", "자연당"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    mealPrep: { ok: false, storage: "" },
    steps: ["사과를 웨지 모양으로 썰기", "땅콩버터 곁들이기"]
  },
  {
    id: "r32", name: "매콤 새우볶음", mealType: "dinner",
    calories: 260, prepTimeMin: 8, costWon: 3800,
    ingredients: ["새우(손질)", "마늘", "고추장", "대파"],
    tags: ["매운맛", "해물", "고단백"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    mealPrep: { ok: true, storage: "냉장 2일" },
    steps: ["마늘 슬라이스 볶아 향내기", "새우 넣고 센불에 볶기", "고추장·대파 넣고 마무리"]
  },
  {
    id: "r33", name: "연어 스테이크", mealType: "dinner",
    calories: 340, prepTimeMin: 8, costWon: 5000,
    ingredients: ["연어(손질)", "소금"],
    tags: ["해물", "고단백", "간단"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    mealPrep: { ok: false, storage: "" },
    steps: ["연어에 소금 밑간", "팬에 껍질부터 4분", "뒤집어서 3~4분 더 굽기"]
  },
  {
    id: "r34", name: "매콤 조개탕", mealType: "dinner",
    calories: 180, prepTimeMin: 9, costWon: 4000,
    ingredients: ["조개(손질)", "대파", "고춧가루"],
    tags: ["매운맛", "해물", "국물"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    mealPrep: { ok: false, storage: "" },
    steps: ["물 끓으면 조개 넣기", "고춧가루 풀어 얼큰하게", "대파 넣고 마무리"]
  },
  {
    id: "r35", name: "매운 닭가슴살 볶음", mealType: "dinner",
    calories: 300, prepTimeMin: 9, costWon: 3200,
    ingredients: ["닭가슴살", "고추장", "마늘", "고춧가루"],
    tags: ["매운맛", "고단백", "저탄수"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    mealPrep: { ok: true, storage: "냉장 3일" },
    steps: ["닭가슴살 한입크기로 썰기", "마늘과 함께 볶기", "고추장·고춧가루 넣고 매콤하게 볶기"]
  },
  {
    id: "r36", name: "매콤 낙지볶음", mealType: "dinner",
    calories: 280, prepTimeMin: 9, costWon: 4500,
    ingredients: ["낙지(손질)", "양파", "고추장", "마늘"],
    tags: ["매운맛", "해물", "고단백"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    mealPrep: { ok: false, storage: "" },
    steps: ["낙지 한입크기로 썰기", "양파·마늘 먼저 볶기", "낙지·고추장 넣고 센불에 재빨리 볶기"]
  },
  {
    id: "r37", name: "매운 닭발무침 (조리된 손질 닭발 활용)", mealType: "dinner",
    calories: 320, prepTimeMin: 8, costWon: 4500,
    ingredients: ["닭발(조리된 손질)", "고추장", "고춧가루", "마늘"],
    tags: ["매운맛", "치팅", "야식"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    mealPrep: { ok: false, storage: "" },
    steps: ["조리된 손질 닭발 데우기(전자레인지 2분)", "고추장·고춧가루·마늘로 양념장 만들기", "양념장에 버무리기"]
  },
];
