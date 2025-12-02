const fs = require('fs')
const path = require('path')

const powerDir = path.join(__dirname, '..', 'public', 'power')
const outDir = path.join(__dirname, '..', 'public', 'stats')
const outFile = path.join(outDir, 'grid_hourly_avg.json')

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
  const result = {}

  for (const f of files) {
    const key = f.replace(/\.json$/, '')
    const p = path.join(powerDir, f)
    try {
      const arr = JSON.parse(fs.readFileSync(p, 'utf-8'))
      const sumKW = Array.from({ length: 7 }, () => Array(24).fill(0))
      const cnt = Array.from({ length: 7 }, () => Array(24).fill(0))
      for (const it of arr) {
        const h = it.hour
        const w = it.weekday
        if (typeof h !== 'number' || h < 0 || h > 23) continue
        if (typeof w !== 'number' || w < 0 || w > 6) continue
        const pKW = Number(it.power) || 0
        sumKW[w][h] += pKW
        cnt[w][h] += 1
      }
      // 平均到 MW 并扩样10倍
      const avgMW10 = Array.from({ length: 7 }, () => Array(24).fill(0))
      for (let w = 0; w < 7; w++) {
        for (let h = 0; h < 24; h++) {
          const avgKW = cnt[w][h] > 0 ? sumKW[w][h] / cnt[w][h] : 0
          avgMW10[w][h] = (avgKW / 1000) * 10
        }
      }
      result[key] = avgMW10
    } catch (e) {
      // skip
    }
  }

  fs.writeFileSync(outFile, JSON.stringify(result), 'utf-8')
  console.log('written grid hourly avg to', outFile)
}

main()

