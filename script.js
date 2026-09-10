/**
 * 密斑刺鲀基因数据库 - 前端逻辑
 */

// ========== Supabase 配置 ==========
const SUPABASE_URL = 'https://yvmkkeuskeqahodxiaop.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1aDEzTYOyuFmoNM8aqkhZA_PS2WSp5t';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========== 全局数据 ==========
let allGenes = [];
let allSeq = [];
let allExpr = [];
let allTissues = new Set();

// emoji 头像列表
const EMOJIS = ['🐟','🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐤','🐦','🐧','🦆','🦅','🦉','🐴','🦄','🐝','🐞','🦋','🐢','🐍','🐙','🦑','🐡','🐋','🐳','🐟','🦈','🦭','🐊','🐘','🦒','🦓','🐪','🐫','🦘','🐑','🐏','🐎','🐕','🐈','🦜','🦚','🦢','🕊️','🦩','🌵','🎄','🌱','🌴','🌳','🌲','🌿','🍀','🌹','🌻','🌸','🌼','🍁','🍄','🐚','🌊'];

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initWelcome();
    initVisitCount();
    initEmojiSelect();
    initBackTop();
    await loadData();
});

// ========== 新访客弹窗 ==========
function initWelcome() {
    if (!localStorage.getItem('db_welcomed')) {
        setTimeout(() => {
            document.getElementById('welcomeModal').style.display = 'flex';
        }, 500);
    }
}
function closeWelcome() {
    document.getElementById('welcomeModal').style.display = 'none';
    localStorage.setItem('db_welcomed', '1');
}

// ========== 深浅色模式 ==========
function initTheme() {
    const saved = localStorage.getItem('db_theme');
    if (saved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeIcon').textContent = '☀️';
    }
}
function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('db_theme', 'light');
        document.getElementById('themeIcon').textContent = '🌙';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('db_theme', 'dark');
        document.getElementById('themeIcon').textContent = '☀️';
    }
}

// ========== 访问统计 ==========
function initVisitCount() {
    let count = parseInt(localStorage.getItem('db_visits') || '0');
    count++;
    localStorage.setItem('db_visits', count);
    document.getElementById('visitCount').textContent = count;
}

// ========== emoji 下拉 ==========
function initEmojiSelect() {
    const sel = document.getElementById('commentEmoji');
    EMOJIS.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e;
        opt.textContent = e;
        sel.appendChild(opt);
    });
}

// ========== 返回顶部 ==========
function initBackTop() {
    window.addEventListener('scroll', () => {
        const btn = document.getElementById('backTop');
        if (window.scrollY > 300) btn.style.display = 'block';
        else btn.style.display = 'none';
    });
}
function scrollTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

// ========== 数据加载 ==========
async function loadData() {
    try {
        const [genesRes, seqRes, exprRes] = await Promise.all([
            sb.from('gene_info').select('*').order('gene_id'),
            sb.from('gene_sequence').select('*'),
            sb.from('expression_data').select('*')
        ]);
        allGenes = genesRes.data || [];
        allSeq = seqRes.data || [];
        allExpr = exprRes.data || [];
        allExpr.forEach(e => allTissues.add(e.tissue));

        document.getElementById('statGenes').textContent = allGenes.length;
        document.getElementById('statSeq').textContent = allSeq.length;
        document.getElementById('statExpr').textContent = allExpr.length;
        document.getElementById('statTissues').textContent = allTissues.size;

        // 染色体筛选
        const chrs = [...new Set(allGenes.map(g => g.chromosome).filter(Boolean))].sort();
        const chrFilter = document.getElementById('chrFilter');
        chrs.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c; opt.textContent = c;
            chrFilter.appendChild(opt);
        });

        renderGeneTable();
        renderSeqTable();
        renderTissueGrid();
        renderOverviewChart();
        renderFullExprChart();
        loadComments();
    } catch (err) {
        console.error('数据加载失败:', err);
    }
}

// ========== 页面切换 ==========
function goPage(page) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById('page-' + page).style.display = 'block';
    window.scrollTo({ top: 0 });
}
function goHome() { goPage('home'); }

// ========== 表格渲染 ==========
function renderGeneTable() {
    const kw = (document.getElementById('geneFilter')?.value || '').toLowerCase();
    const chr = document.getElementById('chrFilter')?.value || '';
    const filtered = allGenes.filter(g => {
        const mk = !kw || g.gene_name.toLowerCase().includes(kw) ||
                   g.gene_desc.toLowerCase().includes(kw) ||
                   g.gene_id.toLowerCase().includes(kw);
        const mc = !chr || g.chromosome === chr;
        return mk && mc;
    });

    const home = document.getElementById('geneTable');
    if (home) home.innerHTML = filtered.map(g => `
        <tr onclick="showDetail('${g.gene_id}')" style="cursor:pointer;">
            <td>${g.gene_id}</td><td><strong>${g.gene_name}</strong></td>
            <td>${g.gene_desc || '-'}</td><td>${g.chromosome || '-'}</td>
            <td><button class="btn-detail" onclick="event.stopPropagation();showDetail('${g.gene_id}')">详情</button></td>
        </tr>`).join('') || '<tr><td colspan="5" class="loading">未找到</td></tr>';

    const all = document.getElementById('allGeneTable');
    if (all) all.innerHTML = filtered.map(g => `
        <tr onclick="showDetail('${g.gene_id}')" style="cursor:pointer;">
            <td>${g.gene_id}</td><td><strong>${g.gene_name}</strong></td>
            <td>${g.gene_desc || '-'}</td><td>${g.chromosome || '-'}</td>
            <td>${g.strand || '-'}</td>
            <td><button class="btn-detail" onclick="event.stopPropagation();showDetail('${g.gene_id}')">详情</button></td>
        </tr>`).join('') || '<tr><td colspan="6" class="loading">未找到</td></tr>';
}

function renderSeqTable() {
    const el = document.getElementById('seqTable');
    if (!el) return;
    el.innerHTML = allSeq.map(s => `
        <tr>
            <td>${s.gene_id}</td><td>${s.cds_length || '-'}</td>
            <td>${s.protein_length || '-'}</td><td>${s.gc_content || '-'}</td>
            <td><button class="btn-detail" onclick="showDetail('${s.gene_id}')">查看</button></td>
        </tr>`).join('') || '<tr><td colspan="5" class="loading">暂无序列</td></tr>';
}

function renderTissueGrid() {
    const el = document.getElementById('tissueList');
    if (!el) return;
    const tissues = [...allTissues].map(t => ({
        name: t,
        count: allExpr.filter(e => e.tissue === t).length
    }));
    el.innerHTML = tissues.map(t => `
        <div class="tissue-card">
            <div class="tissue-name">${t.name}</div>
            <div class="tissue-count">${t.count} 条表达记录</div>
        </div>`).join('') || '<div class="loading">暂无组织数据</div>';
}

// ========== 图表 ==========
function renderOverviewChart() {
    const el = document.getElementById('chartOverview');
    if (!el || allGenes.length === 0) return;
    const chart = echarts.init(el);
    const tissues = [...allTissues];
    const genes = allGenes.slice(0, 6).map(g => g.gene_name);
    chart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: tissues, bottom: 0, textStyle: { fontSize: 11 } },
        grid: { left: '3%', right: '4%', bottom: '18%', containLabel: true },
        xAxis: { type: 'category', data: genes, axisLabel: { rotate: 30, fontSize: 11 } },
        yAxis: { type: 'value', name: 'TPM' },
        series: tissues.map(t => ({
            name: t, type: 'bar',
            data: genes.map(n => {
                const g = allGenes.find(x => x.gene_name === n);
                const r = allExpr.find(e => e.gene_id === g.gene_id && e.tissue === t);
                return r ? r.tpm : 0;
            })
        }))
    });
}

function renderFullExprChart() {
    const el = document.getElementById('chartExprFull');
    if (!el || allGenes.length === 0) return;
    const chart = echarts.init(el);
    const tissues = [...allTissues];
    const genes = allGenes.map(g => g.gene_name);
    chart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: tissues, bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: { type: 'category', data: genes, axisLabel: { rotate: 35 } },
        yAxis: { type: 'value', name: 'TPM' },
        series: tissues.map(t => ({
            name: t, type: 'bar',
            data: genes.map(n => {
                const g = allGenes.find(x => x.gene_name === n);
                const r = allExpr.find(e => e.gene_id === g.gene_id && e.tissue === t);
                return r ? r.tpm : 0;
            })
        }))
    });
}

// ========== 搜索 ==========
function getHistory() {
    try { return JSON.parse(localStorage.getItem('db_search_history') || '[]'); }
    catch { return []; }
}
function saveHistory(list) {
    localStorage.setItem('db_search_history', JSON.stringify(list.slice(0, 10)));
}

function showSearchPanel() {
    renderHistoryList();
    renderSuggest('');
    document.getElementById('searchPanel').style.display = 'block';
}
function hideSearchPanel() {
    document.getElementById('searchPanel').style.display = 'none';
}

function renderHistoryList() {
    const list = getHistory();
    const el = document.getElementById('historyList');
    const empty = document.getElementById('historyEmpty');
    if (list.length === 0) {
        el.innerHTML = ''; empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    el.innerHTML = list.map((h, i) => `
        <div class="history-item" onclick="pickHistory('${h}')">
            <span>🔍 ${h}</span>
            <button class="history-del" onclick="event.stopPropagation();delHistory(${i})">✕</button>
        </div>`).join('');
}

function renderSuggest(kw) {
    const el = document.getElementById('suggestList');
    const matches = kw
        ? allGenes.filter(g => g.gene_name.toLowerCase().includes(kw.toLowerCase()) ||
                               g.gene_id.toLowerCase().includes(kw.toLowerCase()) ||
                               g.gene_desc.toLowerCase().includes(kw.toLowerCase())).slice(0, 8)
        : allGenes.slice(0, 6);
    el.innerHTML = matches.map(g => `
        <div class="suggest-item" onclick="pickSuggest('${g.gene_name}')">
            <strong>${g.gene_name}</strong>
            <span style="color:#888;font-size:12px;">${g.gene_id} · ${g.gene_desc}</span>
        </div>`).join('') || '<div class="history-empty">无匹配基因</div>';
}

function onSearchInput() {
    const kw = document.getElementById('searchInput').value;
    renderSuggest(kw);
    document.getElementById('searchPanel').style.display = 'block';
}

function pickHistory(kw) {
    document.getElementById('searchInput').value = kw;
    doSearch();
}
function pickSuggest(name) {
    document.getElementById('searchInput').value = name;
    doSearch();
}
function delHistory(i) {
    const list = getHistory();
    list.splice(i, 1);
    saveHistory(list);
    renderHistoryList();
}
function clearHistory() {
    localStorage.removeItem('db_search_history');
    renderHistoryList();
}

function doSearch() {
    const kw = document.getElementById('searchInput').value.trim();
    if (!kw) return;
    // 存历史
    let list = getHistory().filter(h => h !== kw);
    list.unshift(kw);
    saveHistory(list.slice(0, 10));
    hideSearchPanel();

    // 搜索结果
    const results = allGenes.filter(g =>
        g.gene_name.toLowerCase().includes(kw.toLowerCase()) ||
        g.gene_id.toLowerCase().includes(kw.toLowerCase()) ||
        (g.gene_desc && g.gene_desc.toLowerCase().includes(kw.toLowerCase()))
    );
    const body = document.getElementById('searchResultBody');
    if (results.length === 0) {
        body.innerHTML = '<div class="loading">未找到相关基因</div>';
    } else {
        const hl = (text) => text.replace(new RegExp(`(${kw})`, 'gi'), '<span style="background:var(--primary);padding:0 3px;border-radius:3px;">$1</span>');
        body.innerHTML = results.map(g => `
            <div class="comment-card" style="margin-bottom:12px;cursor:pointer;" onclick="closeSearchModal();showDetail('${g.gene_id}')">
                <div style="font-weight:600;color:var(--title);margin-bottom:4px;">${hl(g.gene_name)} <small style="color:#888;">${g.gene_id}</small></div>
                <div style="font-size:13px;color:var(--text);">${hl(g.gene_desc || '')}</div>
            </div>`).join('');
    }
    document.getElementById('searchModal').style.display = 'flex';
}
function closeSearchModal() { document.getElementById('searchModal').style.display = 'none'; }

// 点击外部关闭搜索面板
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) hideSearchPanel();
});

// ========== 基因详情 ==========
function showDetail(geneId) {
    const g = allGenes.find(x => x.gene_id === geneId);
    if (!g) return;
    document.getElementById('modalTitle').textContent = `${g.gene_name} (${g.gene_id})`;
    document.getElementById('modal').style.display = 'flex';

    document.getElementById('detailBasic').innerHTML = `
        <div class="detail-item"><div class="label">基因ID</div><div class="value">${g.gene_id}</div></div>
        <div class="detail-item"><div class="label">基因名称</div><div class="value">${g.gene_name}</div></div>
        <div class="detail-item"><div class="label">生物类型</div><div class="value">${g.gene_biotype || '-'}</div></div>
        <div class="detail-item"><div class="label">染色体定位</div><div class="value">${g.chromosome || '-'} : ${g.start_pos || '-'}-${g.end_pos || '-'}</div></div>
        <div class="detail-item"><div class="label">链方向</div><div class="value">${g.strand || '-'}</div></div>
        <div class="detail-item"><div class="label">功能描述</div><div class="value">${g.gene_desc || '-'}</div></div>`;

    const seq = allSeq.find(s => s.gene_id === geneId);
    const seqEl = document.getElementById('detailSeq');
    if (seq) {
        seqEl.innerHTML = `
            <div class="seq-box">
                <div class="seq-title">CDS序列 (${seq.cds_length || '-'} bp, GC: ${seq.gc_content || '-'}%)
                    <button class="btn-secondary" style="padding:3px 10px;font-size:12px;float:right;" onclick="copySeq('${seq.cds_sequence}')">复制</button>
                </div>
                <div class="seq-text">${seq.cds_sequence || '暂无'}</div>
            </div>
            <div class="seq-box">
                <div class="seq-title">蛋白序列 (${seq.protein_length || '-'} aa)
                    <button class="btn-secondary" style="padding:3px 10px;font-size:12px;float:right;" onclick="copySeq('${seq.protein_sequence}')">复制</button>
                </div>
                <div class="seq-text">${seq.protein_sequence || '暂无'}</div>
            </div>`;
    } else {
        seqEl.innerHTML = '<div class="loading">该基因暂无序列数据</div>';
    }

    const expr = allExpr.filter(e => e.gene_id === geneId);
    const chartEl = document.getElementById('detailChart');
    if (expr.length > 0) {
        chartEl.innerHTML = '';
        const chart = echarts.init(chartEl);
        chart.setOption({
            tooltip: { trigger: 'axis' },
            grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
            xAxis: { type: 'category', data: expr.map(e => e.tissue) },
            yAxis: { type: 'value', name: 'TPM' },
            series: [{ name: 'TPM', type: 'bar', data: expr.map(e => e.tpm),
                       itemStyle: { color: '#B89FE8' } }]
        });
    } else {
        chartEl.innerHTML = '<div class="loading">暂无表达量数据</div>';
    }
}
function closeModal() { document.getElementById('modal').style.display = 'none'; }
function copySeq(text) {
    navigator.clipboard.writeText(text).then(() => {
        const tip = document.getElementById('commentTip');
        tip.textContent = '已复制到剪贴板';
        setTimeout(() => tip.textContent = '', 2000);
    });
}
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// ========== 评论区 ==========
let lastSubmit = 0;
const BAD_WORDS = ['色情','赌博','毒品','诈骗','广告'];

function getComments() {
    try { return JSON.parse(localStorage.getItem('db_comments') || '[]'); }
    catch { return []; }
}
function saveComments(list) {
    localStorage.setItem('db_comments', JSON.stringify(list));
}

function loadComments() {
    const list = getComments();
    document.getElementById('statComments').textContent = list.length;
    const el = document.getElementById('commentList');
    if (list.length === 0) {
        el.innerHTML = '<div class="loading">暂无留言，来抢沙发吧～</div>';
        return;
    }
    el.innerHTML = list.map((c, i) => `
        <div class="comment-card">
            <div class="comment-head">
                <span class="comment-avatar">${c.emoji}</span>
                <span class="comment-name">${esc(c.name)}</span>
                <span class="comment-time">${c.time}</span>
            </div>
            <div class="comment-body">${esc(c.content)}</div>
            ${c.replies && c.replies.length ? `<button class="reply-toggle" onclick="toggleReplies(${i})">展开${c.replies.length}条回复</button>
            <div class="reply-list" id="replies-${i}" style="display:none;">
                ${c.replies.map(r => `
                    <div class="comment-card" style="padding:10px;">
                        <div class="comment-head">
                            <span class="comment-avatar">${r.emoji}</span>
                            <span class="comment-name">${esc(r.name)}</span>
                            <span class="comment-time">${r.time}</span>
                        </div>
                        <div class="comment-body">${esc(r.content)}</div>
                    </div>`).join('')}
            </div>` : ''}
        </div>`).join('');
}

function toggleReplies(i) {
    const el = document.getElementById('replies-' + i);
    el.style.display = el.style.display === 'none' ? 'flex' : 'none';
}

function submitComment() {
    const now = Date.now();
    if (now - lastSubmit < 15000) {
        document.getElementById('commentTip').textContent = '提交太频繁，请15秒后再试';
        return;
    }
    const name = document.getElementById('commentName').value.trim();
    const content = document.getElementById('commentContent').value.trim();
    const emoji = document.getElementById('commentEmoji').value;
    const email = document.getElementById('commentEmail').value.trim();

    if (!name || !content) {
        document.getElementById('commentTip').textContent = '昵称和留言内容为必填项';
        return;
    }
    if (BAD_WORDS.some(w => content.includes(w))) {
        document.getElementById('commentTip').textContent = '内容包含违规词，请修改后提交';
        return;
    }

    const list = getComments();
    list.unshift({
        name, content, emoji, email,
        time: formatTime(now),
        replies: []
    });
    saveComments(list);
    lastSubmit = now;
    document.getElementById('commentContent').value = '';
    document.getElementById('commentTip').textContent = '留言成功！';
    loadComments();
}

function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}
function formatTime(ts) {
    const d = new Date(ts);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
