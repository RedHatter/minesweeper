import {
  BLANK,
  MINE,
  HIDDEN,
  VISIBLE,
  UNKNOWN,
  ADJACENT,
  FLAG
} from './symbols.js'

export function createBoard(width, height, mines, onWin, onLose) {
  function getAdjacent(x, y) {
    const res = []

    if (y > 0) res.push({ x: x, y: y - 1 })
    if (x < width - 1) {
      if (y > 0) res.push({ x: x + 1, y: y - 1 })
      res.push({ x: x + 1, y: y })
      if (y < height - 1) res.push({ x: x + 1, y: y + 1 })
    }
    if (y < height - 1) res.push({ x: x, y: y + 1 })
    if (x > 0) {
      if (y > 0) res.push({ x: x - 1, y: y - 1 })
      res.push({ x: x - 1, y: y })
      if (y < height - 1) res.push({ x: x - 1, y: y + 1 })
    }

    return res
  }

  let revealed = 0
  function reveal(x, y) {
    mask[x][y] = VISIBLE
    switch (board[x][y]) {
      case BLANK:
        for (const { x: _x, y: _y } of getAdjacent(x, y))
          if (mask[_x][_y] === HIDDEN) reveal(_x, _y)

        break

      case MINE:
        for (let x = 0; x < width; x++)
          for (let y = 0; y < height; y++) mask[x][y] = VISIBLE
        onLose()
        break
    }

    revealed++
    if (revealed >= width * height - mines) onWin()

    return board[x][y]
  }

  let marked = 0
  function mark(x, y) {
    switch (flags[x][y]) {
      case BLANK:
        flags[x][y] = FLAG
        marked++
        break

      case FLAG:
        flags[x][y] = UNKNOWN
        marked--
        break

      case UNKNOWN:
        flags[x][y] = BLANK
        break
    }

    return marked
  }

  const board = []
  const mask = []
  const flags = []

  // populate blank board
  for (let x = 0; x < width; x++) {
    const row = []
    const maskRow = []
    const flagRow = []
    board.push(row)
    mask.push(maskRow)
    flags.push(flagRow)
    for (let y = 0; y < height; y++) {
      row.push(BLANK)
      maskRow.push(HIDDEN)
      flagRow.push(BLANK)
    }
  }

  // place mines
  for (let i = 0; i < mines; i++) {
    const row = Math.floor(Math.random() * width)
    const col = Math.floor(Math.random() * height)
    if (board[row][col] === MINE) {
      i-- // try again
      continue
    }

    board[row][col] = MINE
  }

  // calculate adjacent mines
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (board[x][y] === MINE) continue
      const c = getAdjacent(x, y).filter(({ x, y }) => board[x][y] === MINE)
        .length
      if (c > 0) board[x][y] = c
    }
  }

  return {
    width,
    height,
    mines,
    flags,
    reveal,
    mark,
    getAdjacent,
    get(x, y) {
      return mask[x][y] === HIDDEN ? HIDDEN : board[x][y]
    }
  }
}
