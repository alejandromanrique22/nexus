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
    price: "",
    sort: "nombre"
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
    priceFilter: document.getElementById("priceFilter"),
    sortFilter: document.getElementById("sortFilter"),
    clearFilters: document.getElementById("clearFilters"),
    resetSearch: document.getElementById("resetSearch"),
    totalProgramas: document.getElementById("totalProgramas"),
    totalCategorias: document.getElementById("totalCategorias"),
    currentYear: document.getElementById("currentYear")
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

  function formatDownloads(num) {
    if (typeof num !== "number" || num <= 0) {
      return "";
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(".0", "") + "M descargas";
    }
    if (num >= 1000) {
      return Math.round(num / 1000) + "k descargas";
    }
    return num + " descargas";
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
      if (state.price && prog.precio !== state.price) {
        return false;
      }
      if (query) {
        var haystack = [
          prog.nombre,
          prog.categoria,
          prog.editor,
          prog.descripcion,
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

  function renderPrograms() {
    var list = elements.programList;
    if (!list) {
      return;
    }

    var filtered = getFilteredPrograms();
    list.innerHTML = "";

    if (elements.resultsCount) {
      var total = filtered.length;
      elements.resultsCount.textContent =
        total === 1 ? "Mostrando 1 programa" : "Mostrando " + total + " programas";
    }

    if (filtered.length === 0) {
      if (elements.emptyState) {
        elements.emptyState.hidden = false;
      }
      return;
    }

    if (elements.emptyState) {
      elements.emptyState.hidden = true;
    }

    var fragment = document.createDocumentFragment();
    filtered.forEach(function (prog) {
      fragment.appendChild(createProgramCard(prog));
    });
    list.appendChild(fragment);
  }

  function resetAllFilters() {
    state.category = "Todas";
    state.search = "";
    state.system = "";
    state.price = "";
    state.sort = "nombre";

    if (elements.searchInput) {
      elements.searchInput.value = "";
    }
    if (elements.systemFilter) {
      elements.systemFilter.value = "";
    }
    if (elements.priceFilter) {
      elements.priceFilter.value = "";
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
        renderPrograms();
      });
    }

    if (elements.systemFilter) {
      elements.systemFilter.addEventListener("change", function () {
        state.system = elements.systemFilter.value;
        renderPrograms();
      });
    }

    if (elements.priceFilter) {
      elements.priceFilter.addEventListener("change", function () {
        state.price = elements.priceFilter.value;
        renderPrograms();
      });
    }

    if (elements.sortFilter) {
      elements.sortFilter.addEventListener("change", function () {
        state.sort = elements.sortFilter.value;
        renderPrograms();
      });
    }

    if (elements.clearFilters) {
      elements.clearFilters.addEventListener("click", resetAllFilters);
    }

    if (elements.resetSearch) {
      elements.resetSearch.addEventListener("click", resetAllFilters);
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
    fetch("./data/programas.json", { cache: "no-store" })
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
var copyWpiBtn = document.getElementById("copyWpiHash");
  var wpiHashEl = document.getElementById("wpiHash");
  if (copyWpiBtn && wpiHashEl) {
    copyWpiBtn.addEventListener("click", function () {
      var text = wpiHashEl.textContent.trim();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          copyWpiBtn.textContent = "¡Copiado!";
          setTimeout(function () { copyWpiBtn.textContent = "Copiar"; }, 2000);
        });
      }
    });
  }
  bindEvents();
  loadCatalog();
})();