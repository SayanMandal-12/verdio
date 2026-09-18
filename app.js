const FACTORS = {
  car: { label: 'Car travel', unit: 'km', factor: 0.20, category: 'Travel', color: 'travel', warn: 500, max: 1000000 },
  bike: { label: 'Bike travel', unit: 'km', factor: 0.02, category: 'Travel', color: 'travel', warn: 100, max: 5000 },
  bus: { label: 'Bus travel', unit: 'km', factor: 0.08, category: 'Travel', color: 'travel', warn: 500, max: 100000 },
  train: { label: 'Train travel', unit: 'km', factor: 0.04, category: 'Travel', color: 'travel', warn: 1000, max: 100000 },
  flight: { label: 'Flight', unit: 'km', factor: 0.25, category: 'Travel', color: 'travel', warn: 20000, max: 100000 },
  electricity: { label: 'Electricity', unit: 'kWh', factor: 0.80, category: 'Home', color: 'home', warn: 200, max: 100000 },
  aircon: { label: 'Air conditioning', unit: 'kWh', factor: 0.80, category: 'Home', color: 'home', warn: 100, max: 100000 },
  vegMeal: { label: 'Vegetarian meal', unit: 'meal', factor: 0.5, category: 'Food', color: 'food', warn: 10, max: 1000 },
  nonVegMeal: { label: 'Non-vegetarian meal', unit: 'meal', factor: 2.0, category: 'Food', color: 'food', warn: 10, max: 1000 }
};
const STORAGE_KEY = 'terralog-activities';
const TARGET_KEY = 'terralog-target';
const THEME_KEY = 'terralog-theme';
const AUTH_KEY = 'verdio-auth';
const ACCOUNT_KEY = 'verdio-account';
function loadActivities() { try { const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); if (!Array.isArray(stored)) return null; const clean = stored.filter((activity) => activity && FACTORS[activity.type] && Number.isFinite(Number(activity.quantity)) && Number(activity.quantity) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(activity.date) && !(activity.type === 'car' && Number(activity.quantity) === 500000)).map((activity) => ({ ...activity, quantity: Number(activity.quantity) })); if (clean.length !== stored.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(clean)); return clean; } catch { return null; } }
let activities = loadActivities();
let weeklyTarget = 17;
localStorage.setItem(TARGET_KEY, String(weeklyTarget));
function localDateKey(date) { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; }

if (!activities) {
  const date = (daysAgo) => { const value = new Date(); value.setDate(value.getDate() - daysAgo); return localDateKey(value); };
  activities = [
    { id: crypto.randomUUID(), type: 'car', quantity: 8, date: date(0) },
    { id: crypto.randomUUID(), type: 'vegMeal', quantity: 1, date: date(1) },
    { id: crypto.randomUUID(), type: 'electricity', quantity: 4.2, date: date(2) },
    { id: crypto.randomUUID(), type: 'bus', quantity: 12, date: date(3) }
  ];
  persist();
}

const $ = (selector) => document.querySelector(selector);
const form = $('#activityForm');
const typeInput = $('#activityType');
const quantityInput = $('#quantity');
const unitInput = $('#unit');
const formMessage = $('#formMessage');
const themeSelect = $('#themeSelect');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
let reportPeriod = 'daily';
let authMode = 'signin';
let gameQuestionIndex = 0;
let gameScore = 0;
let gameAnswered = false;
let activeGameQuestions = [];
let viewedWeekOffset = 0;
let pendingWarning = null;
const ASSISTANT_FAQS = [
  { question: 'What is my carbon footprint?', answer: () => `Your current weekly footprint is ${currentWeekActivities().reduce((sum, activity) => sum + impact(activity), 0).toFixed(1)} kg CO₂e. The dashboard breaks that total into travel, home, and food.` },
  { question: 'How is car travel calculated?', answer: () => 'Car travel uses 0.20 kg CO₂e per kilometre. For example, 10 km adds 2.00 kg CO₂e.' },
  { question: 'What calculation factors do you use?', answer: () => 'verdio uses fixed factors: car 0.20 kg/km, bike 0.02 kg/km, bus 0.08 kg/km, train 0.04 kg/km, flight 0.25 kg/km, electricity and AC 0.80 kg/kWh, vegetarian meal 0.5 kg, and non-vegetarian meal 2.0 kg.' },
  { question: 'Why do flights have a high impact?', answer: () => 'The tracker assigns flights 0.25 kg CO₂e per kilometre because aviation fuel use and long travel distances create a larger footprint per trip.' },
  { question: 'What is a weekly target?', answer: () => `Your weekly target is ${weeklyTarget} kg CO₂e. It is a personal reference point for noticing patterns, not a pass-or-fail score.` },
  { question: 'What happens when I cross my target?', answer: () => 'verdio shows a clear warning and an encouraging next step. It never blocks logging or shames you; crossing a target is useful information.' },
  { question: 'When does the week start?', answer: () => 'The verdio week starts on Monday and ends on Sunday. Mid-week progress is shown against the full weekly target, with your daily average shown separately.' },
  { question: 'How are very large entries handled?', answer: () => 'Obviously implausible quantities are rejected before they affect your totals. For example, a car entry over 2,000 km is flagged for review.' },
  { question: 'Can I see daily and monthly reports?', answer: () => 'Yes. Use the Daily, Weekly, and Monthly tabs in Pattern report. Each view shows total impact, activity count, average per day, and category breakdown.' },
  { question: 'How do I change the appearance?', answer: () => 'Use the Theme menu in the top bar. Choose Light, Dark, or System. System follows your desktop or phone preference and updates when it changes.' },
  { question: 'Is my activity data stored online?', answer: () => 'No. verdio stores your activities and preferences locally in this browser using local storage. Nothing is sent to a server by this app.' },
  { question: 'What does CO₂e mean?', answer: () => 'CO₂e means carbon-dioxide equivalent. It expresses different greenhouse gases in one comparable unit so your activities can be added together.' },
  { question: 'What can I do after a high-footprint day?', answer: () => 'Treat it as a signal, not a failure. For your next choice, try one small swap: take the bus for one trip, choose a vegetarian meal, switch off unused devices, or combine errands. You can also log the day and look for the biggest category in your report.' }
];

const QUESTION_BANK = [
  { question: 'Which logged activity has the highest fixed factor?', options: ['Bus travel', 'Vegetarian meal', 'Non-vegetarian meal', 'Electricity'], answer: 2, explanation: 'A non-vegetarian meal is 2.0 kg CO₂e per meal in verdio, higher than the other listed factors.' },
  { question: 'How much CO₂e does 10 km of bus travel add?', options: ['0.08 kg', '0.8 kg', '8 kg', '80 kg'], answer: 1, explanation: 'Bus travel is 0.08 kg CO₂e per km, so 10 km × 0.08 = 0.8 kg CO₂e.' },
  { question: 'Which choice usually lowers impact immediately?', options: ['Leave lights on', 'Add an unnecessary car trip', 'Choose a vegetarian meal', 'Fly a longer route'], answer: 2, explanation: 'A vegetarian meal is 0.5 kg CO₂e in verdio, compared with 2.0 kg for a non-vegetarian meal.' },
  { question: 'What does CO₂e help you do?', options: ['Compare different greenhouse gases in one unit', 'Measure phone battery life', 'Predict tomorrow’s weather', 'Count trees exactly'], answer: 0, explanation: 'CO₂e means carbon-dioxide equivalent, allowing different climate impacts to be compared and added.' },
  { question: 'When does verdio’s tracking week begin?', options: ['Sunday', 'Monday', 'Wednesday', 'The first day you log'], answer: 1, explanation: 'verdio uses a Monday-to-Sunday week, so progress is comparable from one week to the next.' },
  { question: 'Which activity is measured in kWh?', options: ['Bike travel', 'Train travel', 'Air conditioning', 'A vegetarian meal'], answer: 2, explanation: 'Air conditioning is recorded in kilowatt-hours because it measures electricity use.' },
  { question: 'What is the most useful response to crossing a target?', options: ['Stop logging', 'Hide the result', 'Review the biggest category and choose one small swap', 'Delete the week'], answer: 2, explanation: 'A target is a learning signal. Reviewing the biggest category makes the next choice more actionable.' },
  { question: 'What does the 7-day streak badge reward?', options: ['Seven activities in one hour', 'Tracking on seven consecutive days', 'Seven kilograms of emissions', 'Seven different categories'], answer: 1, explanation: 'The streak rewards consistent tracking across seven consecutive calendar days.' },
  { question: 'Which travel choice has the lowest fixed factor here?', options: ['Flight', 'Car', 'Bus', 'Bike'], answer: 3, explanation: 'Bike travel is assigned 0.02 kg CO₂e per kilometre, the lowest of these options.' },
  { question: 'Why does verdio show text next to charts?', options: ['To make charts decorative', 'So information is not communicated by color alone', 'To increase the target', 'To hide exact values'], answer: 1, explanation: 'Text values make the data clearer for everyone, including people with color-vision differences.' },
  { question: 'What is a good next step after logging an activity?', options: ['Ignore the pattern', 'Compare categories in the report', 'Change every habit at once', 'Never review it'], answer: 1, explanation: 'Comparing categories helps you find one realistic action instead of trying to change everything at once.' }
];

function applyTheme(mode) {
  const resolvedTheme = mode === 'system' ? (systemTheme.matches ? 'dark' : 'light') : mode;
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themeMode = mode;
  themeSelect.value = mode;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', resolvedTheme === 'dark' ? '#101d1a' : '#eef3ee');
}
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); installPrompt = event; $('#installButton').hidden = false; });
$('#installButton').addEventListener('click', async () => { if (!installPrompt) { alert('Install is unavailable here. Use your browser menu and choose “Install verdio” or “Add to Home Screen”.'); return; } installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $('#installButton').hidden = true; });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
$('#supportButton').addEventListener('click', () => $('#supportDialog').showModal());
$('#copyUpi').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('#upiId').textContent); $('#supportStatus').textContent = '✓ UPI ID copied successfully'; } catch { $('#supportStatus').textContent = '⚠ Copy unavailable. Select and copy the UPI ID manually.'; } });
function renderTurnstileSlots() { if (!window.turnstile) return; document.querySelectorAll('.turnstile-slot').forEach((slot) => { if (slot.dataset.sitekey === '__TURNSTILE_SITE_KEY__') { slot.textContent = 'Security verification is configured by the server.'; return; } window.turnstile.render(slot, { sitekey: slot.dataset.sitekey, callback: (token) => { slot.dataset.token = token; } }); }); }
window.addEventListener('load', renderTurnstileSlots);
function passwordChecks(password) { return { length: password.length >= 8, upper: /[A-Z]/.test(password), lower: /[a-z]/.test(password), number: /\d/.test(password), symbol: /[^A-Za-z0-9]/.test(password) }; }
function updatePasswordRules() { const checks = passwordChecks($('#authPassword').value); Object.entries(checks).forEach(([rule, valid]) => { const item = document.querySelector(`[data-rule="${rule}"]`); item.classList.toggle('valid', valid); }); }
function setAuthMode(mode) { authMode = mode; document.querySelectorAll('.auth-tab').forEach((tab) => { const active = tab.dataset.authMode === mode; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', active); }); document.querySelectorAll('.signup-only').forEach((element) => { element.hidden = mode !== 'signup'; }); $('#authPassword').autocomplete = mode === 'signup' ? 'new-password' : 'current-password'; $('#authConfirm').required = mode === 'signup'; $('#authUsername').required = mode === 'signup'; $('#authSubmit').innerHTML = mode === 'signup' ? 'Create my verdio account <span>→</span>' : 'Sign in to verdio <span>→</span>'; $('#authMessage').textContent = ''; }
function showTracker(username) { $('#authScreen').classList.add('hidden'); $('#profileButton').textContent = (username || 'JM').slice(0, 2).toUpperCase(); }
function showAuth() { $('#authScreen').classList.remove('hidden'); }
function completeAuth(username, email, remember = $('#rememberMe').checked) { const session = JSON.stringify({ username, email }); if (remember) { localStorage.setItem(AUTH_KEY, session); sessionStorage.removeItem(AUTH_KEY); } else { sessionStorage.setItem(AUTH_KEY, session); localStorage.removeItem(AUTH_KEY); } showTracker(username); }
function validatePassword(password) { const checks = passwordChecks(password); return Object.values(checks).every(Boolean); }
function addChatMessage(text, role) { const message = document.createElement('div'); message.className = `chat-message ${role}`; if (role === 'assistant') { const avatar = document.createElement('span'); avatar.className = 'chat-avatar'; avatar.textContent = 'V'; message.appendChild(avatar); } const paragraph = document.createElement('p'); paragraph.textContent = text; message.appendChild(paragraph); $('#chatMessages').appendChild(message); $('#chatMessages').scrollTop = $('#chatMessages').scrollHeight; }
function renderChatQuestions() { $('#chatQuestions').innerHTML = ASSISTANT_FAQS.map((item, index) => `<button class="chat-question" data-question="${index}">${item.question}</button>`).join(''); }
function quizUserKey() { const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY) || 'null'); return auth?.email || auth?.username || 'guest'; }
function startQuiz() { const historyKey = `verdio-quiz-history-${quizUserKey()}`; const history = JSON.parse(localStorage.getItem(historyKey) || '[]'); const previous = new Set(history.at(-1) || []); const available = QUESTION_BANK.map((question, index) => ({ question, index })).filter((item) => !previous.has(item.index)); const pool = available.length >= 5 ? available : QUESTION_BANK.map((question, index) => ({ question, index })); activeGameQuestions = pool.sort(() => Math.random() - 0.5).slice(0, 5); gameQuestionIndex = 0; gameScore = 0; gameAnswered = false; }
function saveCompletedQuiz() { const historyKey = `verdio-quiz-history-${quizUserKey()}`; const history = JSON.parse(localStorage.getItem(historyKey) || '[]'); history.push(activeGameQuestions.map((item) => QUESTION_BANK.indexOf(item.question))); localStorage.setItem(historyKey, JSON.stringify(history.slice(-8))); }
function renderGameQuestion() {
  const question = activeGameQuestions[gameQuestionIndex]?.question;
  if (!question) { saveCompletedQuiz(); $('#gameProgress').textContent = 'Quest complete'; $('#gameProgressBar').style.width = '100%'; $('#gameQuestion').textContent = `You scored ${gameScore} out of ${activeGameQuestions.length}.`; $('#gameQuestion').focus(); $('#gameOptions').innerHTML = ''; $('#gameFeedback').textContent = gameScore >= 4 ? 'Excellent climate knowledge. Keep turning one good idea into a daily habit.' : 'Good start. Replay the quest to reinforce the ideas, then try one small change in your next activity.'; $('#gameTip').textContent = 'Knowledge becomes useful when it changes the next choice.'; $('#nextQuestion').hidden = true; $('#restartGame').hidden = false; return; }
  gameAnswered = false; $('#gameProgress').textContent = `Question ${gameQuestionIndex + 1} of ${activeGameQuestions.length}`; $('#gameProgressBar').style.width = `${((gameQuestionIndex + 1) / activeGameQuestions.length) * 100}%`; $('.game-progress-track').setAttribute('aria-valuenow', gameQuestionIndex + 1); $('#gameQuestion').textContent = question.question; $('#gameQuestion').focus(); $('#gameOptions').innerHTML = question.options.map((option, index) => `<button class="game-option" data-answer="${index}">${option}</button>`).join(''); $('#gameFeedback').textContent = ''; $('#gameTip').textContent = 'Choose an answer to grow your climate knowledge.'; $('#nextQuestion').disabled = true; $('#nextQuestion').textContent = gameQuestionIndex === activeGameQuestions.length - 1 ? 'Finish quest →' : 'Next question →'; $('#nextQuestion').hidden = false; $('#restartGame').hidden = true; $('#gameScore').textContent = `${gameScore} / ${activeGameQuestions.length}`;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  localStorage.setItem(TARGET_KEY, weeklyTarget);
  const syncStatus = document.getElementById('syncStatus');
  if (syncStatus) syncStatus.innerHTML = '<span class="status-dot"></span> Synced just now';
}
function syncActivitiesFromStorage() { const storedActivities = localStorage.getItem(STORAGE_KEY); if (!storedActivities) return; activities = JSON.parse(storedActivities); $('#syncStatus').innerHTML = '<span class="status-dot"></span> Synced from another tab'; render(); }
function formatDate(value) { return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function getMonday(date = new Date()) { const result = new Date(date); const day = result.getDay(); const distance = day === 0 ? 6 : day - 1; result.setDate(result.getDate() - distance); result.setHours(0, 0, 0, 0); return result; }
function getWeekRange(offset = 0) { const monday = getMonday(); monday.setDate(monday.getDate() + (offset * 7)); const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6); const today = new Date(); const daysElapsed = offset === 0 ? Math.min(7, Math.max(1, Math.floor((today - monday) / 86400000) + 1)) : offset < 0 ? 7 : 0; return { start: localDateKey(monday), end: localDateKey(sunday), daysElapsed }; }
function isThisWeek(date) { const range = getWeekRange(viewedWeekOffset); return date >= range.start && date <= range.end; }
function impact(activity) { return activity.quantity * FACTORS[activity.type].factor; }
function currentWeekActivities() { return activities.filter((activity) => isThisWeek(activity.date)); }
function validateQuantity(type, rawQuantity) { const details = FACTORS[type]; const quantity = Number(rawQuantity); if (!Number.isFinite(quantity) || rawQuantity === '' || quantity <= 0) return { error: '⚠ Enter a positive numeric quantity.' }; if (quantity > details.max) return { error: `⚠ This quantity is not valid for ${details.label.toLowerCase()}. Keep it at or below ${details.max.toLocaleString()} ${details.unit}.` }; if (quantity > details.warn) return { quantity, warning: `⚠ ${quantity.toLocaleString()} ${details.unit} is unusually high for ${details.label.toLowerCase()}. Review the quantity, then submit again to confirm it is intentional.` }; return { quantity }; }
function getActivityStreak() { const dates = new Set(activities.map((activity) => activity.date)); let streak = 0; const cursor = new Date(); while (dates.has(localDateKey(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1); } return streak; }
function renderAchievements() { const streak = getActivityStreak(); const completedTarget = currentWeekActivities().reduce((sum, activity) => sum + impact(activity), 0) <= weeklyTarget; const achievements = [{ icon: '◷', title: '7-day tracker', detail: `${streak}/7 days logged`, earned: streak >= 7 }, { icon: '✦', title: 'First 10', detail: `${Math.min(10, activities.length)}/10 activities`, earned: activities.length >= 10 }, { icon: '✓', title: 'Goal keeper', detail: completedTarget ? 'Under weekly target' : 'Keep going this week', earned: completedTarget }]; $('#streakSummary').textContent = `${streak} day${streak === 1 ? '' : 's'} streak`; $('#achievementGrid').innerHTML = achievements.map((item) => `<article class="achievement ${item.earned ? 'earned' : ''}"><span class="achievement-icon">${item.icon}</span><div><strong>${item.title}</strong><span>${item.detail}</span></div><b>${item.earned ? 'Earned' : 'In progress'}</b></article>`).join(''); }
function getReportRange(period) {
  const todayKey = localDateKey(new Date());
  if (period === 'daily') return { start: todayKey, end: todayKey, days: 1, label: `Today · ${formatDate(todayKey)}`, note: 'for this day', averageNote: 'one-day view' };
  if (period === 'weekly') { const range = getWeekRange(viewedWeekOffset); return { ...range, days: 7, label: `${formatDate(range.start)} - ${formatDate(range.end)}`, note: viewedWeekOffset === 0 ? 'this week' : 'selected week', averageNote: 'across 7 days' }; }
  const monthStart = new Date(); monthStart.setDate(1); const monthEnd = new Date(monthStart); monthEnd.setMonth(monthEnd.getMonth() + 1, 0); const start = localDateKey(monthStart); const end = localDateKey(monthEnd); return { start, end, days: monthEnd.getDate(), label: `${formatDate(start)} - ${formatDate(end)}`, note: 'this month', averageNote: `across ${monthEnd.getDate()} days` };
}
function renderReport() {
  const range = getReportRange(reportPeriod);
  const reportActivities = activities.filter((activity) => activity.date >= range.start && activity.date <= range.end);
  const total = reportActivities.reduce((sum, activity) => sum + impact(activity), 0);
  const totals = { Travel: 0, Home: 0, Food: 0 };
  reportActivities.forEach((activity) => { totals[FACTORS[activity.type].category] += impact(activity); });
  const max = Math.max(...Object.values(totals), 1);
  $('#reportRange').textContent = range.label;
  $('#reportCompare').textContent = 'Updated from your activity log';
  $('#reportTotal').textContent = total.toFixed(1);
  $('#reportTotalNote').textContent = range.note;
  $('#reportActivities').textContent = reportActivities.length;
  $('#reportActivitiesNote').textContent = reportActivities.length === 1 ? 'activity logged' : 'activities logged';
  $('#reportAverage').textContent = (total / range.days).toFixed(1);
  $('#reportAverageNote').textContent = range.averageNote;
  $('#reportChart').innerHTML = Object.entries(totals).map(([category, value]) => { const color = category === 'Travel' ? 'travel' : category === 'Home' ? 'home' : 'food'; return `<div class="report-row"><span>${category}</span><div class="report-track"><i class="report-fill ${color}" style="width:${(value / max) * 100}%"></i></div><strong>${value.toFixed(1)}</strong></div>`; }).join('');
}

function render() {
  const range = getWeekRange(viewedWeekOffset);
  const weekActivities = currentWeekActivities();
  const total = weekActivities.reduce((sum, activity) => sum + impact(activity), 0);
  const percent = Math.round((total / weeklyTarget) * 100);
  const cappedPercent = Math.min(100, Math.max(0, percent));
  $('#weekRange').textContent = `${formatDate(range.start)} - ${formatDate(range.end)}`;
  $('#weekSelect').value = String(viewedWeekOffset);
  $('#selectedWeekLabel').textContent = `${viewedWeekOffset === 0 ? 'This week' : 'Selected week'} · ${formatDate(range.start)} – ${formatDate(range.end)}`;
  $('#totalFootprint').textContent = total.toFixed(1);
  $('#activityCount').textContent = weekActivities.length;
  $('#targetProgressLabel').textContent = `${total.toFixed(1)} kg used · ${Math.max(0, weeklyTarget - total).toFixed(1)} kg remaining of ${weeklyTarget} kg`;
  $('#targetPercent').textContent = `${cappedPercent}% of weekly goal`;
  $('#targetProgressBar').style.width = `${cappedPercent}%`;
  $('#targetExcess').textContent = total > weeklyTarget ? `${(total - weeklyTarget).toFixed(1)} kg over target` : 'No excess emissions';
  $('#targetExcess').hidden = total <= weeklyTarget;
  $('#dailyAverage').textContent = (total / range.daysElapsed).toFixed(1);
  $('#dailyAverageNote').textContent = `based on ${range.daysElapsed} ${range.daysElapsed === 1 ? 'day' : 'days'}`;
  $('#trendPill').textContent = total > weeklyTarget ? `Over by ${(total - weeklyTarget).toFixed(1)} kg` : `${Math.max(0, weeklyTarget - total).toFixed(1)} kg left`;
  renderBanner(total);
  renderBreakdown(weekActivities);
  renderReport();
  renderAchievements();
  renderHistory();
}
function renderBanner(total) {
  const banner = $('#targetBanner');
  const exceeded = total > weeklyTarget;
  banner.classList.toggle('exceeded', exceeded);
  $('#bannerTitle').textContent = viewedWeekOffset === 0 ? (exceeded ? 'You’ve crossed your weekly target.' : 'You are within your weekly target.') : `Viewing ${viewedWeekOffset < 0 ? 'a previous' : 'a future'} week.`;
  $('#bannerText').textContent = viewedWeekOffset === 0 ? (exceeded ? `That’s okay — you are ${ (total - weeklyTarget).toFixed(1) } kg over. Every new choice is an opportunity to make a difference.` : `${(weeklyTarget - total).toFixed(1)} kg remains in your weekly allowance.`) : `${total.toFixed(1)} kg CO₂e recorded in this separate week.`;
  $('#nudgeSuggestions').hidden = !exceeded || viewedWeekOffset !== 0;
  $('.banner-icon').textContent = exceeded && viewedWeekOffset === 0 ? '!' : '✓';
}
function renderBreakdown(weekActivities) {
  const totals = { Travel: 0, Home: 0, Food: 0 };
  weekActivities.forEach((activity) => { totals[FACTORS[activity.type].category] += impact(activity); });
  const max = Math.max(...Object.values(totals), 1);
  $('#breakdownChart').innerHTML = Object.entries(totals).map(([category, value]) => {
    const color = category === 'Travel' ? 'travel' : category === 'Home' ? 'home' : 'food';
    return `<div class="bar-row"><span class="bar-label">${category}</span><div class="bar-track"><div class="bar-fill ${color}" style="width:${(value / max) * 100}%"></div></div><span class="bar-value">${value.toFixed(1)} kg</span></div>`;
  }).join('');
}
function renderHistory() {
  const type = $('#filterType').value;
  const selectedWeek = getWeekRange(viewedWeekOffset);
  const from = $('#filterDateFrom').value;
  const to = $('#filterDateTo').value;
  const minQuantity = Number($('#filterMinQuantity').value);
  const maxQuantity = Number($('#filterMaxQuantity').value);
  const filtered = [...activities].filter((activity) => (type === 'all' || activity.type === type) && (from || to ? (!from || activity.date >= from) && (!to || activity.date <= to) : activity.date >= selectedWeek.start && activity.date <= selectedWeek.end) && (!$('#filterMinQuantity').value || activity.quantity >= minQuantity) && (!$('#filterMaxQuantity').value || activity.quantity <= maxQuantity)).sort((a, b) => b.date.localeCompare(a.date));
  $('#historyBody').innerHTML = filtered.map((activity) => { const details = FACTORS[activity.type]; return `<tr><td>${details.label}</td><td>${activity.quantity} ${details.unit}</td><td>${impact(activity).toFixed(2)} kg CO₂e</td><td>${formatDate(activity.date)}</td><td><button class="edit-button" data-edit-id="${activity.id}" title="Edit activity" aria-label="Edit ${details.label}">Edit</button><button class="delete-button" data-id="${activity.id}" title="Delete activity" aria-label="Delete ${details.label}">×</button></td></tr>`; }).join('');
  $('#emptyState').hidden = filtered.length > 0;
}
function updatePreview() { const quantity = Number(quantityInput.value); const details = FACTORS[typeInput.value]; $('#impactPreview').textContent = quantity > 0 ? `This adds ${(quantity * details.factor).toFixed(2)} kg CO₂e` : 'Enter a quantity to preview impact'; }
function updateActivityType() { const details = FACTORS[typeInput.value]; unitInput.value = details.unit; $('#factorNote').textContent = `Factor: ${details.factor.toFixed(2)} kg CO₂e per ${details.unit}`; quantityInput.removeAttribute('max'); quantityInput.value = ''; formMessage.textContent = ''; updatePreview(); }

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const details = FACTORS[typeInput.value];
  const validation = validateQuantity(typeInput.value, quantityInput.value);
  if (validation.error) { formMessage.textContent = validation.error; pendingWarning = null; return; }
  if (validation.warning && (!pendingWarning || pendingWarning.type !== typeInput.value || pendingWarning.quantity !== validation.quantity)) { pendingWarning = { type: typeInput.value, quantity: validation.quantity }; formMessage.textContent = validation.warning; return; }
  activities.push({ id: crypto.randomUUID(), type: typeInput.value, quantity: validation.quantity, date: localDateKey(new Date()), timestamp: new Date().toISOString() });
  pendingWarning = null;
  persist(); $('#syncStatus').innerHTML = '<span class="status-dot"></span> ✓ Saved successfully'; form.reset(); typeInput.value = 'car'; updateActivityType(); render();
});
typeInput.addEventListener('change', updateActivityType);
$('#weekSelect').addEventListener('change', () => { viewedWeekOffset = Number($('#weekSelect').value); render(); });
quantityInput.addEventListener('input', updatePreview);
$('#filterType').addEventListener('change', renderHistory);
['filterDateFrom', 'filterDateTo', 'filterMinQuantity', 'filterMaxQuantity'].forEach((id) => $(`#${id}`).addEventListener('input', renderHistory));
$('#clearFilters').addEventListener('click', () => { $('#filterType').value = 'all'; ['filterDateFrom', 'filterDateTo', 'filterMinQuantity', 'filterMaxQuantity'].forEach((id) => { $(`#${id}`).value = ''; }); renderHistory(); });
document.querySelectorAll('.report-tab').forEach((tab) => tab.addEventListener('click', () => { reportPeriod = tab.dataset.period; document.querySelectorAll('.report-tab').forEach((item) => { const selected = item === tab; item.classList.toggle('active', selected); item.setAttribute('aria-selected', selected); }); renderReport(); }));
$('#chatToggle').addEventListener('click', () => { const panel = $('#chatPanel'); const isOpen = panel.getAttribute('aria-hidden') === 'false'; panel.setAttribute('aria-hidden', isOpen); $('#chatToggle').setAttribute('aria-expanded', !isOpen); panel.classList.toggle('open', !isOpen); });
$('#chatClose').addEventListener('click', () => { $('#chatPanel').setAttribute('aria-hidden', 'true'); $('#chatToggle').setAttribute('aria-expanded', 'false'); $('#chatPanel').classList.remove('open'); });
$('#chatQuestions').addEventListener('click', (event) => { const button = event.target.closest('[data-question]'); if (!button) return; const item = ASSISTANT_FAQS[Number(button.dataset.question)]; addChatMessage(item.question, 'user'); addChatMessage(item.answer(), 'assistant'); });
$('#gameOptions').addEventListener('click', (event) => { const button = event.target.closest('[data-answer]'); if (!button || gameAnswered) return; const question = activeGameQuestions[gameQuestionIndex].question; const correct = Number(button.dataset.answer) === question.answer; gameAnswered = true; if (correct) gameScore += 1; document.querySelectorAll('.game-option').forEach((option) => { option.disabled = true; if (Number(option.dataset.answer) === question.answer) option.classList.add('correct'); }); button.classList.add(correct ? 'selected-correct' : 'selected-wrong'); $('#gameFeedback').textContent = `${correct ? 'Correct. ' : 'Not quite. '}${question.explanation}`; $('#gameTip').textContent = correct ? 'Nice work. Keep going.' : 'The explanation is the useful part. Keep going.'; $('#nextQuestion').disabled = false; $('#gameScore').textContent = `${gameScore} / ${activeGameQuestions.length}`; });
$('#nextQuestion').addEventListener('click', () => { gameQuestionIndex += 1; renderGameQuestion(); });
$('#restartGame').addEventListener('click', () => { startQuiz(); renderGameQuestion(); });
$('#historyBody').addEventListener('click', (event) => { const editButton = event.target.closest('[data-edit-id]'); if (editButton) { const activity = activities.find((item) => item.id === editButton.dataset.editId); if (!activity) return; $('#editId').value = activity.id; $('#editType').innerHTML = Object.entries(FACTORS).map(([key, value]) => `<option value="${key}" ${key === activity.type ? 'selected' : ''}>${value.label}</option>`).join(''); $('#editQuantity').value = activity.quantity; $('#editDate').value = activity.date; $('#editMessage').textContent = ''; $('#editDialog').showModal(); return; } const button = event.target.closest('[data-id]'); if (!button) return; activities = activities.filter((activity) => activity.id !== button.dataset.id); persist(); render(); });
$('#editForm').addEventListener('submit', (event) => { event.preventDefault(); const activity = activities.find((item) => item.id === $('#editId').value); const type = $('#editType').value; const validation = validateQuantity(type, $('#editQuantity').value); if (!activity || validation.error) { $('#editMessage').textContent = validation.error || '⚠ This activity could not be found.'; return; } if (validation.warning && !window.confirm(`${validation.warning}\n\nChoose OK to save this intentional entry, or Cancel to review it.`)) return; activity.type = type; activity.quantity = validation.quantity; activity.date = $('#editDate').value; activity.timestamp = activity.timestamp || new Date().toISOString(); persist(); $('#editDialog').close(); render(); });
document.querySelectorAll('#editCancel, #editClose').forEach((button) => button.addEventListener('click', () => $('#editDialog').close()));
window.addEventListener('storage', (event) => { if (event.key === STORAGE_KEY) syncActivitiesFromStorage(); if (event.key === TARGET_KEY) { weeklyTarget = Number(event.newValue) || 40; render(); } });
$('#editTarget').addEventListener('click', () => { $('#targetInput').value = weeklyTarget; $('#targetDialog').showModal(); });
$('#targetForm').addEventListener('submit', (event) => { event.preventDefault(); const value = Number($('#targetInput').value); if (value >= 1 && value <= 1000) { weeklyTarget = value; persist(); $('#targetDialog').close(); render(); } });
$('#resetData').addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(TARGET_KEY); window.location.reload(); });
$('#exportCsv').addEventListener('click', () => { const rows = [['Activity', 'Quantity', 'Unit', 'Impact (kg CO2e)', 'Date'], ...activities.map((activity) => { const details = FACTORS[activity.type]; return [details.label, activity.quantity, details.unit, impact(activity).toFixed(2), activity.date]; })]; const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = `verdio-report-${localDateKey(new Date())}.csv`; link.click(); URL.revokeObjectURL(link.href); });
$('#exportPdf').addEventListener('click', () => { const report = window.open('', '_blank'); report.document.write(`<title>verdio carbon report</title><h1>verdio carbon report</h1><p>Generated ${new Date().toLocaleDateString()}</p><p>Weekly footprint: ${$('#totalFootprint').textContent} kg CO2e</p><p>Target: ${weeklyTarget} kg CO2e</p><p>Activities logged: ${activities.length}</p>`); report.document.close(); report.print(); });
themeSelect.addEventListener('change', () => { localStorage.setItem(THEME_KEY, themeSelect.value); applyTheme(themeSelect.value); });
systemTheme.addEventListener('change', () => { if ((localStorage.getItem(THEME_KEY) || 'system') === 'system') applyTheme('system'); });
document.querySelectorAll('.auth-tab').forEach((tab) => tab.addEventListener('click', () => setAuthMode(tab.dataset.authMode)));
$('#authPassword').addEventListener('input', updatePasswordRules);
$('#passwordToggle').addEventListener('click', () => { const password = $('#authPassword'); const visible = password.type === 'text'; password.type = visible ? 'password' : 'text'; $('#passwordToggle').textContent = visible ? 'Show' : 'Hide'; $('#passwordToggle').setAttribute('aria-label', visible ? 'Show password' : 'Hide password'); });
$('#authForm').addEventListener('submit', (event) => { event.preventDefault(); const email = $('#authEmail').value.trim(); const password = $('#authPassword').value; const message = $('#authMessage'); if (authMode === 'signup') { const username = $('#authUsername').value.trim(); if (username.length < 3) { message.textContent = 'Choose a username with at least 3 characters.'; return; } if (!validatePassword(password)) { message.textContent = 'Use all five password requirements before creating your account.'; return; } if (password !== $('#authConfirm').value) { message.textContent = 'Your password confirmations do not match.'; return; } localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ username, email, password })); completeAuth(username, email); return; } const account = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null'); if (account && (account.email !== email || account.password !== password)) { message.textContent = 'That email or password does not match this local demo account.'; return; } if (!email || !password) { message.textContent = 'Enter your email and password to continue.'; return; } completeAuth(account?.username || email.split('@')[0], email); });
$('#googleSignIn').addEventListener('click', () => completeAuth('Google user', 'google-user@verdio.local'));
$('#forgotPassword').addEventListener('click', () => { $('#authMessage').textContent = 'For this local demo, create a new account or use the password saved in this browser.'; });
$('#profileButton').addEventListener('click', () => { localStorage.removeItem(AUTH_KEY); sessionStorage.removeItem(AUTH_KEY); showAuth(); setAuthMode('signin'); });
applyTheme(localStorage.getItem(THEME_KEY) || 'system');
renderChatQuestions();
startQuiz();
renderGameQuestion();
const savedAuth = JSON.parse(localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY) || 'null');
if (savedAuth) showTracker(savedAuth.username);
updateActivityType(); render();
