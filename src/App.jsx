import { useState, useEffect, useRef } from 'react'
import './App.css'

const TILE_COLORS = {
  2: '#4caf50', 3: '#2196f3', 4: '#f44336', 5: '#9c27b0',
  6: '#ff5722', 8: '#ffc107', 9: '#00bcd4', 10: '#e91e63',
  12: '#ff7043', 15: '#673ab7', 16: '#3f51b5', 18: '#607d8b',
  20: '#795548', 32: '#b71c1c', 35: '#e91e63',
}

function randomTile(level) {
  const pool = level <= 2
    ? [2, 3, 4, 5, 6, 8, 9, 10, 12]
    : [2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 18, 20]
  return pool[Math.floor(Math.random() * pool.length)]
}

function canMerge(a, b) {
  if (a === null || b === null) return false
  if (a === b) return true
  const big = Math.max(a, b)
  const small = Math.min(a, b)
  return big % small === 0 && big / small !== 1
}

function getNeighbors(r, c) {
  const n = []
  if (r > 0) n.push([r - 1, c])
  if (r < 3) n.push([r + 1, c])
  if (c > 0) n.push([r, c - 1])
  if (c < 3) n.push([r, c + 1])
  return n
}

function App() {
  const emptyGrid = () => Array(4).fill(null).map(() => Array(4).fill(null))

  const [grid, setGrid] = useState(emptyGrid)
  const [queue, setQueue] = useState(() => [randomTile(1), randomTile(1), randomTile(1)])
  const [keep, setKeep] = useState(null)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => parseInt(localStorage.getItem('jdBest') || '0'))
  const [level, setLevel] = useState(1)
  const [trash, setTrash] = useState(3)
  const [over, setOver] = useState(false)
  const [timer, setTimer] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!over) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [over])

  useEffect(() => {
    localStorage.setItem('jdBest', best.toString())
  }, [best])

  useEffect(() => {
    const newLevel = Math.floor(score / 10) + 1
    if (newLevel > level) {
      setLevel(newLevel)
      setTrash(t => t + 2)
    }
  }, [score, level])

  const activeTile = queue[0]

  function resolveMerges(g) {
    const newGrid = g.map(row => [...row])
    let merged = true
    let points = 0

    while (merged) {
      merged = false
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (newGrid[r][c] === null) continue
          for (const [nr, nc] of getNeighbors(r, c)) {
            if (newGrid[nr][nc] === null) continue
            if (!canMerge(newGrid[r][c], newGrid[nr][nc])) continue

            const a = newGrid[r][c]
            const b = newGrid[nr][nc]

            if (a === b) {
              newGrid[r][c] = null
              newGrid[nr][nc] = null
              points += 2
            } else {
              const big = Math.max(a, b)
              const small = Math.min(a, b)
              const result = big / small
              if (a >= b) {
                newGrid[r][c] = result
                newGrid[nr][nc] = null
              } else {
                newGrid[nr][nc] = result
                newGrid[r][c] = null
              }
              points += 1
            }
            merged = true
            break
          }
          if (merged) break
        }
        if (merged) break
      }
    }

    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        if (newGrid[r][c] === 1) { newGrid[r][c] = null; points++ }

    return { grid: newGrid, points }
  }

  function isGameOver(g) {
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        if (g[r][c] === null) return false

    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        for (const [nr, nc] of getNeighbors(r, c))
          if (canMerge(g[r][c], g[nr][nc])) return false

    return true
  }

  function placeTile(r, c) {
    if (over || grid[r][c] !== null) return

    const newGrid = grid.map(row => [...row])
    newGrid[r][c] = activeTile

    const result = resolveMerges(newGrid)
    const newScore = score + result.points

    setGrid(result.grid)
    setScore(newScore)
    if (newScore > best) setBest(newScore)
    setQueue([...queue.slice(1), randomTile(level)])

    if (isGameOver(result.grid)) setOver(true)
  }

  function handleKeep() {
    if (over) return
    if (keep === null) {
      setKeep(activeTile)
      setQueue([...queue.slice(1), randomTile(level)])
    } else {
      const old = keep
      setKeep(activeTile)
      setQueue([old, ...queue.slice(1)])
    }
  }

  function handleTrash() {
    if (over || trash <= 0) return
    setTrash(trash - 1)
    setQueue([...queue.slice(1), randomTile(level)])
  }

  function restart() {
    setGrid(emptyGrid())
    setQueue([randomTile(1), randomTile(1), randomTile(1)])
    setKeep(null)
    setScore(0)
    setLevel(1)
    setTrash(3)
    setOver(false)
    setTimer(0)
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'r' || e.key === 'R') restart()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const mins = String(Math.floor(timer / 60)).padStart(2, '0')
  const secs = String(timer % 60).padStart(2, '0')

  return (
    <div className="app">
      <h1 className="title">JUST DIVIDE</h1>
      <p className="timer">⏳ {mins}:{secs}</p>
      <p className="subtitle">Divide the numbers to solve rows and columns</p>

      <div className="badges">
        <span className="badge level">LEVEL {level}</span>
        <span className="badge sc">SCORE {score}</span>
      </div>

      <div className="game-area">
        <div className="grid">
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={`cell ${cell === null ? 'empty' : ''}`}
                onClick={() => placeTile(r, c)}
              >
                {cell !== null && (
                  <div className="tile" style={{ background: TILE_COLORS[cell] || '#607d8b' }}>
                    {cell}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="panel">
          <div className="keep-box" onClick={handleKeep}>
            {keep !== null ? (
              <div className="tile small" style={{ background: TILE_COLORS[keep] || '#607d8b' }}>{keep}</div>
            ) : '—'}
          </div>
          <span className="label">KEEP</span>

          <div className="queue">
            {queue.map((val, i) => (
              <div key={i} className={`tile ${i === 0 ? 'active-tile' : 'small'}`}
                style={{ background: TILE_COLORS[val] || '#607d8b' }}>
                {val}
              </div>
            ))}
          </div>
          <span className="label">NEXT</span>

          <button className="trash-btn" onClick={handleTrash} disabled={trash <= 0}>
            🗑️
          </button>
          <span className="label">TRASH ×{trash}</span>

          <button className="restart-btn" onClick={restart}>🔄 Restart</button>
        </div>
      </div>

      <p className="best">🏆 Best: {best}</p>

      {over && (
        <div className="overlay">
          <div className="modal">
            <h2>Game Over!</h2>
            <p>Score: {score}</p>
            <p>Best: {best}</p>
            {score >= best && score > 0 && <p className="new-best">🎉 New Best!</p>}
            <button onClick={restart}>Play Again</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
