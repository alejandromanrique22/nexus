/*!
 * Nexus — Catálogo y Biblioteca de Software
 * Autor: Alejandro Manrique
 * Ubicación: Trelew, Chubut, Argentina
 * Copyright (c) 2026 Alejandro Manrique. Todos los derechos reservados.
 * Prohibida su reproducción total o parcial sin autorización expresa del autor.
 */
(function () {
  "use strict";

  var state = {
    programs: [],
    category: "Todas",
    search: "",
    system: "",
    arch: "",
    sort: "nombre",
    currentPage: 1,
    itemsPerPage: 6 // Cantidad de programas que se muestran por página
  };

  var elements = {
    categories: document.getElementById("categories"),
    programList: document.getElementById("programList"),
    resultsCount: document.getElementById("resultsCount"),
    emptyState: document.getElementById("emptyState"),
    errorState: document.getElementById("errorState"),
    searchForm: document.getElementById("searchForm"),
    searchInput: document.getElementById("search"),
    systemFilter: document.getElementById("systemFilter"),
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
    pageInfo: document.getElementById("pageInfo")
  };

  function safeUrl(value) {
    if (typeof value !== "string" || !value.trim()) {
      return null;
    }
    try {
      var parsed = new URL(value.trim(), window.location.origin);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return parsed.href;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function safeAssetPath(value) {
    if (typeof value !== "string") {
      return null;
    }
    var trimmed = value.trim();
    if (/^\.\/assets\/[a-zA-Z0-9._-]+$/.test(trimmed)) {
      return trimmed;
    }
    return safeUrl(trimmed);
  }

  function sanitizeText(value, maxLength) {
    if (typeof value !== "string") {
      return "";
    }
    return value.replace(/\s+/g, " ").trim().slice(0, maxLength || 300);
  }

  function slugIsValid(slug) {
    return typeof slug === "string" && /^[a-z0-9-]{2,60}$/.test(slug);
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

  function renderCategories() {
    var container = elements.categories;
    if (!container) {
      return;
    }
    container.innerHTML = "";

    var unique = ["Todas"];
    state.programs.forEach(function (prog) {
      if (prog.categoria && unique.indexOf(prog.categoria) === -1) {
        unique.push(prog.categoria);
      }
    });

    if (elements.totalCategorias) {
      elements.totalCategorias.textContent = String(Math.max(0, unique.length - 1));
    }

    unique.forEach(function (cat) {
      var btn = createEl(
        "button",
        "category-button" + (state.category === cat ? " active" : ""),
        cat
      );
      btn.type = "button";
      btn.setAttribute("aria-pressed", state.category === cat ? "true" : "false");
      btn.addEventListener("click", function () {
        state.category = cat;
        state.currentPage = 1; // Volver a la página 1 al cambiar de categoría
        renderCategories();
        renderPrograms();
      });
      container.appendChild(btn);
    });
  }

  function buildDownloadActions(prog) {
    var validLinks = [];

    if (Array.isArray(prog.descargas)) {
      prog.descargas.forEach(function (item) {
        if (item && typeof item === "object") {
          var validHref = safeUrl(item.url);
          if (validHref) {
            validLinks.push({
              etiqueta: sanitizeText(item.etiqueta, 45) || "⬇ Descargar",
              url: validHref
            });
          }
        }
      });
    }

    if (validLinks.length === 0) {
      var singleUrl = safeUrl(prog.urlDescarga);
      if (singleUrl) {
        validLinks.push({
          etiqueta: "⬇ Descargar",
          url: singleUrl
        });
      }
    }

    var officialUrl = safeUrl(prog.urlOficial);

    if (validLinks.length > 0) {
      var wrapper = createEl(
        "div",
        validLinks.length > 1 ? "download-options" : "program-actions"
      );

      validLinks.forEach(function (linkItem) {
        var anchor = createEl("a", "download-button", linkItem.etiqueta);
        anchor.href = linkItem.url;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        wrapper.appendChild(anchor);
      });

      if (officialUrl && officialUrl !== validLinks[0].url) {
        var siteBtn = createEl("a", "details-button", "Sitio oficial");
        siteBtn.href = officialUrl;
        siteBtn.target = "_blank";
        siteBtn.rel = "noopener noreferrer";
        wrapper.appendChild(siteBtn);
      }

      return wrapper;
    }

    var actions = createEl("div", "program-actions");
    if (officialUrl) {
      var officialBtn = createEl("a", "download-button", "↗ Sitio oficial");
      officialBtn.href = officialUrl;
      officialBtn.target = "_blank";
      officialBtn.rel = "noopener noreferrer";
      actions.appendChild(officialBtn);
    } else {
      var disabledBtn = createEl("span", "download-button disabled", "Descarga próximamente");
      disabledBtn.setAttribute("aria-disabled", "true");
      actions.appendChild(disabledBtn);
    }
    return actions;
  }

  function createProgramCard(prog) {
    var card = createEl("article", "program-card");

    var imageBox = createEl("div", "program-image");
    var initial = (prog.nombre || "?").charAt(0).toUpperCase();
    var placeholder = createEl("span", "image-placeholder", initial);
    placeholder.setAttribute("aria-hidden", "true");
    imageBox.appendChild(placeholder);

    var imgSrc = safeAssetPath(prog.imagen);
    if (imgSrc) {
      var img = document.createElement("img");
      img.src = imgSrc;
      img.alt = "Vista previa de " + prog.nombre;
      img.loading = "lazy";
      img.addEventListener("error", function () {
        img.remove();
      });
      imageBox.appendChild(img);
    }

    if (prog.destacado === true) {
      imageBox.appendChild(createEl("span", "featured-label", "DESTACADO"));
    }

    card.appendChild(imageBox);

    var content = createEl("div", "program-content");
    content.appendChild(createEl("div", "program-category", prog.categoria || "Software"));
    content.appendChild(createEl("h3", "", prog.nombre));

    var metaParts = [];
    if (prog.editor) {
      metaParts.push(prog.editor);
    }
    if (prog.version) {
      metaParts.push("v" + prog.version.replace(/^v/i, ""));
    }
    if (prog.tamano) {
      metaParts.push(prog.tamano);
    }
    if (metaParts.length > 0) {
      content.appendChild(createEl("div", "program-meta", metaParts.join(" · ")));
    }

    content.appendChild(createEl("p", "program-description", prog.descripcion));

    var badges = createEl("div", "badges");
    if (prog.precio) {
      var priceClass = "badge";
      if (/gratis/i.test(prog.precio)) {
        priceClass += " badge-free";
      } else if (/pago/i.test(prog.precio)) {
        priceClass += " badge-paid";
      }
      badges.appendChild(createEl("span", priceClass, prog.precio));
    }

    if (prog.arquitectura) {
      badges.appendChild(createEl("span", "badge", prog.arquitectura));
    }

    if (Array.isArray(prog.sistemas)) {
      prog.sistemas.forEach(function (sys) {
        if (typeof sys === "string" && sys.trim()) {
          badges.appendChild(createEl("span", "badge", sys.trim()));
        }
      });
    }

    content.appendChild(badges);
    content.appendChild(buildDownloadActions(prog));

    card.appendChild(content);
    return card;
  }

  function matchesArchitecture(progArch, selectedArch) {
    if (!selectedArch) {
      return true;
    }
    var archLower = String(progArch || "").toLowerCase();
    var targetLower = selectedArch.toLowerCase();
    if (!archLower) {
      return false;
    }
    if (targetLower === "32 y 64 bits") {
      return archLower.indexOf("32") !== -1 && archLower.indexOf("64") !== -1;
    }
    return archLower.indexOf(targetLower) !== -1;
  }

  function getFilteredPrograms() {
    var query = state.search.toLowerCase();

    var filtered = state.programs.filter(function (prog) {
      if (state.category !== "Todas" && prog.categoria !== state.category) {
        return false;
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

    filtered.sort(function (a, b) {
      if (state.sort === "recientes") {
        return String(b.actualizado || "").localeCompare(String(a.actualizado || ""));
      }
      if (state.sort === "descargas") {
        return (Number(b.totalDescargas) || 0) - (Number(a.totalDescargas) || 0);
      }
      return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
    });

    return filtered;
  }

  function renderPagination(totalFiltered) {
    var paginationEl = elements.paginationContainer;
    if (!paginationEl) {
      return;
    }

    var totalPages = Math.ceil(totalFiltered / state.itemsPerPage);

    if (totalPages <= 1) {
      paginationEl.hidden = true;
      return;
    }

    paginationEl.hidden = false;
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
    var list = elements.programList;
    if (!list) {
      return;
    }

    var filtered = getFilteredPrograms();
    var totalFiltered = filtered.length;
    var totalPages = Math.ceil(totalFiltered / state.itemsPerPage) || 1;

    if (state.currentPage > totalPages) {
      state.currentPage = totalPages;
    }
    if (state.currentPage < 1) {
      state.currentPage = 1;
    }

    var startIndex = (state.currentPage - 1) * state.itemsPerPage;
    var paginatedItems = filtered.slice(startIndex, startIndex + state.itemsPerPage);

    list.innerHTML = "";

    if (elements.resultsCount) {
      elements.resultsCount.textContent =
        totalFiltered === 1 ? "Mostrando 1 programa" : "Mostrando " + totalFiltered + " programas";
    }

    if (totalFiltered === 0) {
      if (elements.emptyState) {
        elements.emptyState.hidden = false;
      }
      if (elements.paginationContainer) {
        elements.paginationContainer.hidden = true;
      }
      return;
    }

    if (elements.emptyState) {
      elements.emptyState.hidden = true;
    }

    var fragment = document.createDocumentFragment();
    paginatedItems.forEach(function (prog) {
      fragment.appendChild(createProgramCard(prog));
    });
    list.appendChild(fragment);

    renderPagination(totalFiltered);
  }

  function resetAllFilters() {
    state.category = "Todas";
    state.search = "";
    state.system = "";
    state.arch = "";
    state.sort = "nombre";
    state.currentPage = 1;

    if (elements.searchInput) {
      elements.searchInput.value = "";
    }
    if (elements.systemFilter) {
      elements.systemFilter.value = "";
    }
    if (elements.archFilter) {
      elements.archFilter.value = "";
    }
    if (elements.sortFilter) {
      elements.sortFilter.value = "nombre";
    }

    renderCategories();
    renderPrograms();
  }

  function bindEvents() {
    if (elements.searchForm) {
      elements.searchForm.addEventListener("submit", function (e) {
        e.preventDefault();
        state.search = elements.searchInput ? elements.searchInput.value.trim() : "";
        state.currentPage = 1;
        renderPrograms();
        var catalog = document.getElementById("catalogo");
        if (catalog) {
          catalog.scrollIntoView({ behavior: "smooth" });
        }
      });
    }

    if (elements.searchInput) {
      elements.searchInput.addEventListener("input", function () {
        state.search = elements.searchInput.value.trim();
        state.currentPage = 1;
        renderPrograms();
      });
    }

    if (elements.systemFilter) {
      elements.systemFilter.addEventListener("change", function () {
        state.system = elements.systemFilter.value;
        state.currentPage = 1;
        renderPrograms();
      });
    }

    if (elements.archFilter) {
      elements.archFilter.addEventListener("change", function () {
        state.arch = elements.archFilter.value;
        state.currentPage = 1;
        renderPrograms();
      });
    }

    if (elements.sortFilter) {
      elements.sortFilter.addEventListener("change", function () {
        state.sort = elements.sortFilter.value;
        state.currentPage = 1;
        renderPrograms();
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
          state.currentPage--;
          renderPrograms();
          var catalog = document.getElementById("catalogo");
          if (catalog) {
            catalog.scrollIntoView({ behavior: "smooth" });
          }
        }
      });
    }

    if (elements.nextPageBtn) {
      elements.nextPageBtn.addEventListener("click", function () {
        var filtered = getFilteredPrograms();
        var totalPages = Math.ceil(filtered.length / state.itemsPerPage);
        if (state.currentPage < totalPages) {
          state.currentPage++;
          renderPrograms();
          var catalog = document.getElementById("catalogo");
          if (catalog) {
            catalog.scrollIntoView({ behavior: "smooth" });
          }
        }
      });
    }
  }

  function normalizeProgram(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return null;
    }
    var nombre = sanitizeText(raw.nombre, 80);
    if (!nombre) {
      return null;
    }

    var slug = slugIsValid(raw.slug)
      ? raw.slug
      : nombre
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

    return {
      slug: slug,
      nombre: nombre,
      categoria: sanitizeText(raw.categoria, 40) || "General",
      editor: sanitizeText(raw.editor, 60),
      version: sanitizeText(raw.version, 30),
      precio: sanitizeText(raw.precio, 25),
      arquitectura: sanitizeText(raw.arquitectura, 25),
      tamano: sanitizeText(raw.tamano, 25),
      destacado: Boolean(raw.destacado),
      actualizado: sanitizeText(raw.actualizado, 20),
      totalDescargas: Number(raw.totalDescargas) || 0,
      sistemas: Array.isArray(raw.sistemas)
        ? raw.sistemas.map(function (s) {
            return sanitizeText(s, 25);
          })
        : [],
      descripcion: sanitizeText(raw.descripcion, 280),
      imagen: raw.imagen || null,
      urlDescarga: raw.urlDescarga || null,
      urlOficial: raw.urlOficial || null,
      descargas: Array.isArray(raw.descargas) ? raw.descargas : []
    };
  }

  function loadCatalog() {
    var catalogUrl = "./data/programas.json?v=" + String(Date.now());
    fetch(catalogUrl, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        if (!Array.isArray(data)) {
          throw new Error("Formato de catálogo inválido");
        }
        state.programs = data
          .map(normalizeProgram)
          .filter(function (item) {
            return item !== null;
          });

        if (elements.totalProgramas) {
          elements.totalProgramas.textContent = String(state.programs.length);
        }

        renderCategories();
        renderPrograms();
      })
      .catch(function () {
        if (elements.programList) {
          elements.programList.innerHTML = "";
        }
        if (elements.resultsCount) {
          elements.resultsCount.textContent = "Catálogo no disponible";
        }
        if (elements.errorState) {
          elements.errorState.hidden = false;
        }
      });
  }

  if (elements.currentYear) {
    elements.currentYear.textContent = String(new Date().getFullYear());
  }

  bindEvents();
  loadCatalog();
})();