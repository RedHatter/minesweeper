export function range(start, stop, step) {
  if (stop == null) {
    stop = start || 0
    start = 0
  }

  if (!step) {
    step = stop < start ? -1 : 1
  }

  var length = Math.max(Math.ceil((stop - start) / step), 0)
  var range = Array(length)

  for (var idx = 0; idx < length; idx++, start += step) {
    range[idx] = start
  }

  return range
}

export function combinations(n, arr, prefix = []) {
  if (prefix.length == n) return [prefix]
  return arr.flatMap((_, i, arr) =>
    combinations(n, arr.slice(i + 1), prefix.concat(arr[i]))
  )
}
