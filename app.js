const STORAGE_KEY = "jjansuni_state_v1";
const DAY_MS = 24 * 60 * 60 * 1000;
const MEAL_LABEL = { breakfast: "아침", lunch: "점심", dinner: "저녁", snack: "간식" };
const MEAL_SHARE = { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snack: 0.10 };
const ACT_FACTOR = { low: 1.2, mid: 1.375, high: 1.55 };
const ACT_LABEL = { low: "적음", mid: "보통", high: "많음" };
const WEEKLY_CHEAP = {
  issuedAt: "2026-08-27",
  items: [
    { name: "열무", change: "-15.7%" },
    { name: "얼갈이배추", change: "-10.9%" },
    { name: "애호박", change: "-7.9%" },
    { name: "당근", change: "-5.1%" },
    { name: "양배추", change: "-4.1%" },
  ],
  sourceUrl: "https://www.kamis.or.kr/customer/trend/economic/economic.do?action=priceInfoNew",
};

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
    settings: { avoidFlour: true, avoidDairy: true, monthlyBudget: 400000, exerciseMode: "home" },
    pantry: {},
    customIngredients: [],
    weightLog: [],
    customRecipes: [],
    prefTags: {},
    dailyPlans: {},
    monthlyPlans: {},
    history: [],
    spendLog: {},
    eatLog: {},
    exerciseLog: {},
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
function recentIdsForMeal(mealType, withinDays, history) {
  const hist = history || state.history;
  const cutoff = Date.now() - withinDays * DAY_MS;
  return hist.filter(h => new Date(h.date).getTime() >= cutoff).map(h => h.meals[mealType]).filter(Boolean);
}
function scoreRecipe(r, mealType, haveSet, excludeIds, history, pantryStrict) {
  if (excludeIds.includes(r.id)) return -Infinity;
  const total = r.ingredients.length || 1;
  const have = r.ingredients.filter(i => haveSet.has(i)).length;
  const missing = total - have;
  const pantryMatch = have / total;
  const kidBonus = mealType === "dinner" && r.kidFriendly ? 3 : 0;
  let prefScore = 0;
  (r.tags || []).forEach(t => prefScore += (state.prefTags[t] || 0));
  (r.ingredients || []).forEach(i => prefScore += (state.prefTags[i] || 0) * 0.5);
  const recent3 = recentIdsForMeal(mealType, 3, history);
  const recent7 = recentIdsForMeal(mealType, 7, history);
  const recent14 = recentIdsForMeal(mealType, 14, history);
  let variety = 0;
  if (recent3.includes(r.id)) variety -= 9;
  else if (recent7.includes(r.id)) variety -= 5;
  else if (recent14.includes(r.id)) variety -= 2;
  const costPenalty = (r.costWon || 0) / 1000 * 0.25;
  const pantryWeight = pantryStrict ? 40 : 6;
  const missingPenalty = pantryStrict ? missing * 8 : 0;
  return pantryMatch * pantryWeight - missingPenalty + kidBonus + prefScore * 0.8 + variety - costPenalty + Math.random() * 0.4;
}
function pickWithVariety(scored) {
  const top3 = scored.slice(0, Math.min(3, scored.length));
  const margin = 6;
  const close = top3.filter(x => top3[0].s - x.s <= margin);
  if (close.length < 2) return top3[0].r;
  const roll = Math.random();
  if (roll < 0.6) return close[0].r;
  if (close.length < 3 || roll < 0.85) return close[1].r;
  return close[2].r;
}
function bestForMeal(mealType, excludeIds = [], history, pantryStrict = true) {
  const haveSet = pantryHasSet();
  const pool = eligiblePool(mealType);
  if (!pool.length) return null;
  const scored = pool.map(r => ({ r, s: scoreRecipe(r, mealType, haveSet, excludeIds, history, pantryStrict) }))
    .filter(x => x.s > -Infinity)
    .sort((a, b) => b.s - a.s);
  if (!scored.length) return null;
  return pickWithVariety(scored);
}
function alternativesForMeal(mealType, excludeIds, count = 3) {
  const haveSet = pantryHasSet();
  const pool = eligiblePool(mealType);
  return pool.map(r => ({ r, s: scoreRecipe(r, mealType, haveSet, excludeIds, null, true) }))
    .filter(x => x.s > -Infinity)
    .sort((a, b) => b.s - a.s)
    .slice(0, count)
    .map(x => x.r);
}

function daysInMonthOf(mk) {
  const [y, m] = mk.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}
function generateMonthlyPlan(mk) {
  const days = daysInMonthOf(mk);
  const plan = {};
  const tempHistory = state.history.slice(-10);
  for (let day = 1; day <= days; day++) {
    const dateStr = `${mk}-${String(day).padStart(2, "0")}`;
    const meals = {};
    ["breakfast", "lunch", "dinner", "snack"].forEach(mt => {
      const r = bestForMeal(mt, [], tempHistory, false);
      meals[mt] = r ? r.id : null;
    });
    plan[dateStr] = meals;
    tempHistory.push({ date: dateStr, meals });
  }
  state.monthlyPlans[mk] = plan;
  saveState();
  return plan;
}
function monthlyPlanFor(mk) {
  return state.monthlyPlans[mk] || null;
}
function ensureTodayPlan() {
  const key = todayKey();
  if (state.dailyPlans[key]) return state.dailyPlans[key];
  const mk = monthKey(key);
  const mPlan = monthlyPlanFor(mk);
  const meals = {};
  if (mPlan && mPlan[key]) {
    Object.assign(meals, mPlan[key]);
  } else {
    ["breakfast", "lunch", "dinner", "snack"].forEach(mt => {
      const r = bestForMeal(mt, []);
      meals[mt] = r ? r.id : null;
    });
  }
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
  const mk = monthKey(key);
  if (state.monthlyPlans[mk] && state.monthlyPlans[mk][key]) {
    state.monthlyPlans[mk][key][mealType] = newId;
  }
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
  const mode = state.settings.exerciseMode || "home";
  const modePool = EXERCISE_MODES[mode];
  const exIdx = new Date().getDate() % modePool.length;
  const ex = modePool[exIdx];
  const stretch = STRETCHES[new Date().getDate() % STRETCHES.length];
  const exDone = state.exerciseLog[todayKey()];

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
      <div class="field" style="margin-bottom:10px;">
        <div class="seg" id="exModeSeg">
          ${Object.keys(EXERCISE_MODE_LABEL).map(k => `<button type="button" data-v="${k}" class="${mode === k ? "active" : ""}">${EXERCISE_MODE_LABEL[k]}</button>`).join("")}
        </div>
      </div>
      <div class="exercise-row">
        <div>
          <div class="ex-name">${ex.name}</div>
          <div class="ex-note">${ex.note}</div>
        </div>
        <div class="ex-kcal">-${ex.kcal}kcal</div>
      </div>
      <ol class="steps">${(ex.steps || []).map(s => `<li>${s}</li>`).join("")}</ol>
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);">
        <div class="ex-name" style="font-size:13px;">🧘 스트레칭: ${stretch.name}</div>
        <ol class="steps">${stretch.steps.map(s => `<li>${s}</li>`).join("")}</ol>
      </div>
      <div class="meal-actions" style="margin-top:12px;">
        ${exDone
          ? `<button class="btn secondary block" disabled>✅ 완료: ${exDone.name} (-${exDone.kcal}kcal)</button>`
          : `<button class="btn block" id="btnExDone">✅ 오늘 운동 완료로 기록</button>`}
      </div>
      <div class="link-row"><button class="link-btn" id="btnExCustom">다른 운동 했어요 (직접 기록)</button></div>
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
  const exDoneBtn = document.getElementById("btnExDone");
  if (exDoneBtn) exDoneBtn.addEventListener("click", () => {
    const mode = state.settings.exerciseMode || "home";
    const modePool = EXERCISE_MODES[mode];
    const ex = modePool[new Date().getDate() % modePool.length];
    state.exerciseLog[todayKey()] = { name: ex.name, kcal: ex.kcal, mode };
    saveState();
    renderHome();
  });
  document.getElementById("btnExCustom").addEventListener("click", () => {
    openModal(`
      <h2>운동 직접 기록</h2>
      <div class="field"><label>무엇을 하셨나요?</label><input type="text" id="exName" placeholder="예: 줄넘기 15분"></div>
      <div class="field"><label>소모 칼로리(kcal, 대략)</label><input type="number" id="exCal" placeholder="예: 100"></div>
      <button class="btn block" id="exSaveBtn">기록하기</button>
      <div class="modal-close-row"><button class="btn ghost" id="modalCloseBtn">취소</button></div>
    `);
    document.getElementById("exSaveBtn").addEventListener("click", () => {
      const name = document.getElementById("exName").value.trim();
      if (!name) return;
      const kcal = parseInt(document.getElementById("exCal").value, 10) || 0;
      state.exerciseLog[todayKey()] = { name, kcal, mode: "custom" };
      saveState();
      closeModal();
      renderHome();
    });
  });
  document.querySelectorAll("#exModeSeg button").forEach(btn => {
    btn.addEventListener("click", () => {
      state.settings.exerciseMode = btn.dataset.v;
      saveState();
      renderHome();
    });
  });
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
    const results = pool.map(r => ({ r, s: scoreRecipe(r, r.mealType, haveSet, [], null, true) }))
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
  const customCat = "직접 추가";
  document.getElementById("main").innerHTML = `
    <div class="card">
      <h2>🧺 남은 식재료 체크</h2>
      <div class="empty-note" style="padding:0 0 10px;text-align:left;">있는 재료를 켜두면 그 재료로 만들 수 있는 식단을 우선 추천해요.</div>
      <div class="field" style="display:flex;gap:6px;margin-bottom:10px;">
        <input type="text" id="newIngInput" placeholder="재료 이름 직접 추가" style="flex:1;">
        <button class="btn secondary" id="newIngBtn" style="white-space:nowrap;">+ 추가</button>
      </div>
      ${state.customIngredients.length ? `
        <div class="pantry-cat">
          <h3>${customCat}</h3>
          ${state.customIngredients.map(name => `
            <div class="pantry-item">
              <span class="name">${name}</span>
              <div style="display:flex;align-items:center;gap:8px;">
                <div class="toggle ${state.pantry[name] ? "on" : ""}" data-name="${name}"><div class="knob"></div></div>
                <button class="btn ghost del-ing" data-name="${name}" style="padding:4px 8px;">삭제</button>
              </div>
            </div>`).join("")}
        </div>` : ""}
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
  document.getElementById("newIngBtn").addEventListener("click", () => {
    const input = document.getElementById("newIngInput");
    const name = input.value.trim();
    if (!name) return;
    const exists = INGREDIENT_CATALOG.some(i => i.name === name) || state.customIngredients.includes(name);
    if (!exists) state.customIngredients.push(name);
    state.pantry[name] = true;
    saveState();
    renderPantry();
  });
  document.querySelectorAll(".del-ing").forEach(btn => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.name;
      state.customIngredients = state.customIngredients.filter(n => n !== name);
      delete state.pantry[name];
      saveState();
      renderPantry();
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
      <div class="checkline"><input type="checkbox" id="rfPrep"><label for="rfPrep" style="margin:0;">미리 만들어 냉장/냉동 보관 가능 (밀프렙)</label></div>
    </div>
    <div class="field"><label>보관 방법 (밀프렙 체크 시)</label><input type="text" id="rfPrepStorage" placeholder="예: 냉장 3일 / 냉동 2주"></div>
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
      mealPrep: { ok: document.getElementById("rfPrep").checked, storage: document.getElementById("rfPrepStorage").value.trim() },
    };
    state.customRecipes.push(recipe);
    tags.forEach(t => state.prefTags[t] = (state.prefTags[t] || 0) + 2);
    ingredients.forEach(i => state.prefTags[i] = (state.prefTags[i] || 0) + 1);
    saveState();
    closeModal();
    renderRecipes();
  });
}

function weekMealsFromToday(days) {
  const meals = [];
  const tempHistory = state.history.slice(-10);
  for (let i = 0; i < days; i++) {
    const key = todayKey(new Date(Date.now() + i * DAY_MS));
    const mk = monthKey(key);
    const mp = state.monthlyPlans[mk];
    if (mp && mp[key]) {
      meals.push(mp[key]);
      tempHistory.push({ date: key, meals: mp[key] });
    } else if (i === 0 && state.dailyPlans[key]) {
      meals.push(state.dailyPlans[key]);
      tempHistory.push({ date: key, meals: state.dailyPlans[key] });
    } else {
      const dayMeals = {};
      ["breakfast", "lunch", "dinner", "snack"].forEach(mt => {
        const r = bestForMeal(mt, [], tempHistory, false);
        dayMeals[mt] = r ? r.id : null;
      });
      meals.push(dayMeals);
      tempHistory.push({ date: key, meals: dayMeals });
    }
  }
  return meals;
}
function weeklyMealPrepHtml() {
  const weekMeals = weekMealsFromToday(7);
  const counts = {};
  weekMeals.forEach(meals => {
    Object.values(meals).filter(Boolean).forEach(id => {
      const r = recipeById(id);
      if (!r || !r.mealPrep || !r.mealPrep.ok) return;
      counts[id] = (counts[id] || 0) + 1;
    });
  });
  const ids = Object.keys(counts);
  if (!ids.length) {
    return `<div class="empty-note" style="padding:0;text-align:left;">이번 주 식단 중 미리 만들어 보관하기 좋은 메뉴가 아직 없어요. 위에서 "이번 달 식단 짜기"를 먼저 해보세요.</div>`;
  }
  const rows = ids.map(id => {
    const r = recipeById(id);
    return `<div class="shop-item"><span>${r.name} <span class="tag">${counts[id]}회분</span></span><span class="cost">${r.mealPrep.storage}</span></div>`;
  }).join("");
  return `<div class="empty-note" style="padding:0 0 8px;text-align:left;">이번 주는 아래 메뉴들을 한번에 만들어 냉장/냉동해두면, 그날그날은 데우기만 하면 돼요.</div>${rows}`;
}

function renderShopping() {
  ensureTodayPlan();
  const mk = monthKey(todayKey());
  const mPlan = monthlyPlanFor(mk);
  const have = pantryHasSet();
  const budget = state.settings.monthlyBudget;
  const monthSpent = Object.keys(state.spendLog).filter(d => monthKey(d) === mk).reduce((s, d) => s + state.spendLog[d], 0);
  const pct = clamp((monthSpent / budget) * 100, 0, 999);
  const daysInMonth = daysInMonthOf(mk);
  const dayOfMonth = new Date().getDate();
  const daysLeft = Math.max(1, daysInMonth - dayOfMonth + 1);
  const dailyAllowance = Math.max(0, budget - monthSpent) / daysLeft;

  let bodyHtml;
  if (!mPlan) {
    bodyHtml = `
      <div class="card">
        <h2>📅 이번 달 식단 미리 짜기</h2>
        <div class="empty-note" style="padding:0 0 12px;text-align:left;">이번 달 전체 식단을 한번에 짜두면, 거기서 필요한 재료만 모아서 한번에 장볼 수 있어요.</div>
        <button class="btn block" id="btnGenMonthly">이번 달 식단 짜기</button>
      </div>`;
  } else {
    const totalCost = Object.values(mPlan).reduce((sum, meals) =>
      sum + Object.values(meals).filter(Boolean).reduce((s, id) => s + ((recipeById(id) || {}).costWon || 0), 0), 0);
    const need = {};
    Object.values(mPlan).forEach(meals => {
      Object.values(meals).filter(Boolean).forEach(id => {
        const r = recipeById(id);
        if (!r) return;
        r.ingredients.forEach(i => { need[i] = (need[i] || 0) + 1; });
      });
    });
    const missing = Object.keys(need).filter(i => !have.has(i)).sort((a, b) => need[b] - need[a]);
    bodyHtml = `
      <div class="card">
        <h2>🥡 이번 주 밀프렙 추천</h2>
        ${weeklyMealPrepHtml()}
      </div>
      <div class="card">
        <h2>🛒 이번 달 식단 기준 장보기 목록</h2>
        <div class="empty-note" style="padding:0 0 10px;text-align:left;">이번 달 식단(${Object.keys(mPlan).length}일)에 필요한 재료를 다 모았어요. 숫자는 이번 달에 쓰이는 횟수예요.</div>
        ${missing.length ? missing.map(i => `<div class="shop-item"><span>${i}</span><span class="cost">${need[i]}회</span></div>`).join("") : `<div class="empty-note">지금 재고로 이번 달 식단을 다 만들 수 있어요! 👍</div>`}
        <button class="btn ghost block" id="btnRegenMonthly" style="margin-top:12px;">이번 달 식단 다시 짜기</button>
      </div>
      <div class="card">
        <h2>💰 이번 달 예상 식비</h2>
        <div>${totalCost.toLocaleString()}원 (한달 식단 전체 기준) / 예산 ${budget.toLocaleString()}원</div>
      </div>`;
  }

  const cheapMatches = WEEKLY_CHEAP.items.filter(it => allRecipes().some(r => r.ingredients.includes(it.name)));
  document.getElementById("main").innerHTML = `
    <div class="card">
      <h2>🏷️ 이번 주 알뜰 시세 (KAMIS)</h2>
      <div class="empty-note" style="padding:0 0 8px;text-align:left;">${WEEKLY_CHEAP.issuedAt} 발행 기준, 지난주보다 저렴해진 품목이에요.</div>
      ${cheapMatches.map(it => `<div class="shop-item"><span>${it.name} <span class="tag">우리 레시피에 있음</span></span><span class="cost">${it.change}</span></div>`).join("")}
      <div class="link-row"><a href="${WEEKLY_CHEAP.sourceUrl}" target="_blank" rel="noopener">최신 알뜰장보기 시세 보기 →</a></div>
    </div>
    <div class="card">
      <h2>💳 이번 달 실제 지출</h2>
      <div>${monthSpent.toLocaleString()}원 / ${budget.toLocaleString()}원</div>
      <div class="budget-bar-wrap"><div class="budget-bar-fill ${pct > 100 ? "over" : ""}" style="width:${clamp(pct, 0, 100)}%"></div></div>
      <div class="empty-note" style="padding:2px 0 0;text-align:left;">${pct > 100 ? "예산을 넘었어요! 남은 기간은 재고 재료 위주로 추천할게요." : `남은 기간 하루 약 ${Math.round(dailyAllowance).toLocaleString()}원 사용 가능`}</div>
    </div>
    ${bodyHtml}
  `;
  const genBtn = document.getElementById("btnGenMonthly");
  if (genBtn) genBtn.addEventListener("click", () => { generateMonthlyPlan(mk); renderShopping(); });
  const regenBtn = document.getElementById("btnRegenMonthly");
  if (regenBtn) regenBtn.addEventListener("click", () => {
    openModal(`
      <h2>다시 짤까요?</h2>
      <div class="empty-note" style="text-align:left;padding:0 0 12px;">오늘 이후 날짜의 식단이 새로 짜여요. 지난 날짜 기록은 그대로 남아요.</div>
      <button class="btn block" id="confirmRegenBtn">다시 짜기</button>
      <div class="modal-close-row"><button class="btn ghost" id="modalCloseBtn">취소</button></div>
    `);
    document.getElementById("confirmRegenBtn").addEventListener("click", () => {
      generateMonthlyPlan(mk);
      closeModal();
      renderShopping();
    });
  });
}

function recentDaysSummaryHtml(days) {
  const rows = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * DAY_MS);
    const key = todayKey(d);
    const eaten = (state.eatLog[key] || []).reduce((s, e) => s + e.cal, 0);
    const ex = state.exerciseLog[key];
    rows.push({ key, eaten, ex });
  }
  const hasAny = rows.some(r => r.eaten > 0 || r.ex);
  if (!hasAny) return `<div class="empty-note">아직 기록이 없어요. 홈 화면에서 먹은 거·운동을 기록해보세요.</div>`;
  return rows.map(r => `
    <div class="shop-item">
      <span>${r.key.slice(5)} · 🍴 ${r.eaten ? r.eaten + "kcal" : "기록없음"}</span>
      <span class="cost">${r.ex ? "✅ " + r.ex.name : "운동 기록없음"}</span>
    </div>`).join("");
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
      <h2>📋 지난 7일 기록</h2>
      ${recentDaysSummaryHtml(7)}
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
