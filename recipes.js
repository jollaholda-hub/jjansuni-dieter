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
  { name: "미역(건조)", cat: "기타" },
  { name: "밥(현미/흰밥)", cat: "곡물" },
  { name: "김", cat: "곡물" },
  { name: "견과류", cat: "기타" },
  { name: "참기름", cat: "양념" },
  { name: "간장", cat: "양념" },
  { name: "소금", cat: "양념" },
  { name: "고춧가루", cat: "양념" },
];

// 홈트 운동 풀 (도구 없이 10~15분)
const EXERCISE_POOL = [
  { name: "빠르게 걷기 15분", kcal: 80, note: "집 앞 산책, 아이랑 같이 해도 좋아요" },
  { name: "스쿼트 3세트 x 12회", kcal: 60, note: "TV 보면서 틈틈이" },
  { name: "제자리 걷기 + 무릎 올리기 10분", kcal: 70, note: "비 오는 날 실내에서" },
  { name: "계단 오르내리기 10분", kcal: 90, note: "엘리베이터 대신" },
  { name: "플랭크 3세트 x 30초 + 스쿼트 2세트", kcal: 50, note: "코어 강화" },
  { name: "홈트 서킷 12분 (스쿼트-런지-니업 반복)", kcal: 100, note: "유튜브 아무거나 틀어놓고" },
  { name: "요가/스트레칭 15분", kcal: 40, note: "회복이 필요한 날" },
];

// 레시피 시드 데이터 — 전부 10분 이내, 기본적으로 밀가루/유제품 미포함
const SEED_RECIPES = [
  {
    id: "r01", name: "숨은채소 계란볶음밥", mealType: "lunch",
    calories: 450, prepTimeMin: 8, costWon: 2500,
    ingredients: ["계란", "밥(현미/흰밥)", "당근", "애호박", "참기름", "간장"],
    tags: ["고단백", "볶음밥", "아이반찬"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: true,
    steps: ["당근·애호박 잘게 다지기", "계란 풀어 채소와 섞어 볶기", "밥 넣고 간장·참기름으로 볶기"]
  },
  {
    id: "r02", name: "닭가슴살 계란찜", mealType: "dinner",
    calories: 320, prepTimeMin: 9, costWon: 2200,
    ingredients: ["계란", "닭가슴살", "소금"],
    tags: ["고단백", "저탄수", "부드러움"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    steps: ["닭가슴살 잘게 다지기", "계란물에 섞어 소금 간", "전자레인지 or 찜기 5분"]
  },
  {
    id: "r03", name: "두부 스크램블", mealType: "breakfast",
    calories: 280, prepTimeMin: 7, costWon: 1800,
    ingredients: ["두부", "계란", "당근"],
    tags: ["고단백", "저탄수", "간단"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: true,
    steps: ["두부 으깨기", "당근 다져 계란과 섞기", "팬에 스크램블처럼 볶기"]
  },
  {
    id: "r04", name: "순한맛 참치김치볶음밥", mealType: "lunch",
    calories: 480, prepTimeMin: 8, costWon: 2300,
    ingredients: ["참치캔", "김치", "밥(현미/흰밥)", "대파"],
    tags: ["고단백", "볶음밥", "매콤"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    steps: ["김치 잘게 썰어 기름 없이 볶기 (아이용은 물에 헹궈 순하게)", "참치 넣고 볶기", "밥 넣고 볶기"]
  },
  {
    id: "r05", name: "소고기 미역국", mealType: "dinner",
    calories: 260, prepTimeMin: 10, costWon: 3000,
    ingredients: ["소고기다짐육", "미역(건조)", "참기름", "간장"],
    tags: ["국물", "저탄수", "고단백"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    steps: ["미역 불리기", "소고기 참기름에 볶기", "물 붓고 간장 간해서 끓이기"]
  },
  {
    id: "r06", name: "닭가슴살 오이무침", mealType: "lunch",
    calories: 300, prepTimeMin: 8, costWon: 2400,
    ingredients: ["훈제닭가슴살", "오이", "고춧가루", "간장"],
    tags: ["고단백", "저탄수", "샐러드"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    steps: ["닭가슴살 찢기", "오이 얇게 썰기", "양념 넣고 무치기"]
  },
  {
    id: "r07", name: "두부김가루 주먹밥", mealType: "lunch",
    calories: 400, prepTimeMin: 7, costWon: 2000,
    ingredients: ["두부", "밥(현미/흰밥)", "김", "참기름"],
    tags: ["아이반찬", "간단", "도시락"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    steps: ["두부 으깨서 물기 빼기", "밥과 섞어 참기름 간", "동글게 뭉쳐 김가루 묻히기"]
  },
  {
    id: "r08", name: "애호박새우전 (부침가루 없이)", mealType: "dinner",
    calories: 340, prepTimeMin: 10, costWon: 3200,
    ingredients: ["애호박", "새우(손질)", "계란", "소금"],
    tags: ["아이반찬", "고단백"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    steps: ["애호박 동그랗게 썰기", "새우 다져 계란물에 섞기", "애호박에 계란물 얹어 부치기"]
  },
  {
    id: "r09", name: "브로콜리 계란볶음", mealType: "lunch",
    calories: 260, prepTimeMin: 7, costWon: 1900,
    ingredients: ["브로콜리", "계란", "소금"],
    tags: ["저탄수", "고단백", "반찬"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    steps: ["브로콜리 데치기", "계란 풀어 부드럽게 볶기", "브로콜리 섞어 소금 간"]
  },
  {
    id: "r10", name: "닭가슴살 김치두부조림", mealType: "dinner",
    calories: 380, prepTimeMin: 10, costWon: 3000,
    ingredients: ["닭가슴살", "김치", "두부", "간장"],
    tags: ["고단백", "매콤", "조림"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    steps: ["닭가슴살 한입 크기로 썰기", "김치와 함께 볶다가 물 붓기", "두부 넣고 조리듯 끓이기"]
  },
  {
    id: "r11", name: "견과류 & 방울토마토", mealType: "snack",
    calories: 180, prepTimeMin: 2, costWon: 1500,
    ingredients: ["견과류", "방울토마토"],
    tags: ["간단", "간식", "아이간식"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    steps: ["견과류 한 줌 + 방울토마토 씻어서 담기"]
  },
  {
    id: "r12", name: "삶은계란 + 오이스틱", mealType: "snack",
    calories: 160, prepTimeMin: 8, costWon: 1200,
    ingredients: ["계란", "오이"],
    tags: ["간단", "고단백", "간식"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    steps: ["계란 삶기 (전날 미리 삶아두면 0분)", "오이 스틱 모양으로 썰기"]
  },
  {
    id: "r13", name: "단호박찜", mealType: "snack",
    calories: 150, prepTimeMin: 10, costWon: 1500,
    ingredients: ["단호박"],
    tags: ["아이간식", "자연단맛", "간식"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    steps: ["단호박 썰어 전자레인지 8분 찌기"]
  },
  {
    id: "r14", name: "소고기채소죽", mealType: "dinner",
    calories: 350, prepTimeMin: 10, costWon: 2800,
    ingredients: ["소고기다짐육", "당근", "애호박", "밥(현미/흰밥)", "참기름"],
    tags: ["아이반찬", "부드러움", "숨은채소"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: true,
    steps: ["당근·애호박 잘게 다지기", "소고기와 참기름에 볶기", "밥과 물 넣고 죽처럼 끓이기"]
  },
  {
    id: "r15", name: "두부마요 참치야채무침", mealType: "lunch",
    calories: 310, prepTimeMin: 8, costWon: 2400,
    ingredients: ["두부", "참치캔", "오이", "당근"],
    tags: ["고단백", "유제품무첨가", "샐러드"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    steps: ["두부 으깨서 물기 제거", "참치와 다진 채소 섞기", "소금 살짝 간"]
  },
  {
    id: "r16", name: "야채계란말이", mealType: "dinner",
    calories: 300, prepTimeMin: 9, costWon: 2200,
    ingredients: ["계란", "당근", "애호박", "대파"],
    tags: ["아이반찬", "숨은채소", "고단백"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: true,
    steps: ["채소 잘게 다지기", "계란물에 섞기", "돌돌 말아가며 부치기"]
  },
  {
    id: "r17", name: "오징어채소볶음", mealType: "dinner",
    calories: 290, prepTimeMin: 10, costWon: 3500,
    ingredients: ["오징어(손질)", "양파", "당근", "고춧가루"],
    tags: ["고단백", "매콤", "저탄수"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    steps: ["오징어 한입크기로 썰기", "채소와 함께 센불에 볶기", "고춧가루·간장으로 마무리"]
  },
  {
    id: "r18", name: "훈제닭가슴살 도시락 (조리 없음)", mealType: "lunch",
    calories: 320, prepTimeMin: 3, costWon: 3000,
    ingredients: ["훈제닭가슴살", "방울토마토", "오이"],
    tags: ["초간단", "고단백", "저탄수"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    steps: ["닭가슴살 데우기(전자레인지 1분)", "방울토마토·오이 곁들이기"]
  },
  {
    id: "r19", name: "시금치계란국", mealType: "breakfast",
    calories: 200, prepTimeMin: 8, costWon: 1800,
    ingredients: ["시금치", "계란", "간장"],
    tags: ["국물", "저칼로리", "아침"], hasFlour: false, hasDairy: false,
    kidFriendly: false, hidesVeggies: false,
    steps: ["물 끓이고 간장 간", "시금치 넣고 한소끔", "계란 풀어 넣기"]
  },
  {
    id: "r20", name: "참치오이덮밥", mealType: "lunch",
    calories: 430, prepTimeMin: 6, costWon: 2200,
    ingredients: ["참치캔", "오이", "밥(현미/흰밥)", "간장", "참기름"],
    tags: ["초간단", "고단백"], hasFlour: false, hasDairy: false,
    kidFriendly: true, hidesVeggies: false,
    steps: ["오이 잘게 썰기", "참치와 양념 섞기", "밥 위에 얹기"]
  },
];
