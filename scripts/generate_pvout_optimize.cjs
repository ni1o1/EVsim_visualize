const fs = require('fs')
const path = require('path')

const pvoutDir = path.join(__dirname, '..', '..', 'data', 'pvout')
const outDir = path.join(__dirname, '..', 'public', 'pvout_optimize')
const outFile = path.join(outDir, 'grid_hourly_avg_mw.json')

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function listCsvFiles(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.csv'))
}

function parseAndAvgByHour(csvText) {
  const lines = csvText.split(/\r?\n/)
  if (!lines.length) return Array(24).fill(0)
  // header: date,hour,type,pv_energy_mwh
  const sum = Array(24).fill(0)
  const cnt = Array(24).fill(0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const parts = line.split(',')
    if (parts.length < 4) continue
    const hour = Number(parts[1])
    const val = Number(parts[3])
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) continue
    if (!Number.isFinite(val)) continue
    sum[hour] += val
    cnt[hour] += 1
  }
  const avg = Array(24).fill(0)
  for (let h = 0; h < 24; h++) {
    avg[h] = cnt[h] > 0 ? sum[h] / cnt[h] : 0
  }
  return avg
}

function main() {
  if (!fs.existsSync(pvoutDir)) {
    console.error('pvout dir missing:', pvoutDir)
    process.exit(1)
  }
  ensureDir(outDir)
  const files = listCsvFiles(pvoutDir)
  const result = {}
  for (const f of files) {
    const key = f.replace(/\.csv$/, '')
    const p = path.join(pvoutDir, f)
    try {
      const text = fs.readFileSync(p, 'utf-8')
      result[key] = parseAndAvgByHour(text)
    } catch (e) {
      // skip bad file
    }
  }
  fs.writeFileSync(outFile, JSON.stringify(result), 'utf-8')
  console.log('written pvout hourly avg (MW) to', outFile)
}

main()

