const fs = require('fs')
const path = require('path')

const powerDir = path.join(__dirname, '..', 'public', 'power')
const outDir = path.join(__dirname, '..', 'public', 'stats', 'grid_avg')

function listJsonFiles(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function main() {
  if (!fs.existsSync(powerDir)) {
    console.error('power dir missing:', powerDir)
    process.exit(1)
  }
  ensureDir(outDir)
  const files = listJsonFiles(powerDir)

  // Prepare accumulators per (w,h): Map gridKey -> avgMW10
  const sumKW = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ })))
  const cnt = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ })))

  for (const f of files) {
    const gridKey = f.replace(/\.json$/, '')
    const p = path.join(powerDir, f)
    try {
      const arr = JSON.parse(fs.readFileSync(p, 'utf-8'))
      for (const it of arr) {
        const h = it.hour
        const w = it.weekday
        if (typeof h !== 'number' || h < 0 || h > 23) continue
        if (typeof w !== 'number' || w < 0 || w > 6) continue
        const pKW = Number(it.power) || 0
        sumKW[w][h][gridKey] = (sumKW[w][h][gridKey] || 0) + pKW
        cnt[w][h][gridKey] = (cnt[w][h][gridKey] || 0) + 1
      }
    } catch (e) {
      // skip bad file
    }
  }

  // Write per-file stats: w_{w}_h_{h}.json => {"gridKey": avgMW10}
  for (let w = 0; w < 7; w++) {
    for (let h = 0; h < 24; h++) {
      const avgForWH = {}
      const sumObj = sumKW[w][h]
      const cntObj = cnt[w][h]
      for (const key of Object.keys(sumObj)) {
        const c = cntObj[key] || 0
        const avgKW = c > 0 ? sumObj[key] / c : 0
        const avgMW10 = (avgKW / 1000) * 10
        avgForWH[key] = avgMW10
      }
      const outFile = path.join(outDir, `w_${w}_h_${h}.json`)
      fs.writeFileSync(outFile, JSON.stringify(avgForWH), 'utf-8')
    }
  }
  console.log('written split grid hourly avg files to', outDir)
}

main()

