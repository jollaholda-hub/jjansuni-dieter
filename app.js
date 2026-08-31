const STORAGE_KEY = "jjansuni_state_v1";
const DAY_MS = 24 * 60 * 60 * 1000;
const MEAL_LABEL = { breakfast: "아침", lunch: "점심", dinner: "저녁", snack: "간식" };
const MEAL_SHARE = { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snack: 0.10 };
const ACT_FACTOR = { low: 1.2, mid: 1.375, high: 1.55 };
const ACT_LABEL = { low: "적음", mid: "보통", high: "많음" };

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}
function fmtDate(d) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function uid(prefix) { return prefix + Date.now() + Math.floor(Math.random() * 1000); }
function withEuro(word) {
  const code = word.charCodeAt(word.length - 1) - 0xAC00;
  const hasBatchim = code >= 0 && code <= 11171 && code % 28 !== 0;
  return word + (hasBatchim ? "으로" : "로");
}

function defaultState() {
  return {
    profile: { setupDone: false, height: 160, weight: 65, targetWeight: 58, age: 35, gender: "female", activityLevel: "mid", startDate: todayKey() },
    settings: { avoidFlour: true, avoidDairy: true, monthlyBudget: 400000 },
    pantry: {},
    weightLog: [],
    customRecipes: [],
    prefTags: {},
    dailyPlans: {},
    history: [],
    spendLog: {},
    eatLog: {},
  };
}

let state = loadState();
let ui = { tab: "home", swapExcludes: {} };

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return Object.assign(defaultState(), parsed, {
      profile: Object.assign(defaultState().profile, parsed.profile || {}),
      settings: Object.assign(defaultState().settings, parsed.settings || {}),
    });
  } catch (e) {
    return defaultState();
  }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function targetDateOf(profile) {
  return new Date(new Date(profile.startDate).getTime() + 365 * DAY_MS);
}
function currentWeight() {
  if (state.weightLog.length) return state.weightLog[state.weightLog.length - 1].weight;
  return state.profile.weight;
}
function deriveProfile() {
  const p = state.profile;
  const bmr = p.gender === "male"
    ? 10 * currentWeight() + 6.25 * p.height - 5 * p.age + 5
    : 10 * currentWeight() + 6.25 * p.height - 5 * p.age - 161;
  const tdee = bmr * ACT_FACTOR[p.activityLevel];
  const today = new Date();
  const target = targetDateOf(p);
  const daysRemaining = Math.max(1, Math.round((target - today) / DAY_MS));
  const toLose = Math.max(0, currentWeight() - p.targetWeight);
  const totalDeficit = toLose * 7700;
  let dailyDeficit = totalDeficit / daysRemaining;
  dailyDeficit = clamp(dailyDeficit, 0, 750);
  const floor = p.gender === "male" ? 1500 : 1200;
  const dailyTarget = Math.max(Math.round(tdee - dailyDeficit), floor);
  const weeklyPaceKg = (dailyDeficit * 7) / 7700;
  const progressPct = p.weight === p.targetWeight ? 100 :
    clamp(((p.weight - currentWeight()) / (p.weight - p.targetWeight)) * 100, 0, 100);
  return { bmr, tdee, daysRemaining, toLose, dailyTarget, weeklyPaceKg, target, progressPct };
}

function allRecipes() {
  return state.customRecipes.concat(SEED_RECIPES);
}
function recipeById(id) {
  return allRecipes().find(r => r.id === id);
}
function pantryHasSet() {
  return new Set(Object.keys(state.pantry).filter(k => state.pantry[k]));
}
function eligiblePool(mealType) {
  return allRecipes().filter(r =>
    r.mealType === mealType &&
    r.prepTimeMin <= 10 &&
    !(state.settings.avoidFlour && r.hasFlour) &&
    !(state.settings.avoidDairy && r.hasDairy)
  );
}
function recentIdsForMeal(mealType, withinDays) {
  const cutoff = Date.now() - withinDays * DAY_MS;
  return state.history.filter(h => new Date(h.date).getTime() >= cutoff).map(h => h.meals[mealType]).filter(Boolean);
}
function scoreRecipe(r, mealType, haveSet, excludeIds) {
  if (excludeIds.includes(r.id)) return -Infinity;
  const total = r.ingredients.length || 1;
  const have = r.ingredients.filter(i => haveSet.has(i)).length;
  const pantryMatch = have / total;
  const kidBonus = (mealType === "lunch" || mealType === "dinner") && r.kidFriendly ? 3 : 0;
  let prefScore = 0;
  (r.tags || []).forEach(t => prefScore += (state.prefTags[t] || 0));
  (r.ingredients || []).forEach(i => prefScore += (state.prefTags[i] || 0) * 0.5);
  const recent2 = recentIdsForMeal(mealType, 2);
  const recent5 = recentIdsForMeal(mealType, 5);
  let variety = 0;
  if (recent2.includes(r.id)) variety -= 5;
  else if (recent5.includes(r.id)) variety -= 2;
  const costPenalty = (r.costWon || 0) / 1000 * 0.25;
  return pantryMatch * 6 + kidBonus + prefScore * 0.8 + variety - costPenalty + Math.random() * 0.4;
}
function bestForMeal(mealType, excludeIds = []) {
  const haveSet = pantryHasSet();
  const pool = eligiblePool(mealType);
  if (!pool.length) return null;
  return pool.map(r => ({ r, s: scoreRecipe(r, mealType, haveSet, excludeIds) }))
    .sort((a, b) => b.s - a.s)[0].r;
}
function alternativesForMeal(mealType, excludeIds, count = 3) {
  const haveSet = pantryHasSet();
  const pool = eligiblePool(mealType);
  return pool.map(r => ({ r, s: scoreRecipe(r, mealType, haveSet, excludeIds) }))
    .filter(x => x.s > -Infinity)
    .sort((a, b) => b.s - a.s)
    .slice(0, count)
    .map(x => x.r);
}

function ensureTodayPlan() {
  const key = todayKey();
  if (state.dailyPlans[key]) return state.dailyPlans[key];
  const meals = {};
  ["breakfast", "lunch", "dinner", "snack"].forEach(mt => {
    const r = bestForMeal(mt, []);
    meals[mt] = r ? r.id : null;
  });
  state.dailyPlans[key] = meals;
  state.history.push({ date: key, meals: Object.assign({}, meals) });
  if (state.history.length > 40) state.history.shift();
  const costSum = Object.values(meals).filter(Boolean).reduce((s, id) => s + ((recipeById(id) || {}).costWon || 0), 0);
  state.spendLog[key] = costSum;
  saveState();
  return meals;
}
function swapMeal(mealType, newId) {
  const key = todayKey();
  state.dailyPlans[key][mealType] = newId;
  const hist = state.history.find(h => h.date === key);
  if (hist) hist.meals[mealType] = newId;
  const costSum = Object.values(state.dailyPlans[key]).filter(Boolean).reduce((s, id) => s + ((recipeById(id) || {}).costWon || 0), 0);
  state.spendLog[key] = costSum;
  saveState();
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
function tagChips(tags) {
  return (tags || []).map(t => `<span class="tag">${t}</span>`).join("");
}
function missingLine(r) {
  const have = pantryHasSet();
  const missing = r.ingredients.filter(i => !have.has(i));
  if (!missing.length) return "";
  return `<div class="missing">🛒 부족: ${missing.join(", ")}</div>`;
}

function mealCardHtml(mealType, recipeId) {
  const r = recipeById(recipeId);
  if (!r) {
    return `<div class="meal-card"><div class="meal-type">${MEAL_LABEL[mealType]}</div><div class="empty-note">추천 가능한 레시피가 없어요. 레시피를 추가해보세요.</div></div>`;
  }
  return `
  <div class="meal-card" data-meal="${mealType}">
    <div class="meal-type">${MEAL_LABEL[mealType]}</div>
    <div class="meal-name">${r.name}</div>
    <div class="meal-meta">⏱ ${r.prepTimeMin}분 · 🔥 ${r.calories}kcal · 💰 약 ${r.costWon.toLocaleString()}원${r.hidesVeggies ? " · 🥕 채소 숨김" : ""}</div>
    <div>${tagChips(r.tags)}</div>
    <ol class="steps">${(r.steps || []).map(s => `<li>${s}</li>`).join("")}</ol>
    ${missingLine(r)}
    <div class="meal-actions">
      <button class="btn secondary btn-swap" data-meal="${mealType}">🔄 다른 메뉴</button>
    </div>
  </div>`;
}

function renderHome() {
  ensureTodayPlan();
  const d = deriveProfile();
  const plan = state.dailyPlans[todayKey()];
  const eatToday = (state.eatLog[todayKey()] || []).reduce((s, e) => s + e.cal, 0);
  const remain = d.dailyTarget - eatToday;
  const exIdx = new Date().getDate() % EXERCISE_POOL.length;
  const ex = EXERCISE_POOL[exIdx];

  document.getElementById("main").innerHTML = `
    <div class="hero">
      <div class="d-day">목표 ${fmtDate(d.target)}까지 D-${d.daysRemaining} · 주당 ${d.weeklyPaceKg.toFixed(2)}kg 페이스</div>
      <div class="goal-line">${currentWeight()}kg → ${state.profile.targetWeight}kg</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${d.progressPct.toFixed(0)}%"></div></div>
      <div class="hero-stats">
        <div>오늘 목표 ${d.dailyTarget}kcal</div>
        <div>기록 ${eatToday}kcal</div>
        <div>남음 ${remain}kcal</div>
      </div>
    </div>

    <div class="card">
      <h2>🍽 오늘의 식단</h2>
      ${["breakfast", "lunch", "dinner", "snack"].map(mt => mealCardHtml(mt, plan[mt])).join("")}
    </div>

    <div class="card">
      <h2>🏃 오늘의 운동</h2>
      <div class="exercise-row">
        <div>
          <div class="ex-name">${ex.name}</div>
          <div class="ex-note">${ex.note}</div>
        </div>
        <div class="ex-kcal">-${ex.kcal}kcal</div>
      </div>
    </div>

    <div class="card">
      <h2>🍴 오늘 먹은 거 기록</h2>
      <div class="empty-note" style="padding:4px 0 10px;text-align:left;">사진은 채팅창에 Claude에게 보내주시면 분석해드려요. 여기엔 결과 칼로리만 숫자로 입력하면 돼요.</div>
      <button class="btn secondary block" id="btnOpenEatLog">+ 먹은 거 기록하기</button>
      ${(state.eatLog[todayKey()] || []).map(e => `<div class="shop-item"><span>${e.desc}</span><span class="cost">${e.cal}kcal</span></div>`).join("")}
    </div>

    <div class="card">
      <h2>😋 다른 게 땡겨요</h2>
      <div class="field" style="margin-bottom:8px;">
        <input type="text" id="cravingInput" placeholder="예: 매콤한거, 국물, 볶음밥...">
      </div>
      <button class="btn ghost block" id="btnCravingSearch">비슷한 다이어트식 찾기</button>
      <div id="cravingResults"></div>
    </div>
  `;
  bindHomeEvents();
}

function bindHomeEvents() {
  document.querySelectorAll(".btn-swap").forEach(btn => {
    btn.addEventListener("click", () => {
      const mt = btn.dataset.meal;
      const key = "swap_" + mt;
      const currentId = state.dailyPlans[todayKey()][mt];
      const excludes = (ui.swapExcludes[key] || []).concat(currentId ? [currentId] : []);
      const alts = alternativesForMeal(mt, excludes, 3);
      openModal(`
        <h2>${MEAL_LABEL[mt]} 대체 메뉴</h2>
        ${alts.length ? alts.map(r => `
          <div class="recipe-item">
            <div class="rname">${r.name}</div>
            <div class="rmeta">⏱ ${r.prepTimeMin}분 · 🔥 ${r.calories}kcal · 💰 ${r.costWon.toLocaleString()}원</div>
            <div>${tagChips(r.tags)}</div>
            <div class="meal-actions"><button class="btn btn-pick-alt" data-id="${r.id}" data-meal="${mt}">${withEuro(MEAL_LABEL[mt])} 바꾸기</button></div>
          </div>`).join("") : `<div class="empty-note">더 추천할 메뉴가 없어요. 레시피를 더 추가해보세요.</div>`}
        <div class="modal-close-row"><button class="btn ghost" id="modalCloseBtn">닫기</button></div>
      `);
      bindAltPickButtons();
    });
  });
  document.getElementById("btnOpenEatLog").addEventListener("click", () => {
    openModal(`
      <h2>오늘 먹은 거 기록</h2>
      <div class="field"><label>무엇을 드셨나요?</label><input type="text" id="eatDesc" placeholder="예: 김치볶음밥"></div>
      <div class="field"><label>칼로리(kcal)</label><input type="number" id="eatCal" placeholder="예: 450"></div>
      <button class="btn block" id="eatSaveBtn">기록하기</button>
      <div class="modal-close-row"><button class="btn ghost" id="modalCloseBtn">취소</button></div>
    `);
    document.getElementById("eatSaveBtn").addEventListener("click", () => {
      const desc = document.getElementById("eatDesc").value.trim() || "기록";
      const cal = parseInt(document.getElementById("eatCal").value, 10);
      if (!cal || cal <= 0) return;
      const key = todayKey();
      state.eatLog[key] = state.eatLog[key] || [];
      state.eatLog[key].push({ desc, cal });
      saveState();
      closeModal();
      renderHome();
    });
  });
  document.getElementById("btnCravingSearch").addEventListener("click", () => {
    const q = document.getElementById("cravingInput").value.trim().toLowerCase();
    const haveSet = pantryHasSet();
    const pool = allRecipes().filter(r =>
      !(state.settings.avoidFlour && r.hasFlour) &&
      !(state.settings.avoidDairy && r.hasDairy) &&
      (!q || r.name.toLowerCase().includes(q) || (r.tags || []).some(t => t.toLowerCase().includes(q)) || r.ingredients.some(i => i.toLowerCase().includes(q)))
    );
    const results = pool.map(r => ({ r, s: scoreRecipe(r, r.mealType, haveSet, []) }))
      .sort((a, b) => b.s - a.s).slice(0, 5).map(x => x.r);
    document.getElementById("cravingResults").innerHTML = results.length ? results.map(r => `
      <div class="recipe-item">
        <div class="rname">${r.name} <span class="tag">${MEAL_LABEL[r.mealType]}</span></div>
        <div class="rmeta">⏱ ${r.prepTimeMin}분 · 🔥 ${r.calories}kcal · 💰 ${r.costWon.toLocaleString()}원</div>
        <div>${tagChips(r.tags)}</div>
        <div class="meal-actions"><button class="btn btn-pick-alt" data-id="${r.id}" data-meal="${r.mealType}">오늘 ${withEuro(MEAL_LABEL[r.mealType])} 바꾸기</button></div>
      </div>`).join("") : `<div class="empty-note">일치하는 메뉴가 없어요.</div>`;
    bindAltPickButtons();
  });
  bindAltPickButtons();
}
function bindAltPickButtons() {
  document.querySelectorAll(".btn-pick-alt").forEach(btn => {
    btn.addEventListener("click", () => {
      const mt = btn.dataset.meal;
      const id = btn.dataset.id;
      swapMeal(mt, id);
      closeModal();
      renderHome();
    });
  });
}

function renderPantry() {
  const cats = {};
  INGREDIENT_CATALOG.forEach(i => {
    cats[i.cat] = cats[i.cat] || [];
    cats[i.cat].push(i);
  });
  document.getElementById("main").innerHTML = `
    <div class="card">
      <h2>🧺 남은 식재료 체크</h2>
      <div class="empty-note" style="padding:0 0 10px;text-align:left;">있는 재료를 켜두면 그 재료로 만들 수 있는 식단을 우선 추천해요.</div>
      ${Object.keys(cats).map(cat => `
        <div class="pantry-cat">
          <h3>${cat}</h3>
          ${cats[cat].map(i => `
            <div class="pantry-item">
              <span class="name">${i.name}</span>
              <div class="toggle ${state.pantry[i.name] ? "on" : ""}" data-name="${i.name}"><div class="knob"></div></div>
            </div>`).join("")}
        </div>`).join("")}
    </div>
  `;
  document.querySelectorAll(".toggle").forEach(t => {
    t.addEventListener("click", () => {
      const name = t.dataset.name;
      state.pantry[name] = !state.pantry[name];
      saveState();
      t.classList.toggle("on", state.pantry[name]);
    });
  });
}

function renderRecipes() {
  const mine = state.customRecipes;
  document.getElementById("main").innerHTML = `
    <div class="card">
      <h2>📒 내가 추가한 레시피</h2>
      <div class="empty-note" style="padding:0 0 10px;text-align:left;">마음에 든 레시피를 계속 추가하면, 취향에 맞는 메뉴를 더 잘 추천해드려요.</div>
      <button class="btn block" id="btnAddRecipe">+ 새 레시피 추가</button>
      ${mine.length ? mine.map(r => `
        <div class="recipe-item">
          <div class="rname">${r.name} <span class="tag">${MEAL_LABEL[r.mealType]}</span></div>
          <div class="rmeta">⏱ ${r.prepTimeMin}분 · 🔥 ${r.calories}kcal · 💰 ${r.costWon.toLocaleString()}원</div>
          <div>${tagChips(r.tags)}</div>
        </div>`).join("") : `<div class="empty-note">아직 추가한 레시피가 없어요.</div>`}
    </div>
    <div class="card">
      <h2>🌿 기본 레시피 목록</h2>
      ${SEED_RECIPES.map(r => `
        <div class="recipe-item">
          <div class="rname">${r.name} <span class="tag">${MEAL_LABEL[r.mealType]}</span></div>
          <div class="rmeta">⏱ ${r.prepTimeMin}분 · 🔥 ${r.calories}kcal · 💰 ${r.costWon.toLocaleString()}원</div>
          <div>${tagChips(r.tags)}</div>
        </div>`).join("")}
    </div>
  `;
  document.getElementById("btnAddRecipe").addEventListener("click", openAddRecipeModal);
}

function openAddRecipeModal() {
  openModal(`
    <h2>새 레시피 추가</h2>
    <div class="field"><label>이름</label><input type="text" id="rfName"></div>
    <div class="field">
      <label>식사 종류</label>
      <div class="seg" id="rfMealType">
        ${Object.keys(MEAL_LABEL).map((k, idx) => `<button type="button" data-v="${k}" class="${idx === 0 ? "active" : ""}">${MEAL_LABEL[k]}</button>`).join("")}
      </div>
    </div>
    <div class="field"><label>조리시간(분, 10분 이하)</label><input type="number" id="rfTime" max="10" value="10"></div>
    <div class="field"><label>칼로리(kcal)</label><input type="number" id="rfCal"></div>
    <div class="field"><label>예상 재료비(원)</label><input type="number" id="rfCost" value="3000"></div>
    <div class="field"><label>재료 (쉼표로 구분)</label><textarea id="rfIng" placeholder="계란, 두부, 당근"></textarea></div>
    <div class="field"><label>태그 (쉼표로 구분)</label><textarea id="rfTags" placeholder="고단백, 간단, 아이반찬"></textarea></div>
    <div class="field"><label>만드는 법 (줄바꿈으로 구분)</label><textarea id="rfSteps"></textarea></div>
    <div class="field">
      <div class="checkline"><input type="checkbox" id="rfFlour"><label for="rfFlour" style="margin:0;">밀가루 들어감</label></div>
      <div class="checkline"><input type="checkbox" id="rfDairy"><label for="rfDairy" style="margin:0;">유제품 들어감</label></div>
      <div class="checkline"><input type="checkbox" id="rfKid" checked><label for="rfKid" style="margin:0;">아이와 같이 먹기 좋음</label></div>
      <div class="checkline"><input type="checkbox" id="rfHide"><label for="rfHide" style="margin:0;">채소를 티 안 나게 숨김</label></div>
    </div>
    <button class="btn block" id="rfSaveBtn">저장하기</button>
    <div class="modal-close-row"><button class="btn ghost" id="modalCloseBtn">취소</button></div>
  `);
  let mealType = "breakfast";
  document.querySelectorAll("#rfMealType button").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll("#rfMealType button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      mealType = b.dataset.v;
    });
  });
  document.getElementById("rfSaveBtn").addEventListener("click", () => {
    const name = document.getElementById("rfName").value.trim();
    if (!name) return;
    const ingredients = document.getElementById("rfIng").value.split(",").map(s => s.trim()).filter(Boolean);
    const tags = document.getElementById("rfTags").value.split(",").map(s => s.trim()).filter(Boolean);
    const steps = document.getElementById("rfSteps").value.split("\n").map(s => s.trim()).filter(Boolean);
    const recipe = {
      id: uid("c"),
      name,
      mealType,
      prepTimeMin: clamp(parseInt(document.getElementById("rfTime").value, 10) || 10, 1, 10),
      calories: parseInt(document.getElementById("rfCal").value, 10) || 300,
      costWon: parseInt(document.getElementById("rfCost").value, 10) || 3000,
      ingredients, tags, steps,
      hasFlour: document.getElementById("rfFlour").checked,
      hasDairy: document.getElementById("rfDairy").checked,
      kidFriendly: document.getElementById("rfKid").checked,
      hidesVeggies: document.getElementById("rfHide").checked,
    };
    state.customRecipes.push(recipe);
    tags.forEach(t => state.prefTags[t] = (state.prefTags[t] || 0) + 2);
    ingredients.forEach(i => state.prefTags[i] = (state.prefTags[i] || 0) + 1);
    saveState();
    closeModal();
    renderRecipes();
  });
}

function renderShopping() {
  const plan = ensureTodayPlan();
  const have = pantryHasSet();
  const missingMap = {};
  ["breakfast", "lunch", "dinner", "snack"].forEach(mt => {
    const r = recipeById(plan[mt]);
    if (!r) return;
    r.ingredients.filter(i => !have.has(i)).forEach(i => { missingMap[i] = r.name; });
  });
  const missingList = Object.keys(missingMap);
  const mk = monthKey(todayKey());
  const monthSpent = Object.keys(state.spendLog).filter(d => monthKey(d) === mk).reduce((s, d) => s + state.spendLog[d], 0);
  const budget = state.settings.monthlyBudget;
  const pct = clamp((monthSpent / budget) * 100, 0, 999);
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dayOfMonth = new Date().getDate();
  const daysLeft = Math.max(1, daysInMonth - dayOfMonth + 1);
  const dailyAllowance = Math.max(0, budget - monthSpent) / daysLeft;

  document.getElementById("main").innerHTML = `
    <div class="card">
      <h2>💰 이번 달 식비</h2>
      <div>${monthSpent.toLocaleString()}원 / ${budget.toLocaleString()}원</div>
      <div class="budget-bar-wrap"><div class="budget-bar-fill ${pct > 100 ? "over" : ""}" style="width:${clamp(pct, 0, 100)}%"></div></div>
      <div class="empty-note" style="padding:2px 0 0;text-align:left;">${pct > 100 ? "예산을 넘었어요! 남은 기간은 재고 재료 위주로 추천할게요." : `남은 기간 하루 약 ${Math.round(dailyAllowance).toLocaleString()}원 사용 가능`}</div>
    </div>
    <div class="card">
      <h2>🛒 오늘 식단 기준 부족한 재료</h2>
      ${missingList.length ? missingList.map(i => `<div class="shop-item"><span>${i}</span><span class="cost">${missingMap[i]}</span></div>`).join("") : `<div class="empty-note">지금 재고로 오늘 식단을 다 만들 수 있어요! 👍</div>`}
    </div>
  `;
}

function renderMe() {
  const d = deriveProfile();
  const p = state.profile;
  document.getElementById("main").innerHTML = `
    <div class="card">
      <h2>👤 내 정보</h2>
      <div class="field"><label>키(cm)</label><input type="number" id="meHeight" value="${p.height}"></div>
      <div class="field"><label>나이</label><input type="number" id="meAge" value="${p.age}"></div>
      <div class="field">
        <label>성별</label>
        <div class="seg">
          <button type="button" data-v="female" class="${p.gender === "female" ? "active" : ""}">여성</button>
          <button type="button" data-v="male" class="${p.gender === "male" ? "active" : ""}">남성</button>
        </div>
      </div>
      <div class="field">
        <label>활동량</label>
        <div class="seg">
          ${Object.keys(ACT_LABEL).map(k => `<button type="button" data-v="${k}" class="${p.activityLevel === k ? "active" : ""}">${ACT_LABEL[k]}</button>`).join("")}
        </div>
      </div>
      <div class="field"><label>목표 체중(kg)</label><input type="number" id="meTarget" value="${p.targetWeight}"></div>
      <button class="btn block" id="meSaveBtn">저장</button>
    </div>

    <div class="card">
      <h2>📉 체중 기록</h2>
      <div class="field"><label>오늘 체중(kg)</label><input type="number" id="weightInput" placeholder="${currentWeight()}"></div>
      <button class="btn secondary block" id="weightSaveBtn">기록하기</button>
      ${state.weightLog.slice().reverse().slice(0, 6).map(w => `<div class="shop-item"><span>${w.date}</span><span class="cost">${w.weight}kg</span></div>`).join("")}
    </div>

    <div class="card">
      <h2>⚙️ 식단 설정</h2>
      <div class="checkline"><input type="checkbox" id="setFlour" ${state.settings.avoidFlour ? "checked" : ""}><label style="margin:0;">밀가루 지양</label></div>
      <div class="checkline"><input type="checkbox" id="setDairy" ${state.settings.avoidDairy ? "checked" : ""}><label style="margin:0;">유제품 지양</label></div>
      <div class="field" style="margin-top:10px;"><label>월 식비 예산(원)</label><input type="number" id="setBudget" value="${state.settings.monthlyBudget}"></div>
      <button class="btn secondary block" id="settingsSaveBtn">설정 저장</button>
    </div>

    <div class="card">
      <h2>📊 계산 정보</h2>
      <div class="empty-note" style="padding:0;text-align:left;">기초대사량(BMR) 약 ${Math.round(d.bmr)}kcal · 활동대사량(TDEE) 약 ${Math.round(d.tdee)}kcal<br>오늘 목표 섭취 ${d.dailyTarget}kcal · 주당 감량 페이스 ${d.weeklyPaceKg.toFixed(2)}kg</div>
    </div>

    <div class="card">
      <button class="btn danger block" id="resetBtn">모든 데이터 초기화</button>
    </div>
  `;
  let gender = p.gender, activityLevel = p.activityLevel;
  document.querySelectorAll(".card .seg").forEach(seg => {
    seg.querySelectorAll("button").forEach(b => {
      b.addEventListener("click", () => {
        seg.querySelectorAll("button").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        if (seg.querySelector("button").dataset.v === "female" || b.dataset.v === "female" || b.dataset.v === "male") gender = b.dataset.v;
        else activityLevel = b.dataset.v;
      });
    });
  });
  document.getElementById("meSaveBtn").addEventListener("click", () => {
    state.profile.height = parseFloat(document.getElementById("meHeight").value) || p.height;
    state.profile.age = parseInt(document.getElementById("meAge").value, 10) || p.age;
    state.profile.targetWeight = parseFloat(document.getElementById("meTarget").value) || p.targetWeight;
    state.profile.gender = gender;
    state.profile.activityLevel = activityLevel;
    saveState();
    renderMe();
  });
  document.getElementById("weightSaveBtn").addEventListener("click", () => {
    const v = parseFloat(document.getElementById("weightInput").value);
    if (!v || v <= 0) return;
    state.weightLog.push({ date: todayKey(), weight: v });
    saveState();
    renderMe();
  });
  document.getElementById("settingsSaveBtn").addEventListener("click", () => {
    state.settings.avoidFlour = document.getElementById("setFlour").checked;
    state.settings.avoidDairy = document.getElementById("setDairy").checked;
    state.settings.monthlyBudget = parseInt(document.getElementById("setBudget").value, 10) || state.settings.monthlyBudget;
    saveState();
    renderMe();
  });
  document.getElementById("resetBtn").addEventListener("click", () => {
    openModal(`
      <h2>정말 초기화할까요?</h2>
      <div class="empty-note" style="text-align:left;padding:0 0 12px;">모든 기록이 삭제되고 처음부터 다시 설정해야 해요.</div>
      <button class="btn danger block" id="confirmResetBtn">초기화</button>
      <div class="modal-close-row"><button class="btn ghost" id="modalCloseBtn">취소</button></div>
    `);
    document.getElementById("confirmResetBtn").addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEY);
      state = defaultState();
      closeModal();
      route();
    });
  });
}

function renderOnboarding() {
  document.getElementById("main").innerHTML = `
    <div class="card">
      <h2>👋 시작하기 전에</h2>
      <div class="empty-note" style="padding:0 0 12px;text-align:left;">키/몸무게 등을 입력하면 목표체중까지 1년 페이스로 오늘의 식단과 운동을 짜드려요.</div>
      <div class="field"><label>키(cm)</label><input type="number" id="obHeight" value="160"></div>
      <div class="field"><label>현재 체중(kg)</label><input type="number" id="obWeight" value="65"></div>
      <div class="field"><label>목표 체중(kg)</label><input type="number" id="obTarget" value="58"></div>
      <div class="field"><label>나이</label><input type="number" id="obAge" value="35"></div>
      <div class="field">
        <label>성별</label>
        <div class="seg" id="obGender">
          <button type="button" data-v="female" class="active">여성</button>
          <button type="button" data-v="male">남성</button>
        </div>
      </div>
      <div class="field">
        <label>평소 활동량</label>
        <div class="seg" id="obAct">
          <button type="button" data-v="low">적음</button>
          <button type="button" data-v="mid" class="active">보통</button>
          <button type="button" data-v="high">많음</button>
        </div>
      </div>
      <button class="btn block" id="obSaveBtn">1년 계획 시작하기</button>
    </div>
  `;
  let gender = "female", act = "mid";
  document.querySelectorAll("#obGender button").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("#obGender button").forEach(x => x.classList.remove("active"));
    b.classList.add("active"); gender = b.dataset.v;
  }));
  document.querySelectorAll("#obAct button").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("#obAct button").forEach(x => x.classList.remove("active"));
    b.classList.add("active"); act = b.dataset.v;
  }));
  document.getElementById("obSaveBtn").addEventListener("click", () => {
    state.profile = {
      setupDone: true,
      height: parseFloat(document.getElementById("obHeight").value) || 160,
      weight: parseFloat(document.getElementById("obWeight").value) || 65,
      targetWeight: parseFloat(document.getElementById("obTarget").value) || 58,
      age: parseInt(document.getElementById("obAge").value, 10) || 30,
      gender, activityLevel: act,
      startDate: todayKey(),
    };
    state.weightLog.push({ date: todayKey(), weight: state.profile.weight });
    saveState();
    route();
  });
}

function openModal(innerHtml) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal-sheet">${innerHtml}</div></div>`;
  document.getElementById("modalBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "modalBackdrop") closeModal();
  });
  const closeBtn = document.getElementById("modalCloseBtn");
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
}
function closeModal() {
  document.getElementById("modalRoot").innerHTML = "";
}

function route() {
  document.getElementById("todayLabel").textContent = fmtDate(new Date());
  document.querySelectorAll("nav.tabbar button").forEach(b => b.classList.toggle("active", b.dataset.tab === ui.tab));
  if (!state.profile.setupDone) { renderOnboarding(); return; }
  if (ui.tab === "home") renderHome();
  else if (ui.tab === "pantry") renderPantry();
  else if (ui.tab === "recipes") renderRecipes();
  else if (ui.tab === "shopping") renderShopping();
  else if (ui.tab === "me") renderMe();
}

document.querySelectorAll("nav.tabbar button").forEach(btn => {
  btn.addEventListener("click", () => {
    ui.tab = btn.dataset.tab;
    route();
  });
});

route();
