import { combinations } from './util.js'
import {
  BLANK,
  MINE,
  HIDDEN,
  VISIBLE,
  UNKNOWN,
  SAFE,
  FLAG
} from './symbols.js'

export function getProbability(board, i) {
  return getProbabilityList(board)[i]
}

export function solve(board) {
  const list = getProbabilityList(board)
  let marked = 0
  let min = 1
  let square
  for (let i = 0; i < board.size; i++) {
    if (list[i] === VISIBLE) continue
    if (list[i] === 1 && board.flags[i] !== FLAG) marked = board.mark(i)
    else if (list[i] < min) {
      min = list[i]
      square = i
    }
  }

  board.reveal(square)
  return marked
}

function getProbabilityList(board) {
  const { size } = board

  // blank base solution
  let solutionList = [Array(size).fill(UNKNOWN)]
  solutionList[0].mines = board.mines // remaining mines to place
  let squares = board.size // number of possible mine locations

  // calculate all possible mine positions
  for (let i = 0; i < size; i++) {
    const n = board.get(i)
    if (n === HIDDEN || n === BLANK) {
      squares--
      continue // only fork for squares adjacent to mines
    }

    // find possible mine locations
    const adjacent = board.getAdjacent(i).filter(i => board.get(i) === HIDDEN)

    if (!adjacent.length) continue

    const _solutionList = []
    let _squares
    for (const solution of solutionList) {
      _squares = squares
      l: for (const o of combinations(n, adjacent)) {
        const forked = JSON.parse(JSON.stringify(solution))
        forked.mines = solution.mines

        for (const i of o) {
          if (forked[i] == SAFE) continue l
          forked[i] = MINE
          forked.mines--
          squares--
        }

        for (const i of adjacent) {
          if (o.includes(i)) continue
          if (forked[i] === MINE) continue l

          forked[i] = SAFE
          squares--
        }

        _solutionList.push(forked)
      }
    }

    solutionList = _solutionList
    squares = _squares
  }

  // fold list of solutions into probabilities
  const probabilityList = []
  for (let i = 0; i < size; i++) {
    const n = board.get(i)
    if (n !== HIDDEN) {
      probabilityList.push(VISIBLE)
    } else if (solutionList[0][i] === UNKNOWN) {
      let total = 0
      for (const solution of solutionList)
        total += solution.mines / squares

      probabilityList.push(total / solutionList.length)
    } else {
      let weight = 0
      for (const solution of solutionList) if (solution[i] === MINE) weight++

      probabilityList.push(weight / solutionList.length)
    }
  }

  return probabilityList
}
