const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = window.APP_CONFIG;
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
const RATINGS = ['satisfied', 'neutral', 'dissatisfied'];

function show(name) {
  for (const s of ['student', 'login', 'admin']) $(s).classList.toggle('hidden', s !== name);
  $('authBtn').classList.toggle('hidden', name === 'admin');
}

// 학생 투표
document.querySelectorAll('.vote').forEach((btn) => {
  btn.onclick = async () => {
    const all = document.querySelectorAll('.vote');
    all.forEach((b) => (b.disabled = true));
    const { error } = await sb.from('votes').insert({ rating: btn.dataset.r });
    const m = $('voteMsg');
    m.className = 'msg ' + (error ? 'err' : 'ok');
    m.textContent = error ? '저장에 실패했습니다. 다시 시도해 주세요.' : '투표가 완료되었습니다. 감사합니다.';
    all.forEach((b) => (b.disabled = false));
  };
});

// 관리자 로그인
$('authBtn').onclick = () => { $('voteMsg').textContent = ''; show('login'); };
$('backBtn').onclick = () => show('student');
$('loginForm').onsubmit = async (e) => {
  e.preventDefault();
  $('loginMsg').textContent = '';
  const { error } = await sb.auth.signInWithPassword({ email: $('email').value, password: $('password').value });
  if (error) { $('loginMsg').textContent = '로그인에 실패했습니다.'; return; }
  $('password').value = '';
  await enterAdmin();
};

async function loadResults() {
  $('adminMsg').textContent = '';
  const { data, error } = await sb.from('votes').select('rating');
  if (error) { $('adminMsg').textContent = '결과를 불러오지 못했습니다.'; return; }
  const counts = Object.fromEntries(RATINGS.map((r) => [r, 0]));
  data.forEach((v) => counts[v.rating]++);
  const total = data.length;
  $('total').textContent = total;
  RATINGS.forEach((r) => {
    const pct = total ? Math.round((counts[r] / total) * 1000) / 10 : 0;
    $('t-' + r).textContent = `${counts[r]}표 (${pct}%)`;
    $('b-' + r).style.width = pct + '%';
  });
}

async function enterAdmin() { show('admin'); await loadResults(); }

$('refreshBtn').onclick = loadResults;
$('resetBtn').onclick = async () => {
  if (!confirm('모든 투표 결과를 초기화하시겠습니까? 삭제된 결과는 복구할 수 없습니다.')) return;
  const { error } = await sb.from('votes').delete().gte('id', 0);
  if (error) { $('adminMsg').textContent = '초기화에 실패했습니다.'; return; }
  await loadResults();
};
$('logoutBtn').onclick = async () => { await sb.auth.signOut(); show('student'); };

// 기존 세션 복원
sb.auth.getSession().then(({ data }) => { if (data.session) enterAdmin(); });
