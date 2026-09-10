/**
 * 密斑刺鲀基因数据库 - 前端逻辑
 * 功能：数据加载、搜索筛选、详情弹窗、ECharts可视化
 */

// ========== Supabase 配置 ==========
const SUPABASE_URL = 'https://yvmkkeuskeqahodxiaop.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1aDEzTYOyuFmoNM8aqkhZA_PS2WSp5t';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 全局数据缓存
let allGenes = [];
let allSeq = [];
let allExpr = [];
let allTissues = new Set();

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();
});

// ========== 加载全部数据 ==========
async function loadAllData() {
    try {
        // 并行加载三张表
        const [genesRes, seqRes, exprRes] = await Promise.all([
            supabase.from('gene_info').select('*').order('gene_id'),
            supabase.from('gene_sequence').select('*'),
            supabase.from('expression_data').select('*')
        ]);

        allGenes = genesRes.data || [];
        allSeq = seqRes.data || [];
        allExpr = exprRes.data || [];

        // 收集所有组织类型
        allExpr.forEach(e => allTissues.add(e.tissue));

        // 更新统计
        document.getElementById('statGenes').textContent = allGenes.length;
        document.getElementById('statSeq').textContent = allSeq.length;
        document.getElementById('statExpr').textContent = allExpr.length;
        document.getElementById('statTissues').textContent = allTissues.size;

        // 填充染色体筛选下拉框
        const chrs = [...new Set(allGenes.map(g => g.chromosome).filter(Boolean))].sort();
        const chrFilter = document.getElementById('chrFilter');
        chrs.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            chrFilter.appendChild(opt);
        });

        // 渲染首页基因表
        renderGeneTable();
        renderOverviewChart();

    } catch (err) {
        console.error('数据加载失败:', err);
        document.getElementById('geneTable').innerHTML =
            '<tr><td colspan="5" class="loading">数据加载失败：' + err.message + '</td></tr>';
    }
}

// ========== 渲染基因表格 ==========
function renderGeneTable() {
    const keyword = (document.getElementById('geneFilter')?.value ||
                     document.getElementById('searchInput')?.value || '').toLowerCase();
    const chr = document.getElementById('chrFilter')?.value || '';

    let filtered = allGenes.filter(g => {
        const matchKw = !keyword ||
            g.gene_name.toLowerCase().includes(keyword) ||
            g.gene_desc.toLowerCase().includes(keyword) ||
            g.gene_id.toLowerCase().includes(keyword);
        const matchChr = !chr || g.chromosome === chr;
        return matchKw && matchChr;
    });

    // 渲染到首页表格
    const homeTable = document.getElementById('geneTable');
    if (homeTable) {
        homeTable.innerHTML = filtered.map(g => `
            <tr>
                <td>${g.gene_id}</td>
                <td><strong>${g.gene_name}</strong></td>
                <td>${g.gene_desc || '-'}</td>
                <td>${g.chromosome || '-'}</td>
                <td><button class="btn-detail" onclick="showDetail('${g.gene_id}')">详情</button></td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="loading">未找到匹配的基因</td></tr>';
    }

    // 渲染到列表页表格
    const allTable = document.getElementById('allGeneTable');
    if (allTable) {
        allTable.innerHTML = filtered.map(g => `
            <tr>
                <td>${g.gene_id}</td>
                <td><strong>${g.gene_name}</strong></td>
                <td>${g.gene_desc || '-'}</td>
                <td>${g.chromosome || '-'}</td>
                <td>${g.strand || '-'}</td>
                <td><button class="btn-detail" onclick="showDetail('${g.gene_id}')">详情</button></td>
            </tr>
        `).join('') || '<tr><td colspan="6" class="loading">未找到匹配的基因</td></tr>';
    }
}

// ========== 搜索 ==========
function onSearch() {
    renderGeneTable();
}

// ========== 页面切换 ==========
function showPage(page, e) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById('page-' + page).style.display = 'block';
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    if (e && e.target) e.target.classList.add('active');
}

// ========== 首页总览图 ==========
function renderOverviewChart() {
    const chartEl = document.getElementById('chartOverview');
    if (!chartEl) return;
    const chart = echarts.init(chartEl);
    const tissues = [...allTissues];
    const genes = allGenes.slice(0, 8).map(g => g.gene_name);

    // 按组织×基因聚合TPM
    const series = tissues.map(tissue => ({
        name: tissue,
        type: 'bar',
        data: genes.map(geneName => {
            const gene = allGenes.find(g => g.gene_name === geneName);
            const record = allExpr.find(e => e.gene_id === gene.gene_id && e.tissue === tissue);
            return record ? record.tpm : 0;
        })
    }));

    chart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: tissues, bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: { type: 'category', data: genes, axisLabel: { rotate: 30 } },
        yAxis: { type: 'value', name: 'TPM' },
        series: series
    });
}

// ========== 显示基因详情弹窗 ==========
async function showDetail(geneId) {
    const gene = allGenes.find(g => g.gene_id === geneId);
    if (!gene) return;

    document.getElementById('modalTitle').textContent = `${gene.gene_name} (${gene.gene_id})`;
    document.getElementById('modal').style.display = 'flex';

    // 基本信息
    document.getElementById('detailBasic').innerHTML = `
        <div class="detail-item"><div class="label">基因ID</div><div class="value">${gene.gene_id}</div></div>
        <div class="detail-item"><div class="label">基因名称</div><div class="value">${gene.gene_name}</div></div>
        <div class="detail-item"><div class="label">生物类型</div><div class="value">${gene.gene_biotype || '-'}</div></div>
        <div class="detail-item"><div class="label">染色体定位</div><div class="value">${gene.chromosome || '-'} : ${gene.start_pos || '-'}-${gene.end_pos || '-'}</div></div>
        <div class="detail-item"><div class="label">链方向</div><div class="value">${gene.strand || '-'}</div></div>
        <div class="detail-item"><div class="label">功能描述</div><div class="value">${gene.gene_desc || '-'}</div></div>
    `;

    // 序列信息
    const seq = allSeq.find(s => s.gene_id === geneId);
    const seqEl = document.getElementById('detailSeq');
    if (seq) {
        seqEl.innerHTML = `
            <div class="seq-box">
                <div class="seq-title">CDS序列 (${seq.cds_length || '-'} bp, GC含量: ${seq.gc_content || '-'}%)</div>
                <div class="seq-text">${seq.cds_sequence || '暂无'}</div>
            </div>
            <div class="seq-box">
                <div class="seq-title">蛋白序列 (${seq.protein_length || '-'} aa)</div>
                <div class="seq-text">${seq.protein_sequence || '暂无'}</div>
            </div>
        `;
    } else {
        seqEl.innerHTML = '<div class="loading">该基因暂无序列数据</div>';
    }

    // 表达量图表
    const exprData = allExpr.filter(e => e.gene_id === geneId);
    const chartEl = document.getElementById('detailChart');
    if (exprData.length > 0) {
        const chart = echarts.init(chartEl);
        chartEl.innerHTML = '';
        chart.setOption({
            tooltip: { trigger: 'axis' },
            grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
            xAxis: { type: 'category', data: exprData.map(e => e.tissue) },
            yAxis: { type: 'value', name: 'TPM' },
            series: [{
                name: 'TPM',
                type: 'bar',
                data: exprData.map(e => e.tpm),
                itemStyle: { color: '#2980b9' }
            }]
        });
    } else {
        chartEl.innerHTML = '<div class="loading">暂无表达量数据</div>';
    }
}

// ========== 关闭弹窗 ==========
function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// 点击弹窗外部关闭
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});
