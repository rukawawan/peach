$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$project = Split-Path -Parent $PSScriptRoot
$version = '1.0.4370.26'
$sdkHash = '1C0DACAC84B70109B3FD42F90C53A0BA942ABC3A87590D7A4E0CCD86E4A06CF4'
$package = Join-Path $project "build/webview2-$version.nupkg"
$output = Join-Path $project 'build/windows-webview'
New-Item -ItemType Directory -Force -Path $output | Out-Null

if (!(Test-Path -LiteralPath $package)) {
    $feed = 'https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2'
    $download = "$package.$PID.download"
    try {
        Invoke-WebRequest -Uri "$feed/$version/microsoft.web.webview2.$version.nupkg" -OutFile $download
        if ((Get-FileHash -Algorithm SHA256 -LiteralPath $download).Hash -ne $sdkHash) {
            throw 'WebView2 SDK checksum mismatch.'
        }
        Move-Item -LiteralPath $download -Destination $package -Force
    } finally {
        Remove-Item -LiteralPath $download -ErrorAction SilentlyContinue
    }
}
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $package).Hash -ne $sdkHash) {
    throw 'WebView2 SDK checksum mismatch.'
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($package)
try {
    $files = @(
        'lib/net462/Microsoft.Web.WebView2.Core.dll'
        'lib/net462/Microsoft.Web.WebView2.WinForms.dll'
        'build/native/x64/WebView2Loader.dll'
        'LICENSE.txt'
    )
    foreach ($path in $files) {
        $entry = $archive.GetEntry($path)
        [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, (Join-Path $output $entry.Name), $true)
    }
} finally {
    $archive.Dispose()
}

$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
$exe = Join-Path $output 'PeachWindow.exe'
$icon = Join-Path $project 'resources/peach.ico'
& $compiler /nologo /target:winexe /platform:x64 /define:TRACE "/win32icon:$icon" "/out:$exe" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll `
    "/reference:$output/Microsoft.Web.WebView2.Core.dll" "/reference:$output/Microsoft.Web.WebView2.WinForms.dll" `
    (Join-Path $PSScriptRoot 'windows_webview.cs')
if ($LASTEXITCODE -ne 0) { throw 'Peach WebView2 host build failed.' }
