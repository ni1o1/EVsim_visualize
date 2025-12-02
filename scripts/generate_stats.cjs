const fs = require('fs')
const path = require('path')

const powerDir = path.join(__dirname, '..', 'public', 'power')
const outDir = path.join(__dirname, '..', 'public', 'stats')
const outFile = path.join(outDir, 'avg_weekday_weekend.json')

function listJsonFiles(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
}

function main() {
  if (!fs.existsSync(powerDir)) {
    console.error('power dir missing:', powerDir)
    process.exit(1)
  }
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const files = listJsonFiles(powerDir)
  const sum = { weekday: Array(24).fill(0), weekend: Array(24).fill(0) }
  const cnt = { weekday: Array(24).fill(0), weekend: Array(24).fill(0) }

  for (const f of files) {
    const p = path.join(powerDir, f)
    try {
      const arr = JSON.parse(fs.readFileSync(p, 'utf-8'))
      for (const it of arr) {
        const h = it.hour
        const w = it.weekday
        if (typeof h !== 'number' || h < 0 || h > 23) continue
        if (typeof w !== 'number') continue
        const pKW = Number(it.power) || 0
        const pMW = (pKW / 1000) * 10
        const bucket = w >= 5 ? 'weekend' : 'weekday'
        sum[bucket][h] += pMW
        cnt[bucket][h] += 1
      }
    } catch {}
  }
  const avg = { weekday: [], weekend: [] }
  for (let h = 0; h < 24; h++) {
    avg.weekday[h] = cnt.weekday[h] > 0 ? sum.weekday[h] / cnt.weekday[h] : 0
    avg.weekend[h] = cnt.weekend[h] > 0 ? sum.weekend[h] / cnt.weekend[h] : 0
  }
  fs.writeFileSync(outFile, JSON.stringify(avg, null, 2), 'utf-8')
  console.log('written stats to', outFile)
}

main()

