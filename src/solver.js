import { combinations, range } from './util.js'
import { BLANK, MINE, HIDDEN, VISIBLE, UNKNOWN, SAFE, FLAG } from './symbols.js'

export function getProbability(board, i) {
  let solutionList = [Array(board.size).fill(UNKNOWN)]
  solutionList = updateSolutionList(board, range(board.size), solutionList)
  const list = getProbabilityList(solutionList, board)
  return list[i]
}

export function solve(board) {
  const { size } = board

  // blank base solution
  let solutionList = [Array(size).fill(UNKNOWN)]

  return {
    tick() {
      const list = getProbabilityList(solutionList, board)
      let min = 1
      let square
      for (let i = 0; i < size; i++) {
        if (list[i] === VISIBLE) continue
        if (list[i] === 1 && board.flags[i] !== FLAG) board.mark(i)
        else if (list[i] < min) {
          min = list[i]
          square = i
        }
      }

      solutionList = updateSolutionList(
        board,
        board.reveal(square),
        solutionList
      )
    }
  }
}

function getProbabilityList(solutionList, board) {
  let squares = 0
  let mines = board.mines
  for (let i = 0; i < board.size; i++) {
    if (solutionList[0][i] === MINE) mines--
    if (solutionList[0][i] === UNKNOWN && board.get(i) === HIDDEN) squares++
  }

  const base = mines / squares

  // fold list of solutions into probabilities
  const probabilityList = []
  for (let i = 0; i < board.size; i++) {
    const n = board.get(i)
    if (n !== HIDDEN) {
      probabilityList.push(VISIBLE)
    } else if (solutionList[0][i] === UNKNOWN) {
      probabilityList.push(base)
    } else {
      let weight = 0
      for (const solution of solutionList) if (solution[i] === MINE) weight++

      probabilityList.push(weight / solutionList.length)
    }
  }

  return probabilityList
}

function updateSolutionList(board, delta, solutionList) {
  for (const i of delta) {
    const n = board.get(i)
    if (n === HIDDEN || n === BLANK) {
      continue // only fork for squares adjacent to mines
    }

    // find possible mine locations
    const adjacent = board.getAdjacent(i).filter(i => board.get(i) === HIDDEN)

    if (!adjacent.length) continue
    const mineList = combinations(n, adjacent)

    const _solutionList = []
    for (const solution of solutionList) {
      l: for (const o of mineList) {
        const forked = solution.slice()

        for (const i of o) {
          if (forked[i] == SAFE) continue l
          forked[i] = MINE
        }

        for (const i of adjacent) {
          if (o.includes(i)) continue
          if (forked[i] === MINE) continue l

          forked[i] = SAFE
        }

        _solutionList.push(forked)
      }
    }

    solutionList = _solutionList
  }

  return solutionList
}
