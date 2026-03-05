const API = "https://ophim1.com/v1/api";
const content = document.getElementById("content");

let state = {
    currentPage: 1,
    currentType: 'home',
    currentVal: '',
    cdnImage: ''
};

/**
 * KHỞI TẠO
 */
async function init() {
    await loadFilters();
    await loadMovies();

    // Sự kiện Enter cho tìm kiếm
    const searchInput = document.getElementById("searchInput");
    searchInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
            changePage(1, 'search');
        }
    });
}

/**
 * TẢI DANH SÁCH PHIM
 */
async function loadMovies() {
    content.innerHTML = '<div class="loading">⌛ Đang tải phim...</div>';
    let url = "";

    switch (state.currentType) {
        case 'search': url = `${API}/tim-kiem?keyword=${encodeURIComponent(state.currentVal)}&page=${state.currentPage}`; break;
        case 'genre': url = `${API}/the-loai/${state.currentVal}?page=${state.currentPage}`; break;
        case 'country': url = `${API}/quoc-gia/${state.currentVal}?page=${state.currentPage}`; break;
        case 'year': url = `${API}/nam-phat-hanh/${state.currentVal}?page=${state.currentPage}`; break;
        default: url = `${API}/danh-sach/phim-moi-cap-nhat?page=${state.currentPage}`;
    }

    try {
        const res = await fetch(url);
        const json = await res.json();
        state.cdnImage = json.data.APP_DOMAIN_CDN_IMAGE || "";
        
        const pagin = json.data.params.pagination;
        const totalPages = pagin.totalPages || Math.ceil(pagin.totalItems / pagin.totalItemsPerPage) || 1;

        renderList(json.data.items, totalPages);
    } catch (err) {
        content.innerHTML = '<p style="text-align:center; padding:50px;">Lỗi kết nối API. Vui lòng thử lại.</p>';
    }
}

/**
 * HIỂN THỊ DANH SÁCH
 */
function renderList(movies, totalPages) {
    if (!movies || movies.length === 0) {
        content.innerHTML = "<p style='text-align:center'>Không tìm thấy phim nào.</p>";
        return;
    }

    let html = `<div class="movie-grid">`;
    movies.forEach(m => {
        const thumb = m.thumb_url.startsWith('http') ? m.thumb_url : `${state.cdnImage}/uploads/movies/${m.thumb_url}`;
        html += `
            <div class="movie-card" onclick="loadDetail('${m.slug}')">
                <span class="episode-badge">${m.episode_current}</span>
                <img src="${thumb}" alt="${m.name}" onerror="this.src='https://via.placeholder.com/170x260?text=No+Image'">
                <div class="info">
                    <p><b>${m.name}</b></p>
                    <p style="color:#888; font-size:0.8rem">${m.year}</p>
                </div>
            </div>`;
    });
    html += `</div>`;
    html += renderPagination(totalPages);
    content.innerHTML = html;
}

/**
 * PHÂN TRANG THÔNG MINH (1 2 3 ... MAX)
 */
function renderPagination(total) {
    let html = `<div class="pagination">`;
    const cur = state.currentPage;
    const delta = 2;

    html += `<button onclick="changePage(${cur - 1})" ${cur === 1 ? 'disabled' : ''}>&laquo;</button>`;
    html += `<button class="${cur === 1 ? 'active' : ''}" onclick="changePage(1)">1</button>`;

    if (cur - delta > 2) html += `<span>...</span>`;

    for (let i = Math.max(2, cur - delta); i <= Math.min(total - 1, cur + delta); i++) {
        html += `<button class="${cur === i ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }

    if (cur + delta < total - 1) html += `<span>...</span>`;
    if (total > 1) {
        html += `<button class="${cur === total ? 'active' : ''}" onclick="changePage(${total})">${total}</button>`;
    }

    html += `<button onclick="changePage(${cur + 1})" ${cur === total ? 'disabled' : ''}>&raquo;</button>`;
    html += `</div>`;
    return html;
}

/**
 * CHI TIẾT PHIM (CHIA SERVER VIETSUB/THUYET MINH)
 */
async function loadDetail(slug) {
    content.innerHTML = '<div class="loading">⌛ Đang tải phim...</div>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    try {
        const res = await fetch(`${API}/phim/${slug}`);
        const json = await res.json();
        const movie = json.data.item;

        let serversHtml = "";
        movie.episodes.forEach(server => {
            let epBtns = "";
            server.server_data.forEach(ep => {
                epBtns += `<button class="ep-btn" onclick="playVideo('${ep.link_embed}', '${movie.name} - ${ep.name}', this)">${ep.name}</button>`;
            });

            serversHtml += `
                <div class="server-group">
                    <span class="server-name">📡 Nguồn: ${server.server_name}</span>
                    <div class="ep-container">${epBtns}</div>
                </div>`;
        });

        content.innerHTML = `
            <div class="detail-view">
                <button onclick="loadMovies()" style="margin-bottom:20px; background:#333">⬅ Trở về</button>
                <div style="display:flex; gap:25px; flex-wrap:wrap">
                    <img src="${state.cdnImage}/uploads/movies/${movie.thumb_url}" style="width:230px; border-radius:10px;">
                    <div style="flex:1; min-width:300px">
                        <h1 style="color:var(--primary); margin:0">${movie.name}</h1>
                        <p style="color:#888;">${movie.origin_name} (${movie.year})</p>
                        <p><b>Ngôn ngữ:</b> ${movie.lang} | <b>Chất lượng:</b> ${movie.quality}</p>
                        <p><b>Nội dung:</b> ${movie.content.replace(/<[^>]*>?/gm, '')}</p>
                    </div>
                </div>

                <div id="player-section" style="margin-top:30px; display:none;">
                    <h3 id="playing-title" style="color:var(--primary)"></h3>
                    <div id="player-area"></div>
                </div>

                <div style="margin-top:30px">
                    <h3>Danh sách tập phim:</h3>
                    ${serversHtml}
                </div>
            </div>`;
    } catch (e) { content.innerHTML = "<p>Lỗi tải phim.</p>"; }
}

/**
 * XEM VIDEO
 */
function playVideo(link, title, btn) {
    // Xóa màu active của các nút khác
    document.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('viewing'));
    btn.classList.add('viewing');

    const section = document.getElementById("player-section");
    section.style.display = "block";
    document.getElementById("playing-title").innerText = `Đang xem: ${title}`;
    document.getElementById("player-area").innerHTML = `<iframe src="${link}" frameborder="0" allowfullscreen></iframe>`;
    
    document.getElementById("player-section").scrollIntoView({ behavior: 'smooth' });
}

/**
 * ĐIỀU HƯỚNG & BỘ LỌC
 */
function changePage(p, type = null) {
    state.currentPage = p;
    if (type) {
        state.currentType = type;
        state.currentPage = 1;
        if(type === 'search') state.currentVal = document.getElementById("searchInput").value;
        if(type === 'genre') state.currentVal = document.getElementById("genreFilter").value;
        if(type === 'country') state.currentVal = document.getElementById("countryFilter").value;
        if(type === 'year') state.currentVal = document.getElementById("yearFilter").value;
        if(type === 'home') {
            state.currentVal = '';
            document.querySelectorAll('select').forEach(s => s.value = "");
            document.getElementById("searchInput").value = "";
        }
    }
    loadMovies();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * TẢI BỘ LỌC
 */
async function loadFilters() {
    try {
        const [gRes, cRes] = await Promise.all([
            fetch(`${API}/the-loai`).then(r => r.json()),
            fetch(`${API}/quoc-gia`).then(r => r.json())
        ]);
        gRes.data.items.forEach(i => document.getElementById("genreFilter").innerHTML += `<option value="${i.slug}">${i.name}</option>`);
        cRes.data.items.forEach(i => document.getElementById("countryFilter").innerHTML += `<option value="${i.slug}">${i.name}</option>`);
        for (let y = 2026; y >= 2010; y--) document.getElementById("yearFilter").innerHTML += `<option value="${y}">${y}</option>`;
    } catch (e) { console.log("Lỗi tải bộ lọc"); }
}

init();