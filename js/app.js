/*!
 * Nexus — Catálogo y Biblioteca de Software
 * Autor: Alejandro Manrique
 * Ubicación: Trelew, Chubut, Argentina
 * Copyright (c) 2026 Alejandro Manrique. Todos los derechos reservados.
 */
(function () {
  "use strict";

  var lastCatalogScrollY = 0;

  var state = {
    programs: [],
    activeItem: null,
    section: "Todos",
    category: "Todas",
    subFilter: "",
    search: "",
    system: "",
    arch: "",
    sort: "nombre",
    currentPage: 1,
    itemsPerPage: 12
  };

  var elements = {
    topTabs: document.querySelectorAll(".top-tab"),
    osChips: document.querySelectorAll(".os-chip"),
    sidebarMenu: document.getElementById("sidebarMenu"),
    catalogView: document.getElementById("catalogView"),
    detailView: document.getElementById("detailView"),
    currentBreadcrumb: document.getElementById("currentBreadcrumb"),
    programList: document.getElementById("programList"),
    resultsCount: document.getElementById("resultsCount"),
    emptyState: document.getElementById("emptyState"),
    errorState: document.getElementById("errorState"),
    searchForm: document.getElementById("searchForm"),
    searchInput: document.getElementById("search"),
    archFilter: document.getElementById("archFilter"),
    sortFilter: document.getElementById("sortFilter"),
    clearFilters: document.getElementById("clearFilters"),
    resetSearch: document.getElementById("resetSearch"),
    totalProgramas: document.getElementById("totalProgramas"),
    totalCategorias: document.getElementById("totalCategorias"),
    currentYear: document.getElementById("currentYear"),
    paginationContainer: document.getElementById("paginationContainer"),
    prevPageBtn: document.getElementById("prevPage"),
    nextPageBtn: document.getElementById("nextPage"),
    pageInfo: document.getElementById("pageInfo"),
    // Elementos de la Ficha Dedicada
    backToListBtn: document.getElementById("backToListBtn"),
    detailBreadcrumb: document.getElementById("detailBreadcrumb"),
    detailIcon: document.getElementById("detailIcon"),
    detailSectionTag: document.getElementById("detailSectionTag"),
    detailCatTag: document.getElementById("detailCatTag"),
    detailTitle: document.getElementById("detailTitle"),
    detailSubtitle: document.getElementById("detailSubtitle"),
    detailDescription: document.getElementById("detailDescription"),
    detailNotesBox: document.getElementById("detailNotesBox"),
    detailNotes: document.getElementById("detailNotes"),
    detailFilesList: document.getElementById("detailFilesList"),
    detailEditor: document.getElementById("detailEditor"),
    detailVersion: document.getElementById("detailVersion"),
    detailSystems: document.getElementById("detailSystems"),
    detailArch: document.getElementById("detailArch"),
    detailSize: document.getElementById("detailSize"),
    detailPrice: document.getElementById("detailPrice"),
    detailSlug: document.getElementById("detailSlug"),
    detailUpdated: document.getElementById("detailUpdated"),
    detailHashRow: document.getElementById("detailHashRow"),
    detailHash: document.getElementById("detailHash")
  };

  function safeUrl(value) {
    if (typeof value !== "string") {
      return null;
    }
    var trimmed = value.replace(/^\s+|\s+$/g, "");
    if (!trimmed) {
      return null;
    }
    if (/^(https?:\/\/|\.\/|\/|img\/)/i.test(trimmed) && !/^javascript:/i.test(trimmed)) {
      return trimmed;
    }
    return null;
  }

  function sanitizeText(value, maxLength) {
    if (typeof value !== "string") {
      return "";
    }
    return value.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "").slice(0, maxLength || 600);
  }

  function createEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) {
      el.className = className;
    }
    if (typeof text === "string") {
      el.textContent = text;
    }
    return el;
  }

  function buildItemThumb(prog) {
    var initial = (prog.nombre || "?").charAt(0).toUpperCase();
    var iconUrl = safeUrl(prog.icono);
    if (!iconUrl) {
      return createEl("span", "item-thumb-fallback", initial);
    }

    var img = document.createElement("img");
    img.className = "item-thumb";
    img.src = iconUrl;
    img.alt = prog.nombre || "";
    img.width = 34;
    img.height = 34;
    img.onerror = function () {
      if (!img.parentNode) return;
      var fallback = createEl("span", "item-thumb-fallback", initial);
      img.parentNode.replaceChild(fallback, img);
    };
    return img;
  }

  function triggerViewFade(el) {
    if (!el || !el.classList) {
      return;
    }
    el.classList.remove("view-fade-in");
    void el.offsetWidth;
    el.classList.add("view-fade-in");
  }

  function inferSection(prog) {
    if (prog.seccion) {
      return prog.seccion;
    }
    var cat = (prog.categoria || "").toLowerCase();
    var name = (prog.nombre || "").toLowerCase();
    if (cat.indexOf("iso") !== -1 || cat.indexOf("sistema") !== -1 || name.indexOf("iso") !== -1) {
      return "Sistemas / ISOs";
    }
    if (cat.indexOf("util") !== -1 || cat.indexOf("driver") !== -1 || cat.indexOf("compresor") !== -1) {
      return "Utilidades";
    }
    return "Programas";
  }

  function matchesSection(prog, targetSection) {
    if (!targetSection || targetSection === "Todos") {
      return true;
    }
    var sec = inferSection(prog);
    if (targetSection === "Programas") {
      return sec !== "Sistemas / ISOs";
    }
    return sec === targetSection;
  }

  function syncOsChips() {
    for (var i = 0; i < elements.osChips.length; i++) {
      var chip = elements.osChips[i];
      var chipOs = chip.getAttribute("data-os") || "";
      chip.className = chipOs === state.system ? "os-chip active" : "os-chip";
    }
  }

  function syncTopTabs() {
    for (var i = 0; i < elements.topTabs.length; i++) {
      var tab = elements.topTabs[i];
      var sec = tab.getAttribute("data-section") || "Todos";
      tab.className = sec === state.section ? "top-tab active" : "top-tab";
    }
  }

  function getSubitemsForCategory(catName) {
    var subs = [];
    state.programs.forEach(function (prog) {
      if (prog.categoria !== catName) {
        return;
      }
      if (prog.subcategoria && subs.indexOf(prog.subcategoria) === -1) {
        subs.push(prog.subcategoria);
      }
    });
    return subs;
  }

  function renderSidebarMenu() {
    var container = elements.sidebarMenu;
    if (!container) {
      return;
    }
    container.innerHTML = "";

    var allRow = createEl(
      "div",
      "menu-cat-row" + (!state.activeItem && state.category === "Todas" && !state.subFilter ? " active" : "")
    );
    allRow.appendChild(createEl("span", "menu-toggle", "•"));
    allRow.appendChild(createEl("span", "", "Todos los apartados"));
    allRow.appendChild(createEl("span", "menu-count", String(state.programs.length)));
    allRow.addEventListener("click", function () {
      lastCatalogScrollY = 0;
      state.category = "Todas";
      state.subFilter = "";
      state.currentPage = 1;
      closeItemDetail(true, false, true);
    });
    container.appendChild(allRow);

    var categories = [];
    state.programs.forEach(function (prog) {
      if (!matchesSection(prog, state.section)) {
        return;
      }
      if (prog.categoria && categories.indexOf(prog.categoria) === -1) {
        categories.push(prog.categoria);
      }
    });

    if (elements.totalCategorias) {
      var allCats = [];
      state.programs.forEach(function (p) {
        if (p.categoria && allCats.indexOf(p.categoria) === -1) {
          allCats.push(p.categoria);
        }
      });
      elements.totalCategorias.textContent = String(allCats.length);
    }

    categories.forEach(function (cat) {
      var group = createEl("div", "menu-group");
      var isCatSelected = state.category === cat;
      var subitems = getSubitemsForCategory(cat);

      var countInCat = state.programs.filter(function (p) {
        return p.categoria === cat;
      }).length;

      var row = createEl("div", "menu-cat-row" + (!state.activeItem && isCatSelected && !state.subFilter ? " active" : ""));
      var toggle = createEl("span", "menu-toggle", subitems.length > 0 ? (isCatSelected ? "-" : "+") : "•");
      row.appendChild(toggle);
      row.appendChild(createEl("span", "", cat));
      row.appendChild(createEl("span", "menu-count", String(countInCat)));

      row.addEventListener("click", function () {
        lastCatalogScrollY = 0;
        state.category = cat;
        state.subFilter = "";
        state.currentPage = 1;
        closeItemDetail(true, false, true);
      });

      group.appendChild(row);

      if (subitems.length > 0 && isCatSelected) {
        var sublist = createEl("ul", "menu-sublist");
        subitems.forEach(function (sub) {
          var li = createEl(
            "li",
            "menu-subitem" + (!state.activeItem && state.subFilter === sub ? " active" : ""),
            sub
          );
          li.addEventListener("click", function (e) {
            e.stopPropagation();
            lastCatalogScrollY = 0;
            state.category = cat;
            state.subFilter = state.subFilter === sub ? "" : sub;
            state.currentPage = 1;
            closeItemDetail(true, false, true);
          });
          sublist.appendChild(li);
        });
        group.appendChild(sublist);
      }

      container.appendChild(group);
    });
  }

  function updateBreadcrumb() {
    if (!elements.currentBreadcrumb) {
      return;
    }
    var parts = [];
    parts.push(state.section === "Todos" ? "Inicio" : state.section);
    if (state.category !== "Todas") {
      parts.push(state.category);
    }
    if (state.subFilter) {
      parts.push(state.subFilter);
    }
    if (state.system) {
      parts.push(state.system);
    }
    elements.currentBreadcrumb.textContent = parts.join(" / ");
  }

  /* =========================================================
     VISTA DE FICHA DEDICADA
     ========================================================= */
  function openItemDetail(prog, skipHashUpdate) {
    if (!prog || !elements.detailView || !elements.catalogView) {
      return;
    }

    if (!state.activeItem && !elements.catalogView.hidden) {
      lastCatalogScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    }

    state.activeItem = prog;
    elements.catalogView.hidden = true;
    elements.detailView.hidden = false;
    triggerViewFade(elements.detailView);

    if (!skipHashUpdate && prog.slug) {
      window.location.hash = "/item/" + prog.slug;
    }

    var secName = inferSection(prog);
    if (elements.detailBreadcrumb) {
      var crumbParts = [secName, prog.categoria];
      if (prog.subcategoria) crumbParts.push(prog.subcategoria);
      crumbParts.push(prog.nombre);
      elements.detailBreadcrumb.textContent = crumbParts.join(" / ");
    }

    if (elements.detailIcon) {
      var initial = (prog.nombre || "?").charAt(0).toUpperCase();
      var iconUrl = safeUrl(prog.icono);
      elements.detailIcon.innerHTML = "";
      if (iconUrl) {
        elements.detailIcon.className = "detail-badge-icon has-icon";
        var detailImg = document.createElement("img");
        detailImg.src = iconUrl;
        detailImg.alt = prog.nombre || "";
        detailImg.onerror = function () {
          elements.detailIcon.className = "detail-badge-icon";
          elements.detailIcon.innerHTML = "";
          elements.detailIcon.textContent = initial;
        };
        elements.detailIcon.appendChild(detailImg);
      } else {
        elements.detailIcon.className = "detail-badge-icon";
        elements.detailIcon.textContent = initial;
      }
    }
    if (elements.detailSectionTag) {
      elements.detailSectionTag.textContent = secName;
    }
    if (elements.detailCatTag) {
      elements.detailCatTag.textContent = prog.subcategoria
        ? prog.categoria + " · " + prog.subcategoria
        : prog.categoria;
    }
    if (elements.detailTitle) {
      elements.detailTitle.textContent = prog.nombre;
    }

    var subParts = [];
    if (prog.editor) subParts.push("Por " + prog.editor);
    if (prog.version) subParts.push("Versión " + prog.version.replace(/^v/i, ""));
    if (prog.tamano) subParts.push(prog.tamano);
    if (elements.detailSubtitle) {
      elements.detailSubtitle.textContent = subParts.join(" · ") || "Paquete de software";
    }

    if (elements.detailDescription) {
      elements.detailDescription.textContent =
        prog.descripcion || "Sin descripción detallada disponible.";
    }

    if (elements.detailNotesBox && elements.detailNotes) {
      if (prog.notas) {
        elements.detailNotes.textContent = prog.notas;
        elements.detailNotesBox.hidden = false;
      } else {
        elements.detailNotesBox.hidden = true;
      }
    }

    if (elements.detailFilesList) {
      elements.detailFilesList.innerHTML = "";
      var hasRows = false;

      if (Array.isArray(prog.descargas) && prog.descargas.length > 0) {
        prog.descargas.forEach(function (d) {
          if (!d || typeof d !== "object") return;
          var href = safeUrl(d.url);
          if (!href) return;

          var tr = createEl("tr");
          var tdLabel = createEl("td");
          tdLabel.appendChild(createEl("strong", "", sanitizeText(d.etiqueta, 100) || "Archivo de descarga"));
          var fileName = href.split("/").pop();
          if (fileName) {
            tdLabel.appendChild(createEl("div", "mono-col", decodeURIComponent(fileName)));
          }
          tr.appendChild(tdLabel);

          var sysList =
            Array.isArray(d.sistemas) && d.sistemas.length > 0
              ? d.sistemas.join(", ")
              : Array.isArray(prog.sistemas) && prog.sistemas.length > 0
              ? prog.sistemas.join(", ")
              : "Windows";
          tr.appendChild(createEl("td", "mono-col", sysList));

          var tdBtn = createEl("td", "action-links");
          var a = createEl("a", "btn-classic btn-primary", "Descargar");
          a.href = href;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          tdBtn.appendChild(a);
          tr.appendChild(tdBtn);

          elements.detailFilesList.appendChild(tr);
          hasRows = true;
        });
      }

      var singleHref = safeUrl(prog.urlDescarga);
      if (!hasRows && singleHref) {
        var trSingle = createEl("tr");
        trSingle.appendChild(createEl("td", "", "Paquete de instalación"));
        trSingle.appendChild(createEl("td", "mono-col", (prog.sistemas || []).join(", ") || "Windows"));
        var tdSingle = createEl("td");
        var aSingle = createEl("a", "btn-classic btn-primary", "Descargar");
        aSingle.href = singleHref;
        aSingle.target = "_blank";
        aSingle.rel = "noopener noreferrer";
        tdSingle.appendChild(aSingle);
        trSingle.appendChild(tdSingle);
        elements.detailFilesList.appendChild(trSingle);
        hasRows = true;
      }

      var officialHref = safeUrl(prog.urlOficial);
      if (officialHref) {
        var trOff = createEl("tr");
        trOff.appendChild(createEl("td", "", "Sitio oficial del desarrollador"));
        trOff.appendChild(createEl("td", "mono-col", "Enlace externo"));
        var tdOff = createEl("td");
        var aOff = createEl("a", "btn-classic", "Abrir web oficial");
        aOff.href = officialHref;
        aOff.target = "_blank";
        aOff.rel = "noopener noreferrer";
        tdOff.appendChild(aOff);
        trOff.appendChild(tdOff);
        elements.detailFilesList.appendChild(trOff);
        hasRows = true;
      }

      if (!hasRows) {
        var trEmpty = createEl("tr");
        var tdEmpty = createEl("td", "", "No hay archivos publicados todavía para este elemento.");
        tdEmpty.colSpan = 3;
        trEmpty.appendChild(tdEmpty);
        elements.detailFilesList.appendChild(trEmpty);
      }
    }

    if (elements.detailEditor) elements.detailEditor.textContent = prog.editor || "No especificado";
    if (elements.detailVersion) elements.detailVersion.textContent = prog.version || "—";
    if (elements.detailSystems) {
      elements.detailSystems.textContent =
        Array.isArray(prog.sistemas) && prog.sistemas.length > 0
          ? prog.sistemas.join(", ")
          : "Windows";
    }
    if (elements.detailArch) elements.detailArch.textContent = prog.arquitectura || "—";
    if (elements.detailSize) elements.detailSize.textContent = prog.tamano || "—";
    if (elements.detailPrice) elements.detailPrice.textContent = prog.precio || "Gratis";
    if (elements.detailSlug) elements.detailSlug.textContent = prog.slug || "—";
    if (elements.detailUpdated) elements.detailUpdated.textContent = prog.actualizado || "2026";

    if (elements.detailHashRow && elements.detailHash) {
      if (prog.sha256) {
        elements.detailHash.textContent = prog.sha256;
        elements.detailHashRow.hidden = false;
      } else {
        elements.detailHashRow.hidden = true;
      }
    }

    renderSidebarMenu();
    window.scrollTo(0, 0);
  }

  function closeItemDetail(clearHash, shouldScrollTop, resetSavedScroll) {
    if (resetSavedScroll) {
      lastCatalogScrollY = 0;
    }

    var wasDetailOpen = Boolean(state.activeItem || (elements.detailView && !elements.detailView.hidden));
    state.activeItem = null;
    if (elements.detailView) elements.detailView.hidden = true;
    if (elements.catalogView) {
      elements.catalogView.hidden = false;
      if (wasDetailOpen) {
        triggerViewFade(elements.catalogView);
      }
    }

    if (clearHash && window.location.hash) {
      window.location.hash = "";
    }

    syncTopTabs();
    syncOsChips();
    renderSidebarMenu();
    renderPrograms();

    if (shouldScrollTop) {
      window.scrollTo(0, resetSavedScroll ? 0 : lastCatalogScrollY || 0);
    }
  }

  function checkUrlHash() {
    var hash = window.location.hash || "";
    var match = hash.match(/^#\/item\/([a-z0-9-]+)$/i);
    if (match && match[1]) {
      var targetSlug = match[1].toLowerCase();
      for (var i = 0; i < state.programs.length; i++) {
        if ((state.programs[i].slug || "").toLowerCase() === targetSlug) {
          openItemDetail(state.programs[i], true);
          return;
        }
      }
    } else if (state.activeItem) {
      closeItemDetail(false, false, false);
    }
  }

  function matchesArchitecture(progArch, selectedArch) {
    if (!selectedArch) return true;
    var a = String(progArch || "").toLowerCase();
    var t = selectedArch.toLowerCase();
    if (!a) return false;
    if (t === "32 y 64 bits") {
      return a.indexOf("32") !== -1 && a.indexOf("64") !== -1;
    }
    return a.indexOf(t) !== -1;
  }

  function getFilteredPrograms() {
    var query = state.search.toLowerCase();

    var list = state.programs.filter(function (prog) {
      if (!matchesSection(prog, state.section)) {
        return false;
      }
      if (state.category !== "Todas" && prog.categoria !== state.category) {
        return false;
      }
      if (state.subFilter) {
        var matchesSub =
          prog.subcategoria === state.subFilter ||
          (Array.isArray(prog.sistemas) && prog.sistemas.indexOf(state.subFilter) !== -1);
        if (!matchesSub) {
          return false;
        }
      }
      if (state.system) {
        var systems = Array.isArray(prog.sistemas) ? prog.sistemas : [];
        if (systems.indexOf(state.system) === -1) {
          return false;
        }
      }
      if (!matchesArchitecture(prog.arquitectura, state.arch)) {
        return false;
      }
      if (query) {
        var haystack = [
          prog.nombre,
          prog.categoria,
          prog.subcategoria,
          prog.editor,
          prog.descripcion,
          prog.arquitectura,
          Array.isArray(prog.sistemas) ? prog.sistemas.join(" ") : ""
        ]
          .join(" ")
          .toLowerCase();
        if (haystack.indexOf(query) === -1) {
          return false;
        }
      }
      return true;
    });

    list.sort(function (a, b) {
      if (state.sort === "recientes") {
        return String(b.actualizado || "").localeCompare(String(a.actualizado || ""));
      }
      if (state.sort === "descargas") {
        return (Number(b.totalDescargas) || 0) - (Number(a.totalDescargas) || 0);
      }
      return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
    });

    return list;
  }

  function renderPagination(totalFiltered) {
    if (!elements.paginationContainer) return;
    var totalPages = Math.ceil(totalFiltered / state.itemsPerPage);
    if (totalPages <= 1) {
      elements.paginationContainer.hidden = true;
      return;
    }
    elements.paginationContainer.hidden = false;
    if (elements.pageInfo) {
      elements.pageInfo.textContent = "Página " + state.currentPage + " de " + totalPages;
    }
    if (elements.prevPageBtn) {
      elements.prevPageBtn.disabled = state.currentPage <= 1;
    }
    if (elements.nextPageBtn) {
      elements.nextPageBtn.disabled = state.currentPage >= totalPages;
    }
  }

  function renderPrograms() {
    syncTopTabs();
    syncOsChips();
    updateBreadcrumb();
    if (!elements.programList) return;

    var filtered = getFilteredPrograms();
    var totalFiltered = filtered.length;
    var totalPages = Math.ceil(totalFiltered / state.itemsPerPage) || 1;

    if (state.currentPage > totalPages) state.currentPage = totalPages;
    if (state.currentPage < 1) state.currentPage = 1;

    var start = (state.currentPage - 1) * state.itemsPerPage;
    var pageItems = filtered.slice(start, start + state.itemsPerPage);

    elements.programList.innerHTML = "";

    if (elements.resultsCount) {
      elements.resultsCount.textContent =
        totalFiltered === 1 ? "1 resultado" : totalFiltered + " resultados";
    }

    if (totalFiltered === 0) {
      if (elements.emptyState) elements.emptyState.hidden = false;
      if (elements.paginationContainer) elements.paginationContainer.hidden = true;
      return;
    }

    if (elements.emptyState) elements.emptyState.hidden = true;

    var table = createEl("table", "catalog-table");
    var thead = createEl("thead");
    var headRow = createEl("tr");
    headRow.appendChild(createEl("th", "", "Paquete / Descripción"));
    headRow.appendChild(createEl("th", "", "Sistema"));
    headRow.appendChild(createEl("th", "", "Acción"));
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = createEl("tbody");
    pageItems.forEach(function (prog) {
      var tr = createEl("tr");

      var tdName = createEl("td", "item-cell");
      tdName.addEventListener("click", function () {
        openItemDetail(prog, false);
      });

      tdName.appendChild(buildItemThumb(prog));

      var textWrap = createEl("div", "item-text-wrap");
      var titleEl = createEl("span", "item-title", prog.nombre);
      textWrap.appendChild(titleEl);
      if (prog.version) {
        textWrap.appendChild(createEl("span", "mono-col", "  [" + prog.version + "]"));
      }
      if (prog.descripcion) {
        textWrap.appendChild(createEl("p", "item-desc", prog.descripcion));
      }
      tdName.appendChild(textWrap);
      tr.appendChild(tdName);

      var sysText =
        Array.isArray(prog.sistemas) && prog.sistemas.length > 0
          ? prog.sistemas.join(", ")
          : "Windows";
      tr.appendChild(createEl("td", "mono-col", sysText));

      var tdAction = createEl("td", "action-links");
      var multiCount = Array.isArray(prog.descargas) ? prog.descargas.length : 0;

      var openBtn = createEl(
        "button",
        "btn-classic btn-primary btn-open-detail",
        multiCount > 1 ? "Abrir ficha (" + multiCount + ") →" : "Abrir ficha →"
      );
      openBtn.type = "button";
      openBtn.addEventListener("click", function () {
        openItemDetail(prog, false);
      });
      tdAction.appendChild(openBtn);

      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    elements.programList.appendChild(table);
    renderPagination(totalFiltered);
  }

  function resetAllFilters() {
    lastCatalogScrollY = 0;
    state.section = "Todos";
    state.category = "Todas";
    state.subFilter = "";
    state.search = "";
    state.system = "";
    state.arch = "";
    state.sort = "nombre";
    state.currentPage = 1;

    if (elements.searchInput) elements.searchInput.value = "";
    if (elements.archFilter) elements.archFilter.value = "";
    if (elements.sortFilter) elements.sortFilter.value = "nombre";

    closeItemDetail(true, false, true);
    if (elements.catalogView && !elements.catalogView.hidden) {
      triggerViewFade(elements.catalogView);
    }
  }

  function bindEvents() {
    for (var i = 0; i < elements.topTabs.length; i++) {
      elements.topTabs[i].addEventListener("click", function () {
        var sec = this.getAttribute("data-section") || "Todos";
        lastCatalogScrollY = 0;
        state.section = sec;
        state.category = "Todas";
        state.subFilter = "";
        state.currentPage = 1;

        closeItemDetail(true, false, true);
        if (elements.catalogView && !elements.catalogView.hidden) {
          triggerViewFade(elements.catalogView);
        }
      });
    }

    for (var k = 0; k < elements.osChips.length; k++) {
      elements.osChips[k].addEventListener("click", function () {
        lastCatalogScrollY = 0;
        state.system = this.getAttribute("data-os") || "";
        state.currentPage = 1;
        if (state.activeItem) {
          closeItemDetail(true, false, true);
        } else {
          renderPrograms();
          triggerViewFade(elements.catalogView);
        }
      });
    }

    if (elements.searchForm) {
      elements.searchForm.addEventListener("submit", function (e) {
        e.preventDefault();
        lastCatalogScrollY = 0;
        state.search = elements.searchInput ? elements.searchInput.value.replace(/^\s+|\s+$/g, "") : "";
        state.currentPage = 1;
        closeItemDetail(true, false, true);
        if (elements.catalogView && !elements.catalogView.hidden) {
          triggerViewFade(elements.catalogView);
        }
      });
    }

    if (elements.searchInput) {
      elements.searchInput.addEventListener("input", function () {
        lastCatalogScrollY = 0;
        state.search = elements.searchInput.value.replace(/^\s+|\s+$/g, "");
        state.currentPage = 1;
        if (state.activeItem) {
          closeItemDetail(true, false, true);
        } else {
          renderPrograms();
        }
      });
    }

    if (elements.archFilter) {
      elements.archFilter.addEventListener("change", function () {
        lastCatalogScrollY = 0;
        state.arch = elements.archFilter.value;
        state.currentPage = 1;
        if (state.activeItem) {
          closeItemDetail(true, false, true);
        } else {
          renderPrograms();
          triggerViewFade(elements.catalogView);
        }
      });
    }

    if (elements.sortFilter) {
      elements.sortFilter.addEventListener("change", function () {
        lastCatalogScrollY = 0;
        state.sort = elements.sortFilter.value;
        state.currentPage = 1;
        if (state.activeItem) {
          closeItemDetail(true, false, true);
        } else {
          renderPrograms();
          triggerViewFade(elements.catalogView);
        }
      });
    }

    if (elements.clearFilters) {
      elements.clearFilters.addEventListener("click", resetAllFilters);
    }

    if (elements.resetSearch) {
      elements.resetSearch.addEventListener("click", resetAllFilters);
    }

    if (elements.prevPageBtn) {
      elements.prevPageBtn.addEventListener("click", function () {
        if (state.currentPage > 1) {
          lastCatalogScrollY = 0;
          state.currentPage--;
          renderPrograms();
          triggerViewFade(elements.catalogView);
          window.scrollTo(0, 0);
        }
      });
    }

    if (elements.nextPageBtn) {
      elements.nextPageBtn.addEventListener("click", function () {
        var totalPages = Math.ceil(getFilteredPrograms().length / state.itemsPerPage);
        if (state.currentPage < totalPages) {
          lastCatalogScrollY = 0;
          state.currentPage++;
          renderPrograms();
          triggerViewFade(elements.catalogView);
          window.scrollTo(0, 0);
        }
      });
    }

    if (elements.backToListBtn) {
      elements.backToListBtn.addEventListener("click", function () {
        closeItemDetail(true, true, false);
      });
    }

    if (window.addEventListener) {
      window.addEventListener("hashchange", checkUrlHash, false);
    }
  }

  function normalizeProgram(raw) {
    if (!raw || typeof raw !== "object") {
      return null;
    }
    var nombre = sanitizeText(raw.nombre, 80);
    if (!nombre) {
      return null;
    }
    var slug = sanitizeText(raw.slug, 60)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!slug) {
      slug = nombre
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }

    return {
      slug: slug,
      icono: sanitizeText(raw.icono || raw.imagen, 300),
      nombre: nombre,
      seccion: sanitizeText(raw.seccion, 40),
      categoria: sanitizeText(raw.categoria, 40) || "General",
      subcategoria: sanitizeText(raw.subcategoria, 50),
      editor: sanitizeText(raw.editor, 60),
      version: sanitizeText(raw.version, 40),
      precio: sanitizeText(raw.precio, 25),
      arquitectura: sanitizeText(raw.arquitectura, 25),
      tamano: sanitizeText(raw.tamano, 30),
      actualizado: sanitizeText(raw.actualizado, 20),
      sha256: sanitizeText(raw.sha256, 128),
      notas: sanitizeText(raw.notas, 600),
      totalDescargas: Number(raw.totalDescargas) || 0,
      sistemas: Array.isArray(raw.sistemas)
        ? raw.sistemas.map(function (s) {
            return sanitizeText(s, 25);
          })
        : [],
      descripcion: sanitizeText(raw.descripcion, 800),
      urlDescarga: raw.urlDescarga || null,
      urlOficial: raw.urlOficial || null,
      descargas: Array.isArray(raw.descargas) ? raw.descargas : []
    };
  }

  function loadCatalog() {
    var xhr = new XMLHttpRequest();
    var url = "./data/programas.json?v=" + String(new Date().getTime());
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) {
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
          if (!Array.isArray(data)) {
            throw new Error("Formato inválido");
          }
          state.programs = data
            .map(normalizeProgram)
            .filter(function (item) {
              return item !== null;
            });

          if (elements.totalProgramas) {
            elements.totalProgramas.textContent = String(state.programs.length);
          }

          renderSidebarMenu();
          renderPrograms();
          checkUrlHash();
        } catch (err) {
          showLoadError();
        }
      } else {
        showLoadError();
      }
    };
    xhr.send();
  }

  function showLoadError() {
    if (elements.programList) elements.programList.innerHTML = "";
    if (elements.resultsCount) elements.resultsCount.textContent = "Error al cargar";
    if (elements.errorState) elements.errorState.hidden = false;
  }

  if (elements.currentYear) {
    elements.currentYear.textContent = String(new Date().getFullYear());
  }

  bindEvents();
  loadCatalog();
})();