import { combinations } from './util.js'
import {
  BLANK,
  MINE,
  HIDDEN,
  VISIBLE,
  UNKNOWN,
  ADJACENT,
  FLAG
} from './symbols.js'

export function getProbability(board, x, y) {
  return getProbabilityList(board)[x][y]
}

export function solve(board) {
  const list = getProbabilityList(board)
  let marked = 0
  let min = 1
  let square
  for (let x = 0; x < board.width; x++) {
    for (let y = 0; y < board.height; y++) {
      if (list[x][y] === VISIBLE) continue
      if (list[x][y] === 1 && board.flags[x][y] !== FLAG)
        marked = board.mark(x, y)
      else if (list[x][y] < min) {
        min = list[x][y]
        square = { x, y }
      }
    }
  }

  board.reveal(square.x, square.y)
  return marked
}

function getProbabilityList(board) {
  const { width, height } = board
  let solutionList = [[]]

  // blank base solution
  for (let x = 0; x < width; x++) {
    const row = []
    solutionList[0].push(row)
    for (let y = 0; y < height; y++) row.push(UNKNOWN)
  }

  // calculate all possible mine positions
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const n = board.get(x, y)
      if (n === HIDDEN || n === BLANK) continue // only fork for squares adjacent to mines

      // find possible mine locations
      const adjacent = board
        .getAdjacent(x, y)
        .filter(({ x, y }) => board.get(x, y) === HIDDEN)

      if (!adjacent.length) continue

      const _solutionList = []
      for (const solution of solutionList) {
        for (const { x, y } of adjacent)
          if (solution[x][y] !== MINE) solution[x][y] = ADJACENT

        // place n mines in all possible permutations
        _solutionList.push(
          ...combinations(n, adjacent)
            .map(o => {
              const forked = JSON.parse(JSON.stringify(solution))
              for (const { x, y } of o) forked[x][y] = MINE
              return forked
            })
            .filter(validate) // remove illegal solutions
        )
      }

      solutionList = _solutionList
    }
  }

  for (const solution of solutionList) {
    let mines = board.mines
    let squares = 0
    for (let x = 0; x < width; x++)
      for (let y = 0; y < height; y++)
        if (solution[x][y] === MINE) mines--
        else if (solution[x][y] !== ADJACENT) squares++

    solution.base = mines / squares
  }

  const probabilityList = []
  for (let x = 0; x < width; x++) {
    const row = []
    for (let y = 0; y < height; y++) {
      const n = board.get(x, y)
      if (n !== HIDDEN) {
        row.push(VISIBLE)
      } else if (solutionList[0][x][y] === UNKNOWN) {
        let total = 0
        for (const solution of solutionList) total += solution.base
        row.push(total / solutionList.length)
      } else {
        let weight = 0
        for (const solution of solutionList)
          if (solution[x][y] === MINE) weight++

        row.push(weight / solutionList.length)
      }
    }
    probabilityList.push(row)
  }

  function validate(solution) {
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        // only check squares adjacent to mines
        let n = board.get(x, y)
        if (n === HIDDEN || n === BLANK) continue

        // count mines
        for (const { x: _x, y: _y } of board.getAdjacent(x, y))
          if (solution[_x][_y] === MINE) n--

        // too many mines
        if (n < 0) return false
      }
    }

    return true
  }

  return probabilityList
}
