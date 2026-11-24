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

function Get-FileNameFromUrl([string]$rawUrl) {
  if ([string]::IsNullOrWhiteSpace($rawUrl)) { return "" }
  $cleanUrl = ($rawUrl -split '\?')[0]
  $lastSegment = ($cleanUrl -split '/')[-1]
  if (-not $lastSegment) { return "" }
  return [System.Uri]::UnescapeDataString($lastSegment)
}

function Infer-Section($item) {
  if ($item.seccion) {
    return [string]$item.seccion
  }
  $cat  = ([string]$item.categoria).ToLower()
  $name = ([string]$item.nombre).ToLower()
  if ($cat.Contains("iso") -or $cat.Contains("sistema") -or $name.Contains("iso")) {
    return "Sistemas / ISOs"
  }
  if ($cat.Contains("util") -or $cat.Contains("driver") -or $cat.Contains("compresor")) {
    return "Utilidades"
  }
  return "Programas"
}

$emDash    = [string][char]0x2014
$midDot    = [string][char]0x00B7
$oAcute    = [string][char]0x00F3
$OAcute    = [string][char]0x00D3
$aAcute    = [string][char]0x00E1
$eAcute    = [string][char]0x00E9
$iAcute    = [string][char]0x00ED
$nTilde    = [string][char]0x00F1
$copySign  = [string][char]0x00A9
$sepDot    = " " + $midDot + " "

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$rawJson   = [System.IO.File]::ReadAllText($jsonPath, $utf8NoBom)
$items     = $rawJson | ConvertFrom-Json

foreach ($item in $items) {
  if (-not $item.nombre) { continue }

  if ($item.slug) {
    $slug = ([string]$item.slug).ToLower() -replace '[^a-z0-9-]+', '-'
  } else {
    $slug = ([string]$item.nombre).ToLower() -replace '[^a-z0-9]+', '-'
  }
  $slug = $slug.Trim('-')

  $nombreRaw  = [string]$item.nombre
  $nombreSafe = Escape-Html $nombreRaw

  $seccionRaw  = Infer-Section $item
  $seccionSafe = Escape-Html $seccionRaw

  if ($item.categoria) {
    $categoriaRaw = [string]$item.categoria
  } else {
    $categoriaRaw = "General"
  }
  $subcatRaw = [string]$item.subcategoria

  if ($subcatRaw) {
    $catBadgeText = $categoriaRaw + $sepDot + $subcatRaw
  } else {
    $catBadgeText = $categoriaRaw
  }
  $catBadgeSafe = Escape-Html $catBadgeText

  $crumbParts = @($seccionRaw, $categoriaRaw)
  if ($subcatRaw) { $crumbParts += $subcatRaw }
  $crumbParts += $nombreRaw
  $crumbSafe = Escape-Html ($crumbParts -join " / ")

  if ($item.editor) {
    $editorRaw = [string]$item.editor
  } else {
    $editorRaw = "No especificado"
  }
  $editorSafe = Escape-Html $editorRaw

  $versionRaw = [string]$item.version
  if ($versionRaw) {
    $versionSafe = Escape-Html $versionRaw
  } else {
    $versionSafe = Escape-Html $emDash
  }
  $versionClean = $versionRaw -replace '^(?i)v', ''

  $subParts = @()
  if ($item.editor) { $subParts += ("Por " + [string]$item.editor) }
  if ($versionClean) { $subParts += ("Versi" + $oAcute + "n " + $versionClean) }
  if ($item.tamano) { $subParts += [string]$item.tamano }
  if ($subParts.Count -gt 0) {
    $subtitleSafe = Escape-Html ($subParts -join $sepDot)
  } else {
    $subtitleSafe = Escape-Html "Paquete de software"
  }

  if ($item.arquitectura) {
    $archSafe = Escape-Html ([string]$item.arquitectura)
  } else {
    $archSafe = Escape-Html $emDash
  }

  if ($item.tamano) {
    $tamanoSafe = Escape-Html ([string]$item.tamano)
  } else {
    $tamanoSafe = Escape-Html $emDash
  }

  if ($item.precio) {
    $precioSafe = Escape-Html ([string]$item.precio)
  } else {
    $precioSafe = Escape-Html "Gratis"
  }

  if ($item.actualizado) {
    $actualizadoSafe = Escape-Html ([string]$item.actualizado)
  } else {
    $actualizadoSafe = Escape-Html "2026"
  }

  if ($slug) {
    $slugSafe = Escape-Html $slug
  } else {
    $slugSafe = Escape-Html $emDash
  }

  if ($item.descripcion) {
    $descSafe = Escape-Html ([string]$item.descripcion)
  } else {
    $descSafe = Escape-Html ("Sin descripci" + $oAcute + "n detallada disponible.")
  }

  $notasSafe = Escape-Html ([string]$item.notas)

  if ($item.sistemas -and $item.sistemas.Count -gt 0) {
    $sistemasBase = ($item.sistemas) -join ", "
  } else {
    $sistemasBase = "Windows"
  }
  $sistemasSafe = Escape-Html $sistemasBase

  $initialSafe  = Escape-Html ($nombreRaw.Substring(0, 1).ToUpper())
  $iconSrc      = Get-SafeIconSrc ([string]$item.icono)
  $iconSrcSafe  = Escape-Html $iconSrc

  if ($iconSrcSafe) {
    $badgeHtml = "<div class=`"detail-badge-icon has-icon`"><img src=`"$iconSrcSafe`" alt=`"$nombreSafe`"></div>"
  } else {
    $badgeHtml = "<div class=`"detail-badge-icon`">$initialSafe</div>"
  }

  $descargasHtml = ""
  $hasRows = $false

  if ($item.descargas -and $item.descargas.Count -gt 0) {
    foreach ($d in $item.descargas) {
      if ($d.url) {
        if ($d.etiqueta) {
          $etq = Escape-Html ([string]$d.etiqueta)
        } else {
          $etq = Escape-Html "Archivo de descarga"
        }
        $urlRaw = [string]$d.url
        $url = Escape-Html $urlRaw
        $fileName = Get-FileNameFromUrl $urlRaw
        if ($fileName) {
          $fileNameHtml = "<div class=`"mono-col`">$(Escape-Html $fileName)</div>"
        } else {
          $fileNameHtml = ""
        }
        if ($d.sistemas -and $d.sistemas.Count -gt 0) {
          $dSystems = ($d.sistemas) -join ", "
        } else {
          $dSystems = $sistemasBase
        }
        $dSystemsSafe = Escape-Html $dSystems

        $descargasHtml += "<tr><td><strong>$etq</strong>$fileNameHtml</td><td class=`"mono-col`">$dSystemsSafe</td><td class=`"action-links`"><a class=`"btn-classic btn-primary`" href=`"$url`" target=`"_blank`" rel=`"noopener noreferrer`">Descargar</a></td></tr>`n"
        $hasRows = $true
      }
    }
  }

  if (-not $hasRows -and $item.urlDescarga) {
    $urlRaw = [string]$item.urlDescarga
    $url = Escape-Html $urlRaw
    $fileName = Get-FileNameFromUrl $urlRaw
    if ($fileName) {
      $fileNameHtml = "<div class=`"mono-col`">$(Escape-Html $fileName)</div>"
    } else {
      $fileNameHtml = ""
    }
    $pkgLabel = "Paquete de instalaci" + $oAcute + "n"
    $descargasHtml += "<tr><td><strong>$pkgLabel</strong>$fileNameHtml</td><td class=`"mono-col`">$sistemasSafe</td><td class=`"action-links`"><a class=`"btn-classic btn-primary`" href=`"$url`" target=`"_blank`" rel=`"noopener noreferrer`">Descargar</a></td></tr>`n"
    $hasRows = $true
  }

  if ($item.urlOficial) {
    $offUrl = Escape-Html ([string]$item.urlOficial)
    $descargasHtml += "<tr><td><strong>Sitio oficial del desarrollador</strong></td><td class=`"mono-col`">Enlace externo</td><td class=`"action-links`"><a class=`"btn-classic`" href=`"$offUrl`" target=`"_blank`" rel=`"noopener noreferrer`">Abrir web oficial</a></td></tr>`n"
    $hasRows = $true
  }

  if (-not $hasRows) {
    $emptyMsg = "No hay archivos publicados todav" + $iAcute + "a para este elemento."
    $descargasHtml = "<tr><td colspan=`"3`">$emptyMsg</td></tr>`n"
  }

  $notasBlock = ""
  if ($notasSafe) {
    $notasTitle = "Notas t" + $eAcute + "cnicas / Instalaci" + $oAcute + "n:"
    $notasBlock = "<div class=`"detail-notes`"><strong>$notasTitle</strong><p>$notasSafe</p></div>"
  }

  $hashRowHtml = ""
  if ($item.sha256) {
    $hashSafe = Escape-Html ([string]$item.sha256)
    $hashRowHtml = "<tr><th>Hash SHA-256</th><td colspan=`"3`" class=`"mono-col hash-cell`">$hashSafe</td></tr>`n"
  }

  $descTitle = "DESCRIPCI" + $OAcute + "N DEL PAQUETE"
  $accionTh  = "Acci" + $oAcute + "n"
  $verTh     = "Versi" + $oAcute + "n / Compilaci" + $oAcute + "n"
  $tamTh     = "Tama" + $nTilde + "o Aproximado"
  $catLink   = "Cat" + $aAcute + "logo principal"

  $html = @"
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="$descSafe">
  <title>$nombreSafe $emDash Nexus</title>
  <link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../css/styles.css?v=32">
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
    <main class="content-area">
      <div class="detail-nav-bar">
        <a class="btn-classic" href="../index.html">&laquo; Volver al listado</a>
        <span class="detail-crumb">$crumbSafe</span>
      </div>

      <div class="detail-header-box">
        $badgeHtml
        <div class="detail-header-info">
          <div class="detail-kicker">
            <span class="detail-tag">$seccionSafe</span>
            <span class="detail-tag detail-tag-alt">$catBadgeSafe</span>
          </div>
          <h1>$nombreSafe</h1>
          <div class="detail-subtitle">$subtitleSafe</div>
        </div>
      </div>

      <div class="detail-block">
        <div class="detail-block-title">$descTitle</div>
        <div class="detail-block-body">
          <p class="detail-text">$descSafe</p>
          $notasBlock
        </div>
      </div>

      <div class="detail-block">
        <div class="detail-block-title">ARCHIVOS Y VARIANTES DE DESCARGA</div>
        <div class="detail-block-body no-pad">
          <table class="catalog-table files-table">
            <thead>
              <tr>
                <th>Variante / Nombre de archivo</th>
                <th>Compatibilidad</th>
                <th>$accionTh</th>
              </tr>
            </thead>
            <tbody>
              $descargasHtml            </tbody>
          </table>
        </div>
      </div>

      <div class="detail-block">
        <div class="detail-block-title">ESPECIFICACIONES Y METADATOS</div>
        <div class="detail-block-body no-pad">
          <table class="specs-table detail-specs">
            <tbody>
              <tr>
                <th>Desarrollador / Editor</th>
                <td>$editorSafe</td>
                <th>$verTh</th>
                <td>$versionSafe</td>
              </tr>
              <tr>
                <th>Sistemas Soportados</th>
                <td>$sistemasSafe</td>
                <th>Arquitectura</th>
                <td>$archSafe</td>
              </tr>
              <tr>
                <th>$tamTh</th>
                <td>$tamanoSafe</td>
                <th>Licencia</th>
                <td>$precioSafe</td>
              </tr>
              <tr>
                <th>Identificador (Slug)</th>
                <td class="mono-col">$slugSafe</td>
                <th>Actualizado</th>
                <td>$actualizadoSafe</td>
              </tr>
              $hashRowHtml            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>

  <footer class="footer-bar">
    <div class="footer-inner">
      <span>$copySign 2026 Nexus $midDot Alejandro Manrique (Trelew, Chubut, Argentina).</span>
      <span><a href="../index.html">$catLink</a></span>
    </div>
  </footer>
</body>
</html>
"@

  $filePath = Join-Path $outDir "$slug.html"
  [System.IO.File]::WriteAllText($filePath, $html, $utf8NoBom)
}

Write-Host "Fichas generadas correctamente en: $outDir" -ForegroundColor Green