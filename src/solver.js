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

  // calculate all possible mine positions
  for (let i = 0; i < size; i++) {
    const n = board.get(i)
    if (n === HIDDEN || n === BLANK) continue // only fork for squares adjacent to mines

    // find possible mine locations
    const adjacent = board.getAdjacent(i).filter(i => board.get(i) === HIDDEN)

    if (!adjacent.length) continue

    const _solutionList = []
    for (const solution of solutionList) {
      for (const i of adjacent) if (solution[i] !== MINE) solution[i] = ADJACENT

      // place n mines in all possible permutations
      _solutionList.push(
        ...combinations(n, adjacent)
          .map(o => {
            const forked = JSON.parse(JSON.stringify(solution))
            for (const i of o) forked[i] = MINE
            return forked
          })
          .filter(validate) // remove illegal solutions
      )
    }

    solutionList = _solutionList
  }

  for (const solution of solutionList) {
    let mines = board.mines
    let squares = 0
    for (let i = 0; i < size; i++)
      if (solution[i] === MINE) mines--
      else if (solution[i] !== ADJACENT) squares++

    solution.base = mines / squares
  }

  const probabilityList = []
  for (let i = 0; i < size; i++) {
    const n = board.get(i)
    if (n !== HIDDEN) {
      probabilityList.push(VISIBLE)
    } else if (solutionList[0][i] === UNKNOWN) {
      let total = 0
      for (const solution of solutionList) total += solution.base
      probabilityList.push(total / solutionList.length)
    } else {
      let weight = 0
      for (const solution of solutionList) if (solution[i] === MINE) weight++

      probabilityList.push(weight / solutionList.length)
    }
  }

  function validate(solution) {
    for (let i = 0; i < size; i++) {
      // only check squares adjacent to mines
      let n = board.get(i)
      if (n === HIDDEN || n === BLANK) continue

      // count mines
      for (const a of board.getAdjacent(i)) if (solution[a] === MINE) n--

      // too many mines
      if (n < 0) return false
    }

    return true
  }

  return probabilityList
}
