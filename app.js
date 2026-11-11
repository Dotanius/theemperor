'use strict';
(() => {
  const DATA = window.BUDGET_DATA.map((r, id) => ({ ...r, id, change: r.y2027 - r.y2026, growth: r.y2026 ? (r.y2027 - r.y2026) / r.y2026 : null }));
  const $ = id => document.getElementById(id);
  const colors = { '전력운영': '#865df4', '방위력개선': '#379bf1', '병무행정': '#f393b5' };
  const palette = ['#865df4', '#37bdb2', '#49a3f2', '#f394b5', '#f4b64f', '#ab8af5', '#66c6e8', '#ee8d67', '#6b86d6', '#76cda4'];
  const accounts = ['일반회계', '특별회계·기금', '내부거래·보전지출', '내부거래'];
  const accountColors = { '일반회계': '#865df4', '특별회계·기금': '#37bdb2', '내부거래·보전지출': '#f394b5', '내부거래': '#f4b64f' };
  const state = { sector: '', account: '', unit: 10000, search: '', sort: null, order: -1 };
  const sum = (rows, key) => rows.reduce((n, r) => n + r[key], 0);
  const unique = values => [...new Set(values)];
  const fmt = n => n.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const money = n => `${n < 0 ? '−' : ''}${fmt(Math.abs(n))}억 원`;
  const percent = n => n == null ? '—' : `${n > 0 ? '▲ ' : n < 0 ? '▼ ' : ''}${Math.abs(n * 100).toFixed(1)}%`;
  const signed = n => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n))}`;
  const unitName = () => state.unit === 10000 ? '조 원' : '억 원';
  const axisNum = n => state.unit === 10000 ? (n / 10000).toLocaleString('ko-KR', { maximumFractionDigits: Math.abs(n) >= 10000 ? 1 : Math.abs(n) >= 1000 ? 2 : Math.abs(n) >= 100 ? 3 : 4 }) : fmt(n);
  const short = (str, max = 15) => str.length > max ? str.slice(0, max - 1) + '…' : str;
  const direction = n => n >= 0 ? '#0eaf98' : '#ed7194';
  const text = (x, y, content, extra = '') => `<text x="${x}" y="${y}" ${extra.includes('fill=') ? '' : 'fill="#8c97ad"'} ${extra.includes('font-size=') ? '' : 'font-size="10"'} ${extra}>${esc(content)}</text>`;
  const tipAttr = content => `data-tip="${esc(content)}" tabindex="0"`;
  const tipProgram = r => `${r.program}\n${r.sector} · ${r.account}\n2026년 ${money(r.y2026)}\n2027년 ${money(r.y2027)}\n증감 ${signed(r.change)}억 원 / ${percent(r.growth)}`;
  const svg = (content, h = 290, label = '') => `<svg viewBox="0 0 540 ${h}" role="img" aria-label="${esc(label)}">${content}</svg>`;
  const legend = items => `<div class="chart-legend">${items.map(([label, color]) => `<span class="legend-item"><i class="dot" style="background:${color}"></i>${esc(label)}</span>`).join('')}</div>`;
  const empty = (id, msg = '선택한 조건에 표시할 예산이 없습니다.') => $(id).innerHTML = `<div class="empty">${esc(msg)}</div>`;
  function selected() { return DATA.filter(r => (!state.sector || r.sector === state.sector) && (!state.account || r.account === state.account)); }
  function grouped(rows, key) {
    return unique(rows.map(r => r[key])).map(name => ({ name, rows: rows.filter(r => r[key] === name), y2026: sum(rows.filter(r => r[key] === name), 'y2026'), y2027: sum(rows.filter(r => r[key] === name), 'y2027'), change: sum(rows.filter(r => r[key] === name), 'change') }));
  }
  function kpis(rows) {
    const a = sum(rows, 'y2026'), b = sum(rows, 'y2027'), d = b - a, growth = a ? d / a : null;
    const positive = rows.filter(r => r.change > 0).length, negative = rows.filter(r => r.change < 0).length;
    const cards = [
      ['2026년 기준 예산', a, '조 원', `선택한 <b>${rows.length}개 항목</b>의 합계`, '#865df4', '#f0ebff', '◷'],
      ['2027년 정부안', b, '조 원', `2026년 대비 <b>${percent(growth)}</b>`, '#379bf1', '#eaf3ff', '▥'],
      ['예산 증감금액', d, '억 원', `증감률 <b>${percent(growth)}</b> · 차감액 포함`, '#13b8a5', '#e5f9f4', '↗'],
      ['프로그램 항목', rows.length, '개', `<b>${positive}개 증가</b> / ${negative}개 감소`, '#ed88ab', '#fff0f5', '▦'],
    ];
    $('kpis').innerHTML = cards.map(([label, value, unit, caption, accent, tint, icon], i) => `<article class="kpi" style="--accent:${accent};--tint:${tint}"><div class="kpi-label">${label}<span class="kpi-icon">${icon}</span></div><div class="kpi-value">${i < 2 ? (value / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 2, minimumFractionDigits: 2 }) : i === 2 ? signed(value) : value}<small>${unit}</small></div><div class="kpi-caption">${caption}</div></article>`).join('');
  }
  function sectorChart(rows) {
    if (!rows.length) return empty('sectorChart');
    const groups = grouped(rows, 'sector'), max = Math.max(1, ...groups.flatMap(g => [g.y2026, g.y2027])), min = Math.min(0, ...groups.flatMap(g => [g.y2026, g.y2027]));
    const left = 53, right = 512, top = 28, bottom = 231;
    const y = v => bottom - (v - min) / (max * 1.12 - min) * (bottom - top), zero = y(0);
    let out = text(left, 12, unitName(), 'font-size="9"');
    for (let i = 0; i <= 4; i++) {
      const v = min + (max * 1.12 - min) * i / 4, yy = y(v);
      out += `<line x1="${left}" x2="${right}" y1="${yy}" y2="${yy}" stroke="#edf0f7"/>` + text(left - 9, yy + 3, axisNum(v), 'text-anchor="end" font-size="9"');
    }
    out += `<line x1="${left}" x2="${right}" y1="${zero}" y2="${zero}" stroke="#bbc4d6"/>`;
    groups.forEach((g, i) => {
      const x = left + (right - left) * (i + .5) / groups.length, w = Math.min(43, 125 / groups.length);
      for (const [j, year] of ['y2026', 'y2027'].entries()) {
        const val = g[year], yy = y(val), bx = x + (j ? 5 : -w - 5);
        out += `<rect x="${bx}" y="${Math.min(yy, zero)}" width="${w}" height="${Math.max(1, Math.abs(zero - yy))}" rx="5" fill="${j ? colors[g.name] : '#ded8f6'}" ${tipAttr(`${g.name} / ${j ? 2027 : 2026}년\n${money(val)}`)}/>`;
        out += text(bx + w / 2, val < 0 ? yy + 13 : yy - 8, axisNum(val), 'text-anchor="middle" font-size="9" fill="#62708a"');
      }
      out += text(x, 256, g.name, 'text-anchor="middle" font-size="11" fill="#68758c"');
    });
    $('sectorChart').innerHTML = svg(out, 270, '부문별 2026년과 2027년 순예산 비교') + legend([['2026년', '#ded8f6'], ['2027년', '#865df4']]);
  }
  function donutChart(rows) {
    const groups = grouped(rows.filter(r => r.y2027 > 0), 'sector'), total = sum(groups, 'y2027');
    if (!total) return empty('donutChart', '양수 예산이 없어 비중을 계산하지 않습니다.');
    const cx = 155, cy = 140, radius = 94, circumference = 2 * Math.PI * radius;
    let out = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#f0edf8" stroke-width="29"/>`, offset = 0;
    groups.forEach((g, i) => {
      const part = g.y2027 / total, length = part * circumference;
      out += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${colors[g.name]}" stroke-width="29" stroke-dasharray="${Math.max(.1, length - (groups.length > 1 ? 4 : 0))} ${circumference}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" ${tipAttr(`${g.name}\n${money(g.y2027)}\n양수 예산의 ${(part * 100).toFixed(1)}%`)}/>`;
      offset += length;
      out += `<circle cx="307" cy="${83 + i * 64}" r="4" fill="${colors[g.name]}"/>` + text(320, 87 + i * 64, g.name, 'font-size="11" fill="#69758c"') + text(320, 109 + i * 64, `${(part * 100).toFixed(1)}%`, 'font-size="19" font-weight="700" fill="#35435b"') + text(501, 109 + i * 64, axisNum(g.y2027), 'text-anchor="end" font-size="10"');
    });
    out += text(cx, cy - 8, '2027년 양수 예산', 'text-anchor="middle" font-size="10"') + text(cx, cy + 20, axisNum(total), 'text-anchor="middle" font-size="27" font-weight="700" fill="#35435b"') + text(cx, cy + 41, unitName(), 'text-anchor="middle" font-size="9"');
    $('donutChart').innerHTML = svg(out, 300, '2027년 양수 예산의 부문별 구성 비중');
  }
  function accountChart(rows) {
    const positive = rows.filter(r => r.y2027 > 0), groups = grouped(positive, 'sector');
    if (!groups.length) return empty('accountChart', '양수 예산이 없어 구성 그래프를 표시하지 않습니다.');
    const max = Math.max(...groups.map(g => g.y2027), 1), width = 355, left = 106;
    let out = text(486, 18, unitName(), 'text-anchor="end" font-size="9"');
    groups.forEach((g, i) => {
      const y = 54 + i * 65; let x = left;
      out += text(left - 14, y + 21, g.name, 'text-anchor="end" font-size="11"');
      accounts.forEach(account => {
        const val = sum(g.rows.filter(r => r.account === account), 'y2027'), w = val / max * width;
        if (w) out += `<rect x="${x}" y="${y}" width="${w}" height="34" rx="4" fill="${accountColors[account]}" ${tipAttr(`${g.name} · ${account}\n2027년 ${money(val)}`)}/>`;
        x += w;
      });
      out += text(x + 9, y + 21, axisNum(g.y2027), 'font-size="9"');
    });
    for (let i = 0; i <= 4; i++) out += text(left + width * i / 4, 270, axisNum(max * i / 4), 'text-anchor="middle" font-size="9"');
    $('accountChart').innerHTML = svg(out, 280, '부문별 회계구분에 따른 양수 예산 구성') + legend(unique(positive.map(r => r.account)).map(a => [a, accountColors[a]]));
  }
  function rankedChart(rows, id, key, { divergent = false, rate = false } = {}) {
    let ranked = [...rows].filter(r => rate ? r.y2026 > 0 && r.growth != null : key === 'y2027' ? r.y2027 > 0 : true);
    ranked.sort((a, b) => divergent ? Math.abs(b[key]) - Math.abs(a[key]) : b[key] - a[key]);
    ranked = ranked.slice(0, 10);
    if (!ranked.length) return empty(id);
    const left = 158, right = 442, top = 30, step = 25, h = Math.max(285, ranked.length * step + 55);
    const min = divergent ? Math.min(0, ...ranked.map(r => r[key])) * 1.06 : 0, max = Math.max(.01, ...ranked.map(r => r[key])) * 1.06;
    const x = v => left + (v - min) / (max - min) * (right - left), zero = x(0);
    let out = text(right + 28, 11, rate ? '%' : unitName(), 'text-anchor="end" font-size="9"');
    for (let j = 0; j <= 4; j++) {
      const v = min + (max - min) * j / 4, xx = x(v);
      out += `<line x1="${xx}" x2="${xx}" y1="19" y2="${h - 28}" stroke="#f0f2f7"/>`;
    }
    out += `<line x1="${zero}" x2="${zero}" y1="20" y2="${h - 28}" stroke="#c6cfde"/>`;
    ranked.forEach((r, i) => {
      const y = top + i * step, v = r[key], xx = x(v), color = divergent ? direction(v) : colors[r.sector];
      out += text(left - 12, y + 10, short(r.program, 14), 'text-anchor="end" font-size="10" fill="#758299"');
      const mark = rate ? `<line x1="${zero}" x2="${xx}" y1="${y + 5}" y2="${y + 5}" stroke="${color}" stroke-width="3" stroke-linecap="round"/><circle cx="${xx}" cy="${y + 5}" r="5" fill="${color}"/>` : `<rect x="${Math.min(zero, xx)}" y="${y}" width="${Math.max(1, Math.abs(xx - zero))}" height="15" rx="4" fill="${color}" opacity=".88"/>`;
      out += `<g ${tipAttr(tipProgram(r))}>${mark}</g>`;
      const label = rate ? `${v < 0 ? '−' : ''}${Math.abs(v * 100).toFixed(1)}%` : `${v < 0 ? '−' : ''}${axisNum(Math.abs(v))}`;
      out += text(529, y + 11, label, `text-anchor="end" font-size="9" fill="${color}"`);
    });
    $(id).innerHTML = svg(out, h, rate ? '프로그램별 증감률 상위 10개' : '프로그램별 금액 순위');
  }
  // Squarified treemap: rectangles preserve each program's budget area.
  function treemap(items, x, y, width, height) {
    const result = [], total = items.reduce((n, r) => n + r.area, 0); let list = items.map(r => ({ ...r, area: r.area / total * width * height })), rect = { x, y, w: width, h: height };
    const worst = (row, side) => { const areas = row.map(r => r.area), s = sum(row, 'area'); return !s ? Infinity : Math.max(side ** 2 * Math.max(...areas) / s ** 2, s ** 2 / (side ** 2 * Math.min(...areas))); };
    while (list.length) {
      const row = [list.shift()], side = Math.min(rect.w, rect.h);
      while (list.length && worst([...row, list[0]], side) <= worst(row, side)) row.push(list.shift());
      const area = sum(row, 'area');
      if (rect.w >= rect.h) {
        const w = area / rect.h; let yy = rect.y;
        row.forEach(r => { const h = r.area / w; result.push({ ...r, x: rect.x, y: yy, w, h }); yy += h; });
        rect.x += w; rect.w = Math.max(.001, rect.w - w);
      } else {
        const h = area / rect.w; let xx = rect.x;
        row.forEach(r => { const w = r.area / h; result.push({ ...r, x: xx, y: rect.y, w, h }); xx += w; });
        rect.y += h; rect.h = Math.max(.001, rect.h - h);
      }
    }
    return result;
  }
  function treeChart(rows) {
    const positive = rows.filter(r => r.y2027 > 0).sort((a, b) => b.y2027 - a.y2027);
    if (!positive.length) return empty('treeChart', '양수 예산이 없어 포트폴리오를 표시하지 않습니다.');
    const tiles = treemap(positive.map(r => ({ ...r, area: r.y2027 })), 0, 0, 1050, 255);
    const out = tiles.map((r, i) => {
      const fill = colors[r.sector], w = Math.max(.1, r.w - 3), h = Math.max(.1, r.h - 3), label = short(r.program, Math.floor(w / 12));
      return `<g ${tipAttr(tipProgram(r))}><rect x="${r.x}" y="${r.y}" width="${w}" height="${h}" rx="5" fill="${fill}" opacity="${.65 + (i % 4) * .1}"/>${w > 74 && h > 27 ? text(r.x + 10, r.y + 21, label, 'fill="white" font-size="11" font-weight="600"') : ''}${w > 93 && h > 53 ? text(r.x + 10, r.y + 42, `${axisNum(r.y2027)} ${unitName()}`, 'fill="#ffffffd9" font-size="10"') : ''}</g>`;
    }).join('');
    $('treeChart').innerHTML = `<svg viewBox="0 0 1050 255" role="img" aria-label="양수 예산 규모에 비례하는 프로그램 포트폴리오">${out}</svg>` + legend(unique(positive.map(r => r.sector)).map(s => [s, colors[s]]));
  }
  function scatterChart(rows) {
    const positive = rows.filter(r => r.y2026 > 0 && r.y2027 > 0);
    if (!positive.length) return empty('scatterChart', '비교 가능한 양수 예산이 없습니다.');
    const max = Math.max(...positive.flatMap(r => [r.y2026, r.y2027]), 1) * 1.12, left = 64, bottom = 242, top = 25, right = 490;
    const x = v => left + v / max * (right - left), y = v => bottom - v / max * (bottom - top);
    let out = text(left, 11, `2027년 · ${unitName()}`, 'font-size="9"');
    for (let i = 0; i <= 4; i++) {
      const v = max * i / 4, xx = x(v), yy = y(v);
      out += `<line x1="${left}" x2="${right}" y1="${yy}" y2="${yy}" stroke="#edf0f7"/><line x1="${xx}" x2="${xx}" y1="${top}" y2="${bottom}" stroke="#f3f5f9"/>` + text(left - 10, yy + 3, axisNum(v), 'text-anchor="end" font-size="9"') + text(xx, bottom + 17, axisNum(v), 'text-anchor="middle" font-size="9"');
    }
    out += `<line x1="${x(0)}" y1="${y(0)}" x2="${x(max)}" y2="${y(max)}" stroke="#c9c1e8" stroke-width="1.5" stroke-dasharray="5 5"/>` + text(right, 282, `2026년 · ${unitName()}`, 'text-anchor="end" font-size="9"');
    positive.forEach(r => {
      const radius = 5 + Math.sqrt(r.y2027 / max) * 10;
      out += `<circle cx="${x(r.y2026)}" cy="${y(r.y2027)}" r="${radius}" fill="${colors[r.sector]}" opacity=".7" stroke="white" stroke-width="1.5" ${tipAttr(tipProgram(r))}/>`;
      if (r.y2027 / max > .2) out += text(x(r.y2026) - 4, y(r.y2027) - radius - 5, short(r.program, 13), 'text-anchor="end" font-size="9" fill="#6c7891"');
    });
    $('scatterChart').innerHTML = svg(out, 290, '2026년과 2027년 프로그램 예산 산점도');
  }
  function heatChart(rows) {
    if (!rows.length) return empty('heatChart');
    const sectors = unique(rows.map(r => r.sector)), accs = accounts.filter(a => rows.some(r => r.account === a)), left = 108, top = 58, width = 390, cellW = width / accs.length, cellH = 59;
    const cells = sectors.flatMap(s => accs.map(a => ({ s, a, list: rows.filter(r => r.sector === s && r.account === a) }))), max = Math.max(...cells.map(c => Math.abs(sum(c.list, 'change'))), 1);
    let out = text(502, 12, unitName(), 'text-anchor="end" font-size="9"');
    accs.forEach((a, i) => {
      const label = a === '내부거래·보전지출' ? ['내부거래·', '보전지출'] : [a];
      label.forEach((l, j) => out += text(left + cellW * (i + .5), 31 + 13 * j, l, 'text-anchor="middle" font-size="9"'));
    });
    sectors.forEach((s, i) => out += text(left - 12, top + i * cellH + cellH / 2 + 4, s, 'text-anchor="end" font-size="11"'));
    cells.forEach(c => {
      const i = sectors.indexOf(c.s), j = accs.indexOf(c.a), v = sum(c.list, 'change'), strength = Math.abs(v) / max, color = direction(v), x = left + j * cellW, y = top + i * cellH;
      out += `<g ${c.list.length ? tipAttr(`${c.s} · ${c.a}\n증감 ${signed(v)}억 원\n${c.list.length}개 항목`) : ''}><rect x="${x}" y="${y}" width="${cellW - 5}" height="${cellH - 5}" rx="6" fill="${c.list.length ? color : '#f4f5f9'}" fill-opacity="${c.list.length ? .12 + strength * .78 : 1}"/>${text(x + (cellW - 5) / 2, y + cellH / 2 + 2, c.list.length ? `${v > 0 ? '+' : v < 0 ? '−' : ''}${axisNum(Math.abs(v))}` : '—', `text-anchor="middle" font-size="${accs.length > 3 ? 10 : 12}" font-weight="600" fill="${strength > .5 ? 'white' : c.list.length ? color : '#b7bfce'}"`)}</g>`;
    });
    $('heatChart').innerHTML = svg(out, 282, '부문과 회계구분별 순증감금액 히트맵');
  }
  function tableRows() {
    let rows = selected().filter(r => `${r.program} ${r.group}`.toLocaleLowerCase().includes(state.search.toLocaleLowerCase()));
    if (state.sort) rows.sort((a, b) => state.order * ((a[state.sort] ?? -Infinity) - (b[state.sort] ?? -Infinity)) || a.id - b.id);
    return rows;
  }
  function renderTable() {
    const rows = tableRows();
    $('tableBody').innerHTML = rows.length ? rows.map(r => `<tr><td><span class="sector-chip" style="color:${colors[r.sector]};background:${colors[r.sector]}14">${esc(r.sector)}</span></td><td>${esc(r.account)}</td><td>${esc(r.group)}</td><td>${esc(r.program)}</td><td>${r.y2026 < 0 ? '−' : ''}${fmt(Math.abs(r.y2026))}</td><td>${r.y2027 < 0 ? '−' : ''}${fmt(Math.abs(r.y2027))}</td><td class="${r.change > 0 ? 'number-up' : r.change < 0 ? 'number-down' : ''}">${signed(r.change)}</td><td><span class="growth-pill ${r.growth > 0 ? 'up' : r.growth < 0 ? 'down' : 'neutral'}">${percent(r.growth)}</span></td></tr>`).join('') : '<tr><td colspan="8" style="text-align:center;padding:45px">검색 결과가 없습니다.</td></tr>';
    $('tableCount').textContent = `${rows.length}개 항목`;
    const a = sum(rows, 'y2026'), b = sum(rows, 'y2027');
    $('tableTotal').innerHTML = `<span>현재 표 합계 · ${rows.length}개 항목</span><span>2026년 <b>${fmt(a)}</b> → 2027년 <b>${fmt(b)}</b> 억 원</span><span>증감 <b>${signed(b - a)}억 원</b> / <b>${a ? percent((b - a) / a) : '—'}</b></span>`;
    document.querySelectorAll('[data-sort]').forEach(button => {
      const label = { y2026: '2026년', y2027: '2027년', change: '증감금액', growth: '증감률' }[button.dataset.sort];
      button.textContent = `${label} ${state.sort === button.dataset.sort ? state.order > 0 ? '↑' : '↓' : '↕'}`;
      button.parentElement.setAttribute('aria-sort', state.sort === button.dataset.sort ? state.order > 0 ? 'ascending' : 'descending' : 'none');
    });
  }
  function render() {
    const rows = selected();
    $('tooltip').hidden = true;
    $('filterCount').innerHTML = `<strong>${rows.length}</strong> / ${DATA.length}개 항목`;
    $('selectionLabel').textContent = `${state.sector || '전체 부문'} · ${state.account || '전체 회계'}`;
    kpis(rows); sectorChart(rows); donutChart(rows); accountChart(rows);
    rankedChart(rows, 'rankChart', 'y2027'); treeChart(rows);
    rankedChart(rows, 'changeChart', 'change', { divergent: true });
    rankedChart(rows, 'growthChart', 'growth', { divergent: true, rate: true });
    scatterChart(rows); heatChart(rows); renderTable();
  }
  function updateAccountOptions() {
    const available = accounts.filter(a => DATA.some(r => (!state.sector || r.sector === state.sector) && r.account === a));
    if (!available.includes(state.account)) state.account = '';
    $('accountFilter').innerHTML = '<option value="">전체 회계</option>' + available.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join('');
    $('accountFilter').value = state.account;
  }
  $('sectorFilter').innerHTML += unique(DATA.map(r => r.sector)).map(s => `<option>${esc(s)}</option>`).join('');
  updateAccountOptions();
  $('sectorFilter').addEventListener('change', e => { state.sector = e.target.value; updateAccountOptions(); render(); });
  $('accountFilter').addEventListener('change', e => { state.account = e.target.value; render(); });
  $('unit').addEventListener('change', e => { state.unit = Number(e.target.value); render(); });
  $('reset').addEventListener('click', () => { state.sector = ''; state.account = ''; state.search = ''; state.sort = null; state.order = -1; $('sectorFilter').value = ''; $('search').value = ''; updateAccountOptions(); render(); });
  $('search').addEventListener('input', e => { state.search = e.target.value; renderTable(); });
  document.querySelectorAll('[data-sort]').forEach(b => b.addEventListener('click', () => { state.order = state.sort === b.dataset.sort ? -state.order : -1; state.sort = b.dataset.sort; renderTable(); }));
  $('download').addEventListener('click', () => {
    const data = [['부문', '회계구분', '구분', '프로그램명', '2026년(억원)', '2027년(억원)', '증감금액(억원)', '증감률(%)'], ...tableRows().map(r => [r.sector, r.account, r.group, r.program, r.y2026, r.y2027, r.change, r.growth == null ? '' : (r.growth * 100).toFixed(4)])];
    const blob = new Blob(['\uFEFF' + data.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'), url = URL.createObjectURL(blob); link.href = url; link.download = `국방예산_${state.sector || '전체부문'}_${state.account || '전체회계'}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  function tooltip(target, x, y) {
    const el = target.closest('[data-tip]'), box = $('tooltip');
    if (!el) { box.hidden = true; return; }
    box.textContent = el.dataset.tip; box.hidden = false;
    const bounds = box.getBoundingClientRect();
    box.style.left = Math.max(8, Math.min(x + 16, innerWidth - bounds.width - 10)) + 'px';
    box.style.top = Math.max(8, Math.min(y + 15, innerHeight - bounds.height - 10)) + 'px';
  }
  document.addEventListener('pointermove', e => tooltip(e.target, e.clientX, e.clientY));
  document.addEventListener('focusin', e => { const el = e.target.closest('[data-tip]'); if (el) { const b = el.getBoundingClientRect(); tooltip(el, b.x, b.bottom); } });
  document.addEventListener('focusout', () => { $('tooltip').hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $('tooltip').hidden = true; });
  document.querySelectorAll('.nav-link').forEach(a => a.addEventListener('click', () => { document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active')); a.classList.add('active'); }));
  render();
})();
