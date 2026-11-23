$ErrorActionPreference = "Stop"

$jsonPath = Join-Path $PSScriptRoot "..\data\programas.json"
$outDir   = Join-Path $PSScriptRoot "..\ficha"

if (-not (Test-Path $jsonPath)) {
  Write-Error "No se encontro data/programas.json en $jsonPath"
}

if (-not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

function Escape-Html([string]$text) {
  if ([string]::IsNullOrEmpty($text)) { return "" }
  return [System.Net.WebUtility]::HtmlEncode($text)
}

function Get-SafeIconSrc([string]$rawIcon) {
  if ([string]::IsNullOrWhiteSpace($rawIcon)) { return "" }
  $trimmed = $rawIcon.Trim()
  if ($trimmed -match '^(?i)javascript:') { return "" }

  if ($trimmed -match '^(?i)https?://') {
    return $trimmed
  }

  $cleanRel = ($trimmed -replace '^\./', '' -replace '^/', '')
  if ($cleanRel -match '^(?i)img/') {
    return "../$cleanRel"
  }

  return ""
}

$rawJson = Get-Content -Path $jsonPath -Raw -Encoding UTF8
$items = $rawJson | ConvertFrom-Json

foreach ($item in $items) {
  if (-not $item.nombre) { continue }

  $slug = if ($item.slug) {
    ($item.slug.ToLower() -replace '[^a-z0-9-]+', '-').Trim('-')
  } else {
    ($item.nombre.ToLower() -replace '[^a-z0-9]+', '-').Trim('-')
  }

  $nombreRaw    = [string]$item.nombre
  $nombreSafe   = Escape-Html $nombreRaw
  $editorSafe   = Escape-Html ([string]$item.editor)
  $versionSafe  = Escape-Html ([string]$item.version)
  $archSafe     = Escape-Html ([string]$item.arquitectura)
  $tamanoSafe   = Escape-Html ([string]$item.tamano)
  $precioSafe   = Escape-Html ([string]$item.precio)
  $descSafe     = Escape-Html ([string]$item.descripcion)
  $notasSafe    = Escape-Html ([string]$item.notas)
  $sistemasText = if ($item.sistemas) { Escape-Html (($item.sistemas) -join ", ") } else { "Windows" }

  $initialSafe  = Escape-Html ($nombreRaw.Substring(0, 1).ToUpper())
  $iconSrc      = Get-SafeIconSrc ([string]$item.icono)
  $iconSrcSafe  = Escape-Html $iconSrc

  $badgeHtml = if ($iconSrcSafe) {
    "<div class=`"detail-badge-icon has-icon`"><img src=`"$iconSrcSafe`" alt=`"$nombreSafe`"></div>"
  } else {
    "<div class=`"detail-badge-icon`">$initialSafe</div>"
  }

  $descargasHtml = ""
  if ($item.descargas -and $item.descargas.Count -gt 0) {
    foreach ($d in $item.descargas) {
      if ($d.url) {
        $etq = Escape-Html ([string]$d.etiqueta)
        $url = Escape-Html ([string]$d.url)
        $descargasHtml += "<tr><td><strong>$etq</strong></td><td><a class=`"btn-classic btn-primary`" href=`"$url`" target=`"_blank`" rel=`"noopener noreferrer`">Descargar</a></td></tr>`n"
      }
    }
  } elseif ($item.urlDescarga) {
    $url = Escape-Html ([string]$item.urlDescarga)
    $descargasHtml += "<tr><td><strong>Instalador / Archivo</strong></td><td><a class=`"btn-classic btn-primary`" href=`"$url`" target=`"_blank`" rel=`"noopener noreferrer`">Descargar</a></td></tr>`n"
  }

  if ($item.urlOficial) {
    $offUrl = Escape-Html ([string]$item.urlOficial)
    $descargasHtml += "<tr><td><strong>Sitio oficial</strong></td><td><a class=`"btn-classic`" href=`"$offUrl`" target=`"_blank`" rel=`"noopener noreferrer`">Abrir web oficial</a></td></tr>`n"
  }

  if (-not $descargasHtml) {
    $descargasHtml = "<tr><td colspan=`"2`">Enlace pendiente de publicacion.</td></tr>"
  }

  $notasBlock = ""
  if ($notasSafe) {
    $notasBlock = "<div class=`"detail-notes`"><strong>Notas tecnicas:</strong><p>$notasSafe</p></div>"
  }

  $html = @"
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="$descSafe">
  <title>$nombreSafe — Nexus</title>
  <link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../css/styles.css?v=30">
</head>
<body>
  <header class="topbar">
    <div class="topbar-inner">
      <div class="brand-box">
        <a class="brand-link" href="../index.html">
          <img class="brand-logo" src="../assets/favicon.svg" alt="">
          <span class="brand-title">NEXUS</span>
          <span class="brand-tag">Software &amp; ISOs</span>
        </a>
      </div>
    </div>
  </header>

  <div class="portal-layout">
    <main class="content-area" style="margin-left: 0; width: 100%;">
      <div class="detail-nav-bar">
        <a class="btn-classic" href="../index.html">« Volver al catalogo</a>
        <span class="detail-crumb">Ficha / $nombreSafe</span>
      </div>

      <div class="detail-header-box">
        $badgeHtml
        <div class="detail-header-info" style="margin-right: 0;">
          <h1>$nombreSafe</h1>
          <div class="detail-subtitle">Editor: $editorSafe · Version: $versionSafe · Tamano: $tamanoSafe</div>
        </div>
      </div>

      <div class="detail-block">
        <div class="detail-block-title">DESCRIPCION</div>
        <div class="detail-block-body">
          <p class="detail-text">$descSafe</p>
          $notasBlock
        </div>
      </div>

      <div class="detail-block">
        <div class="detail-block-title">DESCARGAS</div>
        <div class="detail-block-body no-pad">
          <table class="catalog-table files-table">
            <thead>
              <tr>
                <th>Archivo / Variante</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              $descargasHtml
            </tbody>
          </table>
        </div>
      </div>

      <div class="detail-block">
        <div class="detail-block-title">ESPECIFICACIONES</div>
        <div class="detail-block-body no-pad">
          <table class="specs-table">
            <tbody>
              <tr>
                <th>Sistemas</th>
                <td>$sistemasText</td>
                <th>Arquitectura</th>
                <td>$archSafe</td>
              </tr>
              <tr>
                <th>Version</th>
                <td>$versionSafe</td>
                <th>Licencia</th>
                <td>$precioSafe</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>

  <footer class="footer-bar">
    <div class="footer-inner">
      <span>© 2026 Nexus · Alejandro Manrique (Trelew, Chubut, Argentina).</span>
      <span><a href="../index.html">Catalogo principal</a></span>
    </div>
  </footer>
</body>
</html>
"@

  $filePath = Join-Path $outDir "$slug.html"
  Set-Content -Path $filePath -Value $html -Encoding UTF8
}

Write-Host "Fichas generadas correctamente en: $outDir" -ForegroundColor Green