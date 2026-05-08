$file = Join-Path $PSScriptRoot 'app\components\DashboardStats.tsx'
$content = Get-Content $file -Raw -Encoding UTF8

# 1. Outer card: bright orange gradient + shadow -> premium golden
$content = $content -replace `
  'bg-gradient-to-br from-orange-400 to-amber-500 shadow-md transition-all duration-300 ease-out hover:scale-\[1\.02\] hover:shadow-\[0_20px_48px_-12px_rgba\(251,146,60,0\.45\)\]', `
  'bg-gradient-to-br from-[#fff8e1] via-[#fff3c4] to-[#f6d365] border border-[#e7c86b]/60 shadow-[0_14px_35px_-18px_rgba(120,85,20,0.45)] transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-[0_20px_48px_-12px_rgba(180,130,30,0.40)]'

# 2. Focus ring colour
$content = $content -replace 'focus-visible:ring-orange-400', 'focus-visible:ring-amber-400'

# 3. Card title text (white -> dark amber)
$content = $content -replace `
  'text-white/80 group-hover:text-white transition-colors duration-300">', `
  'text-amber-900/70 group-hover:text-amber-900 transition-colors duration-300">'

# 4. Icon circle: translucent white -> gold gradient
$content = $content -replace `
  'bg-white/20 text-white shadow-lg shadow-black/10 ring-4 ring-white/30 transition-transform duration-300 ease-out group-hover:scale-105 group-hover:bg-white/30', `
  'bg-gradient-to-br from-[#d4af37] via-[#c99400] to-[#8b6508] text-white shadow-lg shadow-amber-800/20 ring-4 ring-amber-300/30 transition-transform duration-300 ease-out group-hover:scale-105'

# 5. Value text (text-white -> text-zinc-800)
$content = $content -replace `
  'font-extrabold tracking-tight text-white tabular-nums', `
  'font-extrabold tracking-tight text-zinc-800 tabular-nums'

# 6. Positive badge (bg-white/25 text-white -> emerald)
$content = $content -replace `
  "'bg-white/25 text-white'", `
  "'bg-emerald-100 text-emerald-700'"

# 7. Negative badge (bg-rose-900/40 text-rose-100 -> cleaner rose)
$content = $content -replace `
  "'bg-rose-900/40 text-rose-100'", `
  "'bg-rose-100 text-rose-700'"

# 8. Description text (text-white/70 -> text-amber-800/60)
$content = $content -replace `
  'text-\[11px\] text-white/70 font-medium tracking-wide', `
  'text-[11px] text-amber-800/60 font-medium tracking-wide'

# 9. Decorative blur circle (bg-white -> bg-amber-300, adjust opacity)
$content = $content -replace `
  'bg-white opacity-\[0\.08\] blur-3xl transition-opacity duration-300 group-hover:opacity-\[0\.15\]', `
  'bg-amber-300 opacity-[0.18] blur-3xl transition-opacity duration-300 group-hover:opacity-[0.30]'

Set-Content $file $content -Encoding UTF8 -NoNewline
Write-Host "SUCCESS: KPI card golden theme applied."
