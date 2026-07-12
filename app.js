(function () {
  const overlay = document.getElementById("overlay");
  const popup = document.getElementById("popup");
  const popupInner = document.getElementById("popup-inner");
  const frame = document.getElementById("frame");

  const NUMEROS = Object.keys(POSICOES).sort();

  // Converte o poligono (em % da imagem toda) numa caixa retangular
  // (left/top/width/height em % da imagem) + um clip-path polygon() com
  // pontos relativos a essa caixa (0-100%), pra criar um <div> hover no
  // formato exato da peça, sem depender de SVG.
  function bboxAndClip(poly) {
    const xs = poly.map((p) => p[0]);
    const ys = poly.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = maxX - minX, h = maxY - minY;
    const clipPts = poly.map((p) => {
      const rx = w === 0 ? 0 : ((p[0] - minX) / w) * 100;
      const ry = h === 0 ? 0 : ((p[1] - minY) / h) * 100;
      return `${rx.toFixed(2)}% ${ry.toFixed(2)}%`;
    });
    return {
      left: minX, top: minY, width: w, height: h,
      clipPath: `polygon(${clipPts.join(", ")})`,
    };
  }

  function deckValueHtml(v) {
    const s = String(v);
    const cls = s.length > 7 ? "eq-card__cell-value eq-card__cell-value--long" : "eq-card__cell-value";
    return `<div class="${cls}">${s}</div>`;
  }

  function buildCardHtml(card, cor) {
    return `
      <div class="eq-card">
        <div class="eq-card__head">
          <span class="eq-card__dot" style="background:${cor}"></span>
          <span class="eq-card__title">${card.nome}</span>
        </div>
        <div class="eq-card__subtitle">${card.tipoEstagio}</div>
        <div class="eq-card__grid">
          <div class="eq-card__cell">
            <div class="eq-card__cell-label">1&ordm; Deck</div>
            ${deckValueHtml(card.deck1)}
          </div>
          <div class="eq-card__cell">
            <div class="eq-card__cell-label">2&ordm; Deck</div>
            ${deckValueHtml(card.deck2)}
          </div>
          <div class="eq-card__cell">
            <div class="eq-card__cell-label">3&ordm; Deck</div>
            ${deckValueHtml(card.deck3)}
          </div>
        </div>
        <div class="eq-card__footer">
          <span>Última atualização</span>
          <strong>${card.data}</strong>
        </div>
      </div>
    `;
  }

  // Cria os hotspots (um <div> recortado no formato exato da peça, via clip-path)
  NUMEROS.forEach((num) => {
    const pos = POSICOES[num];
    const box = bboxAndClip(pos.poly);
    const div = document.createElement("div");
    div.className = "hotspot";
    div.dataset.num = num;
    div.style.left = box.left + "%";
    div.style.top = box.top + "%";
    div.style.width = box.width + "%";
    div.style.height = box.height + "%";
    div.style.clipPath = box.clipPath;
    div.style.backgroundColor = pos.cor;
    overlay.appendChild(div);

    div.addEventListener("mouseenter", (ev) => {
      div.classList.add("active");
      renderPopup(num);
      popup.classList.add("visible");
      positionPopup(ev);
    });
    div.addEventListener("mousemove", (ev) => positionPopup(ev));
    div.addEventListener("mouseleave", () => {
      div.classList.remove("active");
      popup.classList.remove("visible");
    });
  });

  function renderPopup(num) {
    const cards = EQUIPAMENTOS[num] || [];
    const cor = POSICOES[num].cor;
    popupInner.innerHTML = cards.map((c) => buildCardHtml(c, cor)).join("");
  }

  function positionPopup(ev) {
    const margin = 18;
    const rect = popup.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = ev.clientX + margin;
    let top = ev.clientY + margin;

    if (left + rect.width > vw - 8) {
      left = ev.clientX - rect.width - margin;
    }
    if (top + rect.height > vh - 8) {
      top = ev.clientY - rect.height - margin;
    }
    left = Math.max(8, left);
    top = Math.max(8, top);

    popup.style.left = left + "px";
    popup.style.top = top + "px";
  }

  // ---------------- Filtro de configurações anteriores ----------------

  const filterToggle = document.getElementById("filter-toggle");
  const filterPanel = document.getElementById("filter-panel");
  const filterClose = document.getElementById("filter-close");
  const filterNome = document.getElementById("filter-nome");
  const filterData = document.getElementById("filter-data");
  const filterResult = document.getElementById("filter-result");

  const NOMES_HISTORICO = Object.keys(HISTORICO).sort();

  NOMES_HISTORICO.forEach((nome) => {
    const opt = document.createElement("option");
    opt.value = nome;
    opt.textContent = nome;
    filterNome.appendChild(opt);
  });

  function clearHighlight() {
    const prev = overlay.querySelector(".hotspot.filter-highlight");
    if (prev) prev.classList.remove("filter-highlight");
  }

  function populateDatas(nome) {
    filterData.innerHTML = "";
    const regs = HISTORICO[nome] || [];
    regs.forEach((reg, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = reg.data;
      filterData.appendChild(opt);
    });
  }

  function renderFiltro() {
    const nome = filterNome.value;
    const idx = Number(filterData.value);
    const regs = HISTORICO[nome] || [];
    const reg = regs[idx];
    clearHighlight();
    if (!reg) {
      filterResult.innerHTML = "";
      return;
    }
    const cor = POSICOES[reg.marcador] ? POSICOES[reg.marcador].cor : "#999";
    filterResult.innerHTML = buildCardHtml(reg, cor);
    const el = overlay.querySelector(`.hotspot[data-num="${reg.marcador}"]`);
    if (el) el.classList.add("filter-highlight");
  }

  filterNome.addEventListener("change", () => {
    populateDatas(filterNome.value);
    renderFiltro();
  });
  filterData.addEventListener("change", renderFiltro);

  filterToggle.addEventListener("click", () => {
    filterPanel.classList.add("open");
    // Chrome restaura o valor do <select> ao dar reload na pagina; força
    // sempre um estado valido + renderiza (idempotente, seguro repetir).
    if (NOMES_HISTORICO.length && filterNome.selectedIndex < 0) {
      filterNome.value = NOMES_HISTORICO[0];
    }
    populateDatas(filterNome.value);
    renderFiltro();
  });

  filterClose.addEventListener("click", () => {
    filterPanel.classList.remove("open");
    clearHighlight();
  });

  // primeira carga do dropdown de equipamento (nao mexe no <select> de data
  // aqui pra nao brigar com a restauração de estado do navegador; quem
  // popula de fato é o clique no botao "Histórico")
  if (NOMES_HISTORICO.length) {
    filterNome.value = NOMES_HISTORICO[0];
  }
})();
