$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8080
$prefixLocal = "http://127.0.0.1:$port/"
$lanIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
  $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown"
} | Select-Object -First 1 -ExpandProperty IPAddress)

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".png"  = "image/png"
  ".svg"  = "image/svg+xml"
  ".webp" = "image/webp"
  ".ico"  = "image/x-icon"
  ".json" = "application/json"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefixLocal)
if ($lanIp) {
  try { $listener.Prefixes.Add("http://$lanIp`:$port/") } catch { }
}
$listener.Start()

Write-Host ""
Write-Host " Nami Sushi - Cardapio digital"
Write-Host " Neste computador: $prefixLocal"
if ($lanIp) { Write-Host " Na mesma rede Wi-Fi: http://$lanIp`:$port/" }
Write-Host " Pressione Ctrl+C para encerrar"
Write-Host ""

Start-Process $prefixLocal

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $path = [System.Uri]::UnescapeDataString($context.Request.Url.LocalPath)
  if ($path -eq "/") { $path = "/index.html" }

  $relative = $path.TrimStart("/").Replace("/", [IO.Path]::DirectorySeparatorChar)
  $file = [IO.Path]::GetFullPath((Join-Path $root $relative))

  if (-not $file.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $file -PathType Leaf)) {
    $context.Response.StatusCode = 404
    $bytes = [Text.Encoding]::UTF8.GetBytes("Nao encontrado")
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.Close()
    continue
  }

  $ext = [IO.Path]::GetExtension($file).ToLowerInvariant()
  $context.Response.ContentType = $(if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" })
  $bytes = [IO.File]::ReadAllBytes($file)
  $context.Response.ContentLength64 = $bytes.Length
  $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $context.Response.Close()
}
