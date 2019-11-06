import {
  BLANK,
  MINE,
  HIDDEN,
  VISIBLE,
  UNKNOWN,
  FLAG,
  LOST
} from './symbols.js'

export function createBoard(width, height, mines, onWin, onLose) {
  const size = width * height

  function getAdjacent(i) {
    const res = []
    const x = i % width

    // Top left
    let n = i - width - 1

    // First row
    if (i >= width) {
      if (x > 0) res.push(n)
      res.push(n + 1)
      if (x < width - 1) res.push(n + 2)
    }

    // Second row
    n += width
    if (x > 0) res.push(n)
    if (x < width - 1) res.push(n + 2)

    // Third row
    n += width

    if (i < width * (height - 1)) {
      if (x > 0) res.push(n)
      res.push(n + 1)
      if (x < width - 1) res.push(n + 2)
    }

    return res
  }

  let revealed = 0
  function reveal(i) {
    mask[i] = VISIBLE
    switch (board[i]) {
      case BLANK:
        for (const n of getAdjacent(i)) if (mask[n] === HIDDEN) reveal(n)
        break

      case MINE:
        mask.fill(VISIBLE)
        board[i] = LOST
        onLose()
        break
    }

    revealed++
    if (revealed >= size - mines) onWin()

    return board[i]
  }

  let marked = 0
  function mark(i) {
    switch (flags[i]) {
      case BLANK:
        flags[i] = FLAG
        marked++
        break

      case FLAG:
        flags[i] = UNKNOWN
        marked--
        break

      case UNKNOWN:
        flags[i] = BLANK
        break
    }

    return marked
  }

  const board = Array(size).fill(BLANK)
  const flags = Array(size).fill(BLANK)
  const mask = Array(size).fill(HIDDEN)

  // place mines
  for (let i = 0; i < mines; i++) {
    const square = Math.floor(Math.random() * size)
    if (board[square] === MINE) {
      i-- // try again
      continue
    }

    board[square] = MINE
    for (const n of getAdjacent(square)) {
      if (board[n] === MINE) continue
      else if (board[n] === BLANK) board[n] = 1
      else board[n]++
    }
  }

  return {
    size,
    mines,
    flags,
    reveal,
    mark,
    getAdjacent,
    get(i) {
      return mask[i] === HIDDEN ? HIDDEN : board[i]
    }
  }
}
