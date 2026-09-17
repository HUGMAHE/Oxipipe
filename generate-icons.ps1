Add-Type -AssemblyName System.Drawing

New-Item -ItemType Directory -Force -Path 'src-tauri\icons' | Out-Null

function New-OxipipeIcon([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.InterpolationMode = 'HighQualityBicubic'

    # Background: dark navy
    $g.Clear([System.Drawing.Color]::FromArgb(255, 6, 9, 18))

    # Background panel: dark indigo
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 20, 22, 60))
    $margin = [int]($size * 0.05)
    $g.FillRectangle($bgBrush, $margin, $margin, $size - $margin*2, $size - $margin*2)
    $bgBrush.Dispose()

    $pw = [Math]::Max(2, [int]($size * 0.055))
    $cx = [int]($size / 2)
    $cy = [int]($size / 2)
    $r  = [int]($size * 0.22)

    # Left node (input) - indigo circle
    $penIn  = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 99, 102, 241), $pw)
    $penOut = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 6, 182, 212), $pw)
    $penLink = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 139, 92, 246), [Math]::Max(1, [int]($pw * 0.7)))

    $lx = [int]($cx - $r * 1.4)
    $ly = [int]($cy - $r)
    $g.DrawEllipse($penIn, $lx, $ly, $r*2, $r*2)

    # Right node (output) - cyan circle
    $rx = [int]($cx + $r * 0.15)
    $ry = [int]($cy - $r * 0.5)
    $g.DrawEllipse($penOut, $rx, $ry, $r*2, $r*2)

    # Connecting arrow
    $x1 = [int]($lx + $r * 2)
    $y1 = [int]($ly + $r)
    $x2 = $rx
    $y2 = [int]($ry + $r)
    $g.DrawLine($penLink, $x1, $y1, $x2, $y2)

    # Arrow head
    $arrowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 139, 92, 246))
    $arrowSize = [Math]::Max(3, [int]($pw * 1.5))
    $arrowPoints = @(
        [System.Drawing.Point]::new($x2 + $arrowSize, $y2),
        [System.Drawing.Point]::new($x2 - $arrowSize, $y2 - $arrowSize),
        [System.Drawing.Point]::new($x2 - $arrowSize, $y2 + $arrowSize)
    )
    $g.FillPolygon($arrowBrush, $arrowPoints)
    $arrowBrush.Dispose()

    $penIn.Dispose()
    $penOut.Dispose()
    $penLink.Dispose()
    $g.Dispose()
    return $bmp
}

# 32x32
$b = New-OxipipeIcon 32
$b.Save('src-tauri\icons\32x32.png', [System.Drawing.Imaging.ImageFormat]::Png)
$b.Dispose()

# 128x128
$b = New-OxipipeIcon 128
$b.Save('src-tauri\icons\128x128.png', [System.Drawing.Imaging.ImageFormat]::Png)
$b.Dispose()

# 128x128@2x (256)
$b = New-OxipipeIcon 256
$b.Save('src-tauri\icons\128x128@2x.png', [System.Drawing.Imaging.ImageFormat]::Png)
$b.Save('src-tauri\icons\icon.png', [System.Drawing.Imaging.ImageFormat]::Png)

# Build ICO from the 256px PNG
$ms = New-Object System.IO.MemoryStream
$b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = $ms.ToArray()
$ms.Dispose()
$b.Dispose()

# ICO binary format: 6-byte header + 16-byte dir entry + PNG data
$header   = [byte[]](0,0, 1,0, 1,0)
$imgSize  = [BitConverter]::GetBytes([uint32]$pngBytes.Length)
$offset   = [BitConverter]::GetBytes([uint32]22)
$dirEntry = [byte[]](0,0,0,0, 1,0, 32,0) + $imgSize + $offset
$icoBytes = $header + $dirEntry + $pngBytes
[System.IO.File]::WriteAllBytes('src-tauri\icons\icon.ico', $icoBytes)

# macOS icns placeholder (copy PNG, tauri-build will handle it)
Copy-Item 'src-tauri\icons\128x128@2x.png' 'src-tauri\icons\icon.icns' -Force

Write-Host "Done! Icons:"
Get-ChildItem 'src-tauri\icons'
