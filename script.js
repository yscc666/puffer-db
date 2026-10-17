/**
 * DiodonDB - 密斑刺鲀基因数据库前端逻辑
 * v1.1 (对标国际生物数据库风格)
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
let allGO = [];
let allKegg = [];
let allDomains = [];
let geneSortKey = 'gene_id';
let geneSortDir = 'asc';
let genePage = 1;
const PAGE_SIZE = 5;

// emoji 头像列表
const EMOJIS = ['🐟','🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐤','🐦','🐧','🦆','🦅','🦉','🐴','🦄','🐝','🐞','🦋','🐢','🐍','🐙','🦑','🐡','🐋','🐳','🐟','🦈','🦭','🐊','🐘','🦒','🦓','🐪','🐫','🦘','🐑','🐏','🐎','🐕','🐈','🦜','🦚','🦢','🕊️','🦩','🌵','🎄','🌱','🌴','🌳','🌲','🌿','🍀','🌹','🌻','🌸','🌼','🍁','🍄','🐚','🌊'];

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initWelcome();
    initVisitCount();
    initEmojiSelect();
    initBackTop();
    setActiveNav('home');
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
        const [genesRes, seqRes, exprRes, goRes, keggRes, domRes] = await Promise.all([
            sb.from('gene_info').select('*').order('gene_id'),
            sb.from('gene_sequence').select('*'),
            sb.from('expression_data').select('*'),
            sb.from('go_annotation').select('*'),
            sb.from('kegg_pathway').select('*'),
            sb.from('protein_domain').select('*')
        ]);
        allGenes = genesRes.data || [];
        allSeq = seqRes.data || [];
        allExpr = exprRes.data || [];
        allGO = goRes.data || [];
        allKegg = keggRes.data || [];
        allDomains = domRes.data || [];
        allExpr.forEach(e => allTissues.add(e.tissue));

        document.getElementById('statGenes').textContent = allGenes.length;
        document.getElementById('statSeq').textContent = allSeq.length;
        document.getElementById('statExpr').textContent = allExpr.length;
        document.getElementById('statTissues').textContent = allTissues.size;
        document.getElementById('statGO').textContent = allGO.length;
        document.getElementById('statKegg').textContent = allKegg.length;
        const el1 = document.getElementById('statGenes2');
        if (el1) el1.textContent = allGenes.length;
        const el2 = document.getElementById('statSeq2');
        if (el2) el2.textContent = allSeq.length;
        const el3 = document.getElementById('statExpr2');
        if (el3) el3.textContent = allExpr.length;
        const el4 = document.getElementById('statTissues2');
        if (el4) el4.textContent = allTissues.size;

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
        renderFullExprChart();
        renderChrDist();
        renderHeatmap();
        renderSeqStats();
        loadComments();
    } catch (err) {
        console.error('数据加载失败:', err);
    }
}

// ========== 页面切换与导航高亮 ==========
function goPage(page) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    const el = document.getElementById('page-' + page);
    if (el) el.style.display = 'block';
    setActiveNav(page);
    window.scrollTo({ top: 0 });
    if (page === 'genes') { renderGeneTable(); renderChrDist(); renderSeqStats(); }
    if (page === 'expression') { renderFullExprChart(); renderHeatmap(); }
}
function goHome() { goPage('home'); }
function setActiveNav(page) {
    document.querySelectorAll('.nav-link').forEach(a => {
        a.classList.toggle('active', a.getAttribute('data-page') === page);
    });
}

// ========== 基因表格（排序 + 筛选 + 分页） ==========
function getFilteredGenes() {
    const kw = (document.getElementById('geneFilter')?.value || '').toLowerCase();
    const chr = document.getElementById('chrFilter')?.value || '';
    let list = allGenes.filter(g => {
        const mk = !kw || (g.gene_name || '').toLowerCase().includes(kw) ||
                   (g.gene_desc || '').toLowerCase().includes(kw) ||
                   (g.gene_id || '').toLowerCase().includes(kw);
        const mc = !chr || g.chromosome === chr;
        return mk && mc;
    });
    // 排序
    list.sort((a, b) => {
        const va = a[geneSortKey] ?? '';
        const vb = b[geneSortKey] ?? '';
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
        return geneSortDir === 'asc' ? cmp : -cmp;
    });
    return list;
}

function sortGeneTable(key) {
    if (geneSortKey === key) {
        geneSortDir = geneSortDir === 'asc' ? 'desc' : 'asc';
    } else {
        geneSortKey = key;
        geneSortDir = 'asc';
    }
    genePage = 1;
    // 更新表头箭头
    document.querySelectorAll('#geneTable th.sortable').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (th.getAttribute('data-sort') === key) {
            th.classList.add(geneSortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
    });
    renderGeneTable();
}

function resetGeneFilter() {
    document.getElementById('geneFilter').value = '';
    document.getElementById('chrFilter').value = '';
    geneSortKey = 'gene_id'; geneSortDir = 'asc'; genePage = 1;
    document.querySelectorAll('#geneTable th.sortable').forEach(th => th.classList.remove('sorted-asc', 'sorted-desc'));
    renderGeneTable();
}

function renderGeneTable() {
    const all = document.getElementById('allGeneTable');
    if (!all) return;
    const filtered = getFilteredGenes();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (genePage > totalPages) genePage = totalPages;
    const start = (genePage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);

    if (pageItems.length === 0) {
        all.innerHTML = '<tr><td colspan="6" class="loading">未找到匹配基因</td></tr>';
    } else {
        all.innerHTML = pageItems.map((g, i) => `
            <tr onclick="showDetail('${g.gene_id}')" style="cursor:pointer;">
                <td>${start + i + 1}</td>
                <td class="gene-id">${g.gene_id}</td>
                <td><strong>${g.gene_name}</strong></td>
                <td>${g.gene_desc || '-'}</td>
                <td>${g.chromosome || '-'}</td>
                <td>${g.strand || '-'}</td>
                <td><button class="btn-detail" onclick="event.stopPropagation();showDetail('${g.gene_id}')">详情</button></td>
            </tr>`).join('');
    }
    renderPagination(filtered.length, totalPages);
}

function renderPagination(total, totalPages) {
    const el = document.getElementById('genePagination');
    if (!el) return;
    if (total <= PAGE_SIZE) {
        el.innerHTML = '';
        return;
    }
    let html = `<span class="page-info">共 ${total} 条 · 第 ${genePage}/${totalPages} 页</span>`;
    html += `<button class="page-btn" onclick="genePage=1;renderGeneTable()" ${genePage===1?'disabled':''}>«</button>`;
    html += `<button class="page-btn" onclick="genePage--;renderGeneTable()" ${genePage===1?'disabled':''}>‹</button>`;
    for (let p = 1; p <= totalPages; p++) {
        if (p === genePage || p === 1 || p === totalPages || Math.abs(p - genePage) <= 1) {
            html += `<button class="page-btn ${p===genePage?'active':''}" onclick="genePage=${p};renderGeneTable()">${p}</button>`;
        } else if (p === genePage - 2 || p === genePage + 2) {
            html += `<span class="page-info">…</span>`;
        }
    }
    html += `<button class="page-btn" onclick="genePage++;renderGeneTable()" ${genePage===totalPages?'disabled':''}>›</button>`;
    html += `<button class="page-btn" onclick="genePage=${totalPages};renderGeneTable()" ${genePage===totalPages?'disabled':''}>»</button>`;
    el.innerHTML = html;
}

// ========== 序列表格 ==========
function renderSeqTable() {
    const el = document.getElementById('seqTable');
    if (!el) return;
    el.innerHTML = allSeq.map((s, i) => {
        const g = allGenes.find(x => x.gene_id === s.gene_id);
        return `
        <tr>
            <td>${i + 1}</td>
            <td class="gene-id">${s.gene_id}</td>
            <td><strong>${g ? g.gene_name : '-'}</strong></td>
            <td>${s.cds_length || '-'}</td>
            <td>${s.protein_length || '-'}</td>
            <td>${s.gc_content || '-'}</td>
            <td><button class="btn-detail" onclick="showDetail('${s.gene_id}')">查看</button></td>
        </tr>`;
    }).join('') || '<tr><td colspan="7" class="loading">暂无序列</td></tr>';
}

// ========== 组织卡片 ==========
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

// ========== 表达量总览图 ==========
function renderFullExprChart() {
    const el = document.getElementById('chartExprFull');
    if (!el || allGenes.length === 0) return;
    const chart = echarts.init(el);
    const tissues = [...allTissues];
    const genes = allGenes.map(g => g.gene_name);
    chart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: tissues, bottom: 0, type: 'scroll' },
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

// ========== 染色体分布图 ==========
function renderChrDist() {
    const el = document.getElementById('chrDistChart');
    if (!el || allGenes.length === 0) return;
    if (el.__init) { el.__init.dispose(); }
    const chart = echarts.init(el);
    el.__init = chart;
    const chrs = [...new Set(allGenes.map(g => g.chromosome).filter(Boolean))].sort((a, b) => {
        const na = parseInt(a.replace('chr', '')), nb = parseInt(b.replace('chr', ''));
        return na - nb;
    });
    chart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: chrs, name: '染色体' },
        yAxis: { type: 'value', name: '基因数', minInterval: 1 },
        series: [{
            name: '基因数', type: 'bar', barMaxWidth: 46,
            data: chrs.map(c => allGenes.filter(g => g.chromosome === c).length),
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#a29bfe' }, { offset: 1, color: '#74b9ff' }
                ]),
                borderRadius: [6, 6, 0, 0]
            },
            label: { show: true, position: 'top' }
        }]
    });
}

// ========== 表达热图 ==========
function renderHeatmap() {
    const el = document.getElementById('chartHeatmap');
    if (!el || allGenes.length === 0 || allTissues.size === 0) return;
    if (el.__init) { el.__init.dispose(); }
    const chart = echarts.init(el);
    el.__init = chart;
    const tissues = [...allTissues];
    const genes = allGenes.map(g => g.gene_name);
    const data = [];
    let maxV = 1;
    genes.forEach((n, gi) => {
        const g = allGenes[gi];
        tissues.forEach((t, ti) => {
            const r = allExpr.find(e => e.gene_id === g.gene_id && e.tissue === t);
            const v = r ? r.tpm : 0;
            if (v > maxV) maxV = v;
            data.push([ti, gi, v]);
        });
    });
    chart.setOption({
        tooltip: {
            position: 'top',
            formatter: p => `${tissues[p.value[0]]} · ${genes[p.value[1]]}<br/>TPM: <strong>${p.value[2]}</strong>`
        },
        grid: { left: '3%', right: '12%', bottom: '10%', top: '3%', containLabel: true },
        xAxis: { type: 'category', data: tissues, name: '组织', splitArea: { show: true } },
        yAxis: { type: 'category', data: genes, name: '基因', splitArea: { show: true } },
        visualMap: {
            min: 0, max: maxV, calculable: true, orient: 'vertical', right: 0, top: 'center',
            inRange: { color: ['#f6f3ff', '#c9b6f5', '#8e7bd6', '#5b4a9e'] }
        },
        series: [{
            name: 'TPM', type: 'heatmap',
            data, label: { show: false },
            emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.2)' } }
        }]
    });
}

// ========== 导出基因 CSV ==========
function exportGeneCSV() {
    const headers = ['gene_id', 'gene_name', 'gene_desc', 'gene_biotype', 'chromosome', 'start_pos', 'end_pos', 'strand'];
    const rows = allGenes.map(g => headers.map(h => {
        let v = g[h] ?? '';
        if (typeof v === 'string' && (v.includes(',') || v.includes('"'))) {
            v = '"' + v.replace(/"/g, '""') + '"';
        }
        return v;
    }).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DiodonDB_gene_info.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ========== 序列特征统计 ==========
function renderSeqStats() {
    const cdsEl = document.getElementById('cdsLenChart');
    const gcEl = document.getElementById('gcDistChart');
    if (!cdsEl || !gcEl || allSeq.length === 0) return;
    // CDS 长度分段
    const bins = [
        { label: '< 500', min: 0, max: 499 },
        { label: '500-1000', min: 500, max: 999 },
        { label: '1000-1500', min: 1000, max: 1499 },
        { label: '1500-2000', min: 1500, max: 1999 },
        { label: '≥ 2000', min: 2000, max: 1e9 }
    ];
    const cdsData = bins.map(b => allSeq.filter(s => (s.cds_length ?? 0) >= b.min && (s.cds_length ?? 0) <= b.max).length);
    if (cdsEl.__init) cdsEl.__init.dispose();
    const c1 = echarts.init(cdsEl); cdsEl.__init = c1;
    c1.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: '4%', right: '4%', bottom: '4%', top: '8%', containLabel: true },
        xAxis: { type: 'category', data: bins.map(b => b.label) },
        yAxis: { type: 'value', minInterval: 1 },
        series: [{ type: 'bar', barMaxWidth: 40, data: cdsData,
            itemStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#a29bfe'},{offset:1,color:'#74b9ff'}]), borderRadius: [5,5,0,0] },
            label: { show: true, position: 'top' } }]
    });
    // GC 含量分段
    const gcBins = [
        { label: '< 40', min: 0, max: 39.99 },
        { label: '40-45', min: 40, max: 44.99 },
        { label: '45-50', min: 45, max: 49.99 },
        { label: '50-55', min: 50, max: 54.99 },
        { label: '≥ 55', min: 55, max: 100 }
    ];
    const gcData = gcBins.map(b => allSeq.filter(s => (s.gc_content ?? 0) >= b.min && (s.gc_content ?? 0) <= b.max).length);
    if (gcEl.__init) gcEl.__init.dispose();
    const c2 = echarts.init(gcEl); gcEl.__init = c2;
    c2.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: '4%', right: '4%', bottom: '4%', top: '8%', containLabel: true },
        xAxis: { type: 'category', data: gcBins.map(b => b.label) },
        yAxis: { type: 'value', minInterval: 1 },
        series: [{ type: 'bar', barMaxWidth: 40, data: gcData,
            itemStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#fd79a8'},{offset:1,color:'#fdcb6e'}]), borderRadius: [5,5,0,0] },
            label: { show: true, position: 'top' } }]
    });
}

// ========== 蛋白理化性质计算 ==========
const AA_MW = { A:89.09,R:174.20,N:132.12,D:133.10,C:121.15,Q:146.15,E:147.13,G:75.07,H:155.16,I:131.17,L:131.17,K:146.19,M:149.21,F:165.19,P:115.13,S:105.09,T:119.12,W:204.23,Y:181.19,V:117.15 };
const AA_FULL = { A:'Alanine 丙氨酸',R:'Arginine 精氨酸',N:'Asparagine 天冬酰胺',D:'Aspartate 天冬氨酸',C:'Cysteine 半胱氨酸',Q:'Glutamine 谷氨酰胺',E:'Glutamate 谷氨酸',G:'Glycine 甘氨酸',H:'Histidine 组氨酸',I:'Isoleucine 异亮氨酸',L:'Leucine 亮氨酸',K:'Lysine 赖氨酸',M:'Methionine 甲硫氨酸',F:'Phenylalanine 苯丙氨酸',P:'Proline 脯氨酸',S:'Serine 丝氨酸',T:'Threonine 苏氨酸',W:'Tryptophan 色氨酸',Y:'Tyrosine 酪氨酸',V:'Valine 缬氨酸' };

function calcProteinProps(seq) {
    if (!seq) return null;
    const up = seq.toUpperCase().replace(/[^A-Z]/g, '');
    const counts = {};
    let mw = 18.02, neg = 0, pos = 0;
    for (const ch of up) {
        counts[ch] = (counts[ch] || 0) + 1;
        const w = AA_MW[ch] || 0;
        if (w) mw += (w - 18.02);
        if (ch === 'D' || ch === 'E') neg++;
        if (ch === 'K' || ch === 'R') pos++;
        if (ch === 'H') pos += 0.5;
    }
    // 简化理论等电点估算（基于正负电荷残基平衡，系数经校准，范围 3.5-12）
    const pI = Math.max(3.5, Math.min(12, 7.0 + (pos - neg) * 0.06)).toFixed(2);
    const aaCount = Object.keys(counts).length;
    return {
        length: up.length,
        mw: mw.toFixed(2),
        pI,
        neg, pos, aaCount,
        counts, total: up.length
    };
}

function renderAminoChart(props, elId) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (el.__init) el.__init.dispose();
    const chart = echarts.init(el); el.__init = chart;
    const sorted = Object.entries(props.counts).sort((a, b) => b[1] - a[1]);
    const names = sorted.map(([k]) => `${k} (${AA_FULL[k]?.split(' ')[0] || k})`);
    const vals = sorted.map(([, v]) => +(v / props.total * 100).toFixed(2));
    chart.setOption({
        tooltip: {
            formatter: p => `${AA_FULL[p.name.split(' ')[0]] || p.name}<br/>数量: ${props.counts[p.name.split(' ')[0]]}<br/>占比: ${p.value}%`
        },
        grid: { left: '3%', right: '4%', bottom: '8%', top: '5%', containLabel: true },
        xAxis: { type: 'category', data: names, axisLabel: { interval: 0, rotate: 45, fontSize: 10 } },
        yAxis: { type: 'value', name: '%' },
        series: [{ type: 'bar', barMaxWidth: 30, data: vals,
            itemStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#6c5ce7'},{offset:1,color:'#a29bfe'}]), borderRadius: [4,4,0,0] } }]
    });
}

// ========== 通用导出（CSV / FASTA） ==========
const EXPORT_META = {
    gene_info: { headers: ['gene_id','gene_name','gene_desc','gene_biotype','chromosome','start_pos','end_pos','strand'], file: 'DiodonDB_gene_info.csv' },
    gene_sequence: { headers: ['gene_id','cds_length','protein_length','gc_content'], file: 'DiodonDB_sequence.csv' },
    expression_data: { headers: ['gene_id','tissue','tpm','fpkm','replicate'], file: 'DiodonDB_expression.csv' },
    go_annotation: { headers: ['gene_id','go_id','go_term','category'], file: 'DiodonDB_go_annotation.csv' },
    kegg_pathway: { headers: ['gene_id','pathway_id','pathway_name'], file: 'DiodonDB_kegg_pathway.csv' },
    protein_domain: { headers: ['gene_id','domain_id','domain_name','source'], file: 'DiodonDB_protein_domain.csv' }
};
const EXPORT_SOURCE = {
    gene_info: () => allGenes, gene_sequence: () => allSeq, expression_data: () => allExpr,
    go_annotation: () => allGO, kegg_pathway: () => allKegg, protein_domain: () => allDomains
};

function exportTableCSV(table) {
    const meta = EXPORT_META[table];
    const data = EXPORT_SOURCE[table]();
    if (!meta || !data || data.length === 0) return;
    const rows = data.map(g => meta.headers.map(h => {
        let v = g[h] ?? '';
        if (typeof v === 'string' && (v.includes(',') || v.includes('"'))) v = '"' + v.replace(/"/g, '""') + '"';
        return v;
    }).join(','));
    const csv = [meta.headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = meta.file;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportAllFasta() {
    if (allSeq.length === 0) return;
    let fasta = '';
    allSeq.forEach(s => {
        const g = allGenes.find(x => x.gene_id === s.gene_id);
        if (s.cds_sequence) fasta += `>${s.gene_id}|${g ? g.gene_name : ''}|cds|Diodon_hystrix\n${s.cds_sequence}\n`;
        if (s.protein_sequence) fasta += `>${s.gene_id}|${g ? g.gene_name : ''}|protein|Diodon_hystrix\n${s.protein_sequence}\n`;
    });
    const blob = new Blob([fasta], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'DiodonDB_all_sequences.fasta';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        ? allGenes.filter(g => (g.gene_name || '').toLowerCase().includes(kw.toLowerCase()) ||
                               (g.gene_id || '').toLowerCase().includes(kw.toLowerCase()) ||
                               (g.gene_desc || '').toLowerCase().includes(kw.toLowerCase())).slice(0, 8)
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
function quickSearch(kw) {
    document.getElementById('searchInput').value = kw;
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

// 搜索结果（分类 tab）
let searchTab = 'genes';

function doSearch() {
    const kw = document.getElementById('searchInput').value.trim();
    if (!kw) return;
    let list = getHistory().filter(h => h !== kw);
    list.unshift(kw);
    saveHistory(list.slice(0, 10));
    hideSearchPanel();

    window._searchKw = kw;
    const geneHits = allGenes.filter(g =>
        (g.gene_name || '').toLowerCase().includes(kw.toLowerCase()) ||
        (g.gene_id || '').toLowerCase().includes(kw.toLowerCase()) ||
        (g.gene_desc || '').toLowerCase().includes(kw.toLowerCase())
    );
    const seqHits = allSeq.filter(s => s.gene_id.toLowerCase().includes(kw.toLowerCase()));

    searchTab = 'genes';
    renderSearchTabs(geneHits.length, seqHits.length);
    renderSearchResults(geneHits, seqHits);
    document.getElementById('searchModal').style.display = 'flex';
}

function renderSearchTabs(nGenes, nSeq) {
    const el = document.getElementById('searchTabs');
    el.innerHTML = `
        <button class="search-tab-btn ${searchTab==='genes'?'active':''}" onclick="switchSearchTab('genes')">基因 <span class="tab-count">${nGenes}</span></button>
        <button class="search-tab-btn ${searchTab==='seq'?'active':''}" onclick="switchSearchTab('seq')">序列 <span class="tab-count">${nSeq}</span></button>`;
}

function switchSearchTab(tab) {
    searchTab = tab;
    const kw = window._searchKw || '';
    const geneHits = allGenes.filter(g =>
        (g.gene_name || '').toLowerCase().includes(kw.toLowerCase()) ||
        (g.gene_id || '').toLowerCase().includes(kw.toLowerCase()) ||
        (g.gene_desc || '').toLowerCase().includes(kw.toLowerCase())
    );
    const seqHits = allSeq.filter(s => s.gene_id.toLowerCase().includes(kw.toLowerCase()));
    renderSearchTabs(geneHits.length, seqHits.length);
    renderSearchResults(geneHits, seqHits);
}

function renderSearchResults(geneHits, seqHits) {
    const body = document.getElementById('searchResultBody');
    const hl = (text) => text.replace(new RegExp(`(${window._searchKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');

    if (searchTab === 'genes') {
        if (geneHits.length === 0) {
            body.innerHTML = '<div class="loading">未找到相关基因</div>';
            return;
        }
        body.innerHTML = geneHits.map(g => `
            <div class="search-result-item" onclick="closeSearchModal();showDetail('${g.gene_id}')">
                <div class="r-title">${hl(g.gene_name)} <small class="r-sub">${g.gene_id} · ${g.chromosome || '?'} · ${g.gene_biotype || ''}</small></div>
                <div class="r-desc">${hl(g.gene_desc || '暂无描述')}</div>
            </div>`).join('');
    } else {
        if (seqHits.length === 0) {
            body.innerHTML = '<div class="loading">未找到相关序列</div>';
            return;
        }
        body.innerHTML = seqHits.map(s => `
            <div class="search-result-item" onclick="closeSearchModal();showDetail('${s.gene_id}')">
                <div class="r-title">${hl(s.gene_id)} <small class="r-sub">CDS ${s.cds_length || '-'} bp · Protein ${s.protein_length || '-'} aa · GC ${s.gc_content || '-'}%</small></div>
                <div class="r-desc">点击查看完整序列</div>
            </div>`).join('');
    }
}

function closeSearchModal() { document.getElementById('searchModal').style.display = 'none'; }

// 点击外部关闭搜索面板
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) hideSearchPanel();
});

// ========== 基因详情（对标 NCBI Gene 页面） ==========
function showDetail(geneId) {
    const g = allGenes.find(x => x.gene_id === geneId);
    if (!g) return;
    document.getElementById('modalTitle').textContent = `Gene: ${g.gene_name} (${g.gene_id})`;
    document.getElementById('modal').style.display = 'flex';

    // 基因标识区
    const seq = allSeq.find(s => s.gene_id === geneId);
    document.getElementById('detailHeader').innerHTML = `
        <div class="gene-name-line">
            <span class="gene-name">${g.gene_name}</span>
            <span class="badge">${g.gene_biotype || 'protein_coding'}</span>
            <span class="badge-green">${g.chromosome || '?'}</span>
        </div>
        <div class="gene-aliases">
            <strong>基因 ID：</strong><span class="gene-full-id">${g.gene_id}</span>
            <span style="margin:0 10px;color:var(--text-light);">|</span>
            <strong>物种：</strong><em>Diodon hystrix</em>
        </div>`;

    // 功能摘要
    const desc = g.gene_desc || '暂无功能描述';
    document.getElementById('detailSummary').innerHTML =
        `<p><strong>${g.gene_name}</strong> 是密斑刺鲀（<em>Diodon hystrix</em>）基因组中的一个编码蛋白基因。${desc}。该基因位于 ${g.chromosome || '未定位染色体'}（${g.start_pos || '?'}-${g.end_pos || '?'}，${g.strand || '?'}链），编码产物长度为 ${seq ? (seq.protein_length || '?') : '?'} 个氨基酸。本数据库提供其 CDS 序列、蛋白质序列及多组织（${[...allTissues].join('、')}）表达谱数据。</p>`;

    // 基因组定位
    document.getElementById('detailGenomic').innerHTML = `
        <div class="ctx-item"><div class="label">Chromosome</div><div class="value">${g.chromosome || '-'}</div></div>
        <div class="ctx-item"><div class="label">Location</div><div class="value">${g.start_pos || '-'} - ${g.end_pos || '-'}</div></div>
        <div class="ctx-item"><div class="label">Strand</div><div class="value">${g.strand || '-'}</div></div>
        <div class="ctx-item"><div class="label">Biotype</div><div class="value">${g.gene_biotype || '-'}</div></div>`;

    // GO 功能注释（按 MF/BP/CC 分组）
    const goList = allGO.filter(x => x.gene_id === geneId);
    const goCats = [['MF', '分子功能 Molecular Function'], ['BP', '生物学过程 Biological Process'], ['CC', '细胞组分 Cellular Component']];
    if (goList.length > 0) {
        document.getElementById('detailGO').innerHTML = goCats.map(([cat, label]) => {
            const items = goList.filter(x => x.category === cat);
            if (items.length === 0) return '';
            return `<div class="tag-cat">${label}</div><div class="tag-list">${items.map(x => `
                <a class="tag-chip ${cat.toLowerCase()}" href="https://amigo.geneontology.org/amigo/term/${x.go_id}" target="_blank" rel="noopener" title="点击查看 GO 详情">
                    <span class="tag-id">${x.go_id}</span>${x.go_term}
                </a>`).join('')}</div>`;
        }).join('');
    } else {
        document.getElementById('detailGO').innerHTML = '<div class="tag-empty">暂无 GO 注释数据</div>';
    }

    // KEGG 通路
    const keggList = allKegg.filter(x => x.gene_id === geneId);
    if (keggList.length > 0) {
        document.getElementById('detailKegg').innerHTML = `<div class="tag-list">${keggList.map(x => `
            <a class="tag-chip kegg" href="https://www.kegg.jp/pathway/${x.pathway_id}" target="_blank" rel="noopener" title="点击查看 KEGG 通路详情">
                <span class="tag-id">${x.pathway_id}</span>${x.pathway_name}
            </a>`).join('')}</div>`;
    } else {
        document.getElementById('detailKegg').innerHTML = '<div class="tag-empty">暂无通路数据</div>';
    }

    // 蛋白结构域
    const domList = allDomains.filter(x => x.gene_id === geneId);
    if (domList.length > 0) {
        document.getElementById('detailDomain').innerHTML = `<div class="tag-list">${domList.map(x => `
            <a class="tag-chip domain" href="https://www.ebi.ac.uk/interpro/entry/pfam/${x.domain_id}" target="_blank" rel="noopener" title="点击查看 InterPro 结构域详情">
                <span class="tag-id">${x.domain_id}</span>${x.domain_name}
            </a>`).join('')}</div>`;
    } else {
        document.getElementById('detailDomain').innerHTML = '<div class="tag-empty">暂无结构域数据</div>';
    }

    // 蛋白理化性质 + 氨基酸组成（从序列实时计算）
    const propsEl = document.getElementById('detailProps');
    const aminoEl = document.getElementById('detailAminoChart');
    if (seq && seq.protein_sequence) {
        const props = calcProteinProps(seq.protein_sequence);
        if (props) {
            propsEl.innerHTML = `
                <div class="props-item"><div class="label">氨基酸数</div><div class="value">${props.length} aa</div></div>
                <div class="props-item"><div class="label">分子量 (Da)</div><div class="value">${props.mw}</div></div>
                <div class="props-item"><div class="label">理论 pI</div><div class="value">${props.pI}</div></div>
                <div class="props-item"><div class="label">负电残基 (D+E)</div><div class="value">${props.neg}</div></div>
                <div class="props-item"><div class="label">正电残基 (K+R)</div><div class="value">${props.pos}</div></div>
                <div class="props-item"><div class="label">氨基酸种类</div><div class="value">${props.aaCount} 种</div></div>`;
            renderAminoChart(props, 'detailAminoChart');
        } else {
            propsEl.innerHTML = '<div class="tag-empty">暂无蛋白序列，无法计算</div>';
        }
    } else {
        propsEl.innerHTML = '<div class="tag-empty">暂无蛋白序列，无法计算理化性质</div>';
        if (aminoEl) aminoEl.innerHTML = '';
    }

    // 表达谱：图 + 表格
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
                       itemStyle: { color: '#B89FE8' }, barMaxWidth: 42 }]
        });
        document.getElementById('detailExprTable').innerHTML = `
            <table class="mini-table">
                <thead><tr><th>组织</th><th>TPM</th><th>FPKM</th><th>重复</th></tr></thead>
                <tbody>${expr.map(e => `
                    <tr><td><strong>${e.tissue}</strong></td><td>${e.tpm ?? '-'}</td><td>${e.fpkm ?? '-'}</td><td>${e.replicate ?? '-'}</td></tr>
                `).join('')}</tbody>
            </table>`;
    } else {
        chartEl.innerHTML = '<div class="loading">暂无表达量数据</div>';
        document.getElementById('detailExprTable').innerHTML = '';
    }

    // 序列（折叠 + 复制 + 下载）
    const seqEl = document.getElementById('detailSeq');
    if (seq) {
        seqEl.innerHTML = `
            <div class="seq-box">
                <div class="seq-title">CDS 序列 (${seq.cds_length || '-'} bp · GC ${seq.gc_content || '-'}%)
                    <button class="btn-mini" style="float:right;" onclick="copySeq('${seq.cds_sequence || ''}')">复制</button>
                    <button class="btn-mini" style="float:right;margin-right:6px;" onclick="downloadSeq('${g.gene_id}','cds','${seq.cds_sequence || ''}')">FASTA</button>
                </div>
                <div class="seq-text" id="seqCds">${seq.cds_sequence || '暂无'}</div>
                <div class="seq-actions">
                    <button class="btn-mini" onclick="toggleSeq('seqCds', this)">展开/折叠</button>
                </div>
            </div>
            <div class="seq-box">
                <div class="seq-title">蛋白序列 (${seq.protein_length || '-'} aa)
                    <button class="btn-mini" style="float:right;" onclick="copySeq('${seq.protein_sequence || ''}')">复制</button>
                    <button class="btn-mini" style="float:right;margin-right:6px;" onclick="downloadSeq('${g.gene_id}','pep','${seq.protein_sequence || ''}')">FASTA</button>
                </div>
                <div class="seq-text" id="seqPep">${seq.protein_sequence || '暂无'}</div>
                <div class="seq-actions">
                    <button class="btn-mini" onclick="toggleSeq('seqPep', this)">展开/折叠</button>
                </div>
            </div>`;
    } else {
        seqEl.innerHTML = '<div class="loading">该基因暂无序列数据</div>';
    }

    // 外部链接（NCBI / UniProt / NCBI Protein）
    const name = encodeURIComponent(g.gene_name);
    document.getElementById('detailLinks').innerHTML = `
        <a class="ext-link" href="https://www.ncbi.nlm.nih.gov/gene/?term=${name}" target="_blank" rel="noopener">
            <span class="ext-icon">🧬</span> NCBI Gene
        </a>
        <a class="ext-link" href="https://www.uniprot.org/uniprotkb?query=${name}" target="_blank" rel="noopener">
            <span class="ext-icon">🔬</span> UniProt
        </a>
        <a class="ext-link" href="https://www.ncbi.nlm.nih.gov/protein/?term=${name}" target="_blank" rel="noopener">
            <span class="ext-icon">📄</span> NCBI Protein
        </a>`;
}

function toggleSeq(id, btn) {
    const el = document.getElementById(id);
    if (!el) return;
    const expanded = el.style.maxHeight && el.style.maxHeight !== '150px';
    if (expanded) {
        el.style.maxHeight = '150px';
    } else {
        el.style.maxHeight = el.scrollHeight + 'px';
    }
}

function copySeq(text) {
    navigator.clipboard.writeText(text).then(() => {
        const tip = document.getElementById('commentTip');
        if (tip) {
            tip.textContent = '已复制到剪贴板';
            setTimeout(() => tip.textContent = '', 2000);
        }
    });
}

function downloadSeq(geneId, type, sequence) {
    const header = `>${geneId}|${type}|Diodon_hystrix`;
    const blob = new Blob([header + '\n' + sequence + '\n'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${geneId}_${type}.fasta`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }

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
    const el1 = document.getElementById('statComments');
    if (el1) el1.textContent = list.length;
    const el2 = document.getElementById('statComments2');
    if (el2) el2.textContent = list.length;
    const el = document.getElementById('commentList');
    if (!el) return;
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
    if (el) el.style.display = el.style.display === 'none' ? 'flex' : 'none';
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

// ========== 引用复制 ==========
function copyCitation() {
    const text = 'DiodonDB: A Multi-omics Gene Database for Diodon hystrix. v1.1. 2026. Available at: https://yscc666.github.io/puffer-db/';
    navigator.clipboard.writeText(text).then(() => {
        const tip = document.getElementById('commentTip');
        if (tip) {
            tip.textContent = '引用已复制';
            setTimeout(() => tip.textContent = '', 2000);
        }
    });
}
