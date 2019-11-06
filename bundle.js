;(function() {
  'use strict'

  function noop() {}
  function assign(tar, src) {
    // @ts-ignore
    for (const k in src) tar[k] = src[k]
    return tar
  }
  function add_location(element, file, line, column, char) {
    element.__svelte_meta = {
      loc: { file, line, column, char }
    }
  }
  function run(fn) {
    return fn()
  }
  function blank_object() {
    return Object.create(null)
  }
  function run_all(fns) {
    fns.forEach(run)
  }
  function is_function(thing) {
    return typeof thing === 'function'
  }
  function safe_not_equal(a, b) {
    return a != a
      ? b == b
      : a !== b || ((a && typeof a === 'object') || typeof a === 'function')
  }
  function create_slot(definition, ctx, fn) {
    if (definition) {
      const slot_ctx = get_slot_context(definition, ctx, fn)
      return definition[0](slot_ctx)
    }
  }
  function get_slot_context(definition, ctx, fn) {
    return definition[1]
      ? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
      : ctx.$$scope.ctx
  }
  function get_slot_changes(definition, ctx, changed, fn) {
    return definition[1]
      ? assign(
          {},
          assign(
            ctx.$$scope.changed || {},
            definition[1](fn ? fn(changed) : {})
          )
        )
      : ctx.$$scope.changed || {}
  }
  function null_to_empty(value) {
    return value == null ? '' : value
  }

  function append(target, node) {
    target.appendChild(node)
  }
  function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null)
  }
  function detach(node) {
    node.parentNode.removeChild(node)
  }
  function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
      if (iterations[i]) iterations[i].d(detaching)
    }
  }
  function element(name) {
    return document.createElement(name)
  }
  function text(data) {
    return document.createTextNode(data)
  }
  function space() {
    return text(' ')
  }
  function empty() {
    return text('')
  }
  function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options)
    return () => node.removeEventListener(event, handler, options)
  }
  function attr(node, attribute, value) {
    if (value == null) node.removeAttribute(attribute)
    else node.setAttribute(attribute, value)
  }
  function to_number(value) {
    return value === '' ? undefined : +value
  }
  function children(element) {
    return Array.from(element.childNodes)
  }
  function set_input_value(input, value) {
    if (value != null || input.value) {
      input.value = value
    }
  }
  function custom_event(type, detail) {
    const e = document.createEvent('CustomEvent')
    e.initCustomEvent(type, false, false, detail)
    return e
  }

  let current_component
  function set_current_component(component) {
    current_component = component
  }
  // TODO figure out if we still want to support
  // shorthand events, or if we want to implement
  // a real bubbling mechanism
  function bubble(component, event) {
    const callbacks = component.$$.callbacks[event.type]
    if (callbacks) {
      callbacks.slice().forEach(fn => fn(event))
    }
  }

  const dirty_components = []
  const binding_callbacks = []
  const render_callbacks = []
  const flush_callbacks = []
  const resolved_promise = Promise.resolve()
  let update_scheduled = false
  function schedule_update() {
    if (!update_scheduled) {
      update_scheduled = true
      resolved_promise.then(flush)
    }
  }
  function add_render_callback(fn) {
    render_callbacks.push(fn)
  }
  function add_flush_callback(fn) {
    flush_callbacks.push(fn)
  }
  function flush() {
    const seen_callbacks = new Set()
    do {
      // first, call beforeUpdate functions
      // and update components
      while (dirty_components.length) {
        const component = dirty_components.shift()
        set_current_component(component)
        update(component.$$)
      }
      while (binding_callbacks.length) binding_callbacks.pop()()
      // then, once components are updated, call
      // afterUpdate functions. This may cause
      // subsequent updates...
      for (let i = 0; i < render_callbacks.length; i += 1) {
        const callback = render_callbacks[i]
        if (!seen_callbacks.has(callback)) {
          callback()
          // ...so guard against infinite loops
          seen_callbacks.add(callback)
        }
      }
      render_callbacks.length = 0
    } while (dirty_components.length)
    while (flush_callbacks.length) {
      flush_callbacks.pop()()
    }
    update_scheduled = false
  }
  function update($$) {
    if ($$.fragment) {
      $$.update($$.dirty)
      run_all($$.before_update)
      $$.fragment.p($$.dirty, $$.ctx)
      $$.dirty = null
      $$.after_update.forEach(add_render_callback)
    }
  }
  const outroing = new Set()
  let outros
  function group_outros() {
    outros = {
      r: 0,
      c: [],
      p: outros // parent group
    }
  }
  function check_outros() {
    if (!outros.r) {
      run_all(outros.c)
    }
    outros = outros.p
  }
  function transition_in(block, local) {
    if (block && block.i) {
      outroing.delete(block)
      block.i(local)
    }
  }
  function transition_out(block, local, detach, callback) {
    if (block && block.o) {
      if (outroing.has(block)) return
      outroing.add(block)
      outros.c.push(() => {
        outroing.delete(block)
        if (callback) {
          if (detach) block.d(1)
          callback()
        }
      })
      block.o(local)
    }
  }

  function bind(component, name, callback) {
    if (component.$$.props.indexOf(name) === -1) return
    component.$$.bound[name] = callback
    callback(component.$$.ctx[name])
  }
  function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$
    fragment.m(target, anchor)
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
      const new_on_destroy = on_mount.map(run).filter(is_function)
      if (on_destroy) {
        on_destroy.push(...new_on_destroy)
      } else {
        // Edge case - component was destroyed immediately,
        // most likely as a result of a binding initialising
        run_all(new_on_destroy)
      }
      component.$$.on_mount = []
    })
    after_update.forEach(add_render_callback)
  }
  function destroy_component(component, detaching) {
    if (component.$$.fragment) {
      run_all(component.$$.on_destroy)
      component.$$.fragment.d(detaching)
      // TODO null out other refs, including component.$$ (but need to
      // preserve final state?)
      component.$$.on_destroy = component.$$.fragment = null
      component.$$.ctx = {}
    }
  }
  function make_dirty(component, key) {
    if (!component.$$.dirty) {
      dirty_components.push(component)
      schedule_update()
      component.$$.dirty = blank_object()
    }
    component.$$.dirty[key] = true
  }
  function init(
    component,
    options,
    instance,
    create_fragment,
    not_equal,
    prop_names
  ) {
    const parent_component = current_component
    set_current_component(component)
    const props = options.props || {}
    const $$ = (component.$$ = {
      fragment: null,
      ctx: null,
      // state
      props: prop_names,
      update: noop,
      not_equal,
      bound: blank_object(),
      // lifecycle
      on_mount: [],
      on_destroy: [],
      before_update: [],
      after_update: [],
      context: new Map(parent_component ? parent_component.$$.context : []),
      // everything else
      callbacks: blank_object(),
      dirty: null
    })
    let ready = false
    $$.ctx = instance
      ? instance(component, props, (key, ret, value = ret) => {
          if ($$.ctx && not_equal($$.ctx[key], ($$.ctx[key] = value))) {
            if ($$.bound[key]) $$.bound[key](value)
            if (ready) make_dirty(component, key)
          }
          return ret
        })
      : props
    $$.update()
    ready = true
    run_all($$.before_update)
    $$.fragment = create_fragment($$.ctx)
    if (options.target) {
      if (options.hydrate) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        $$.fragment.l(children(options.target))
      } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        $$.fragment.c()
      }
      if (options.intro) transition_in(component.$$.fragment)
      mount_component(component, options.target, options.anchor)
      flush()
    }
    set_current_component(parent_component)
  }
  class SvelteComponent {
    $destroy() {
      destroy_component(this, 1)
      this.$destroy = noop
    }
    $on(type, callback) {
      const callbacks =
        this.$$.callbacks[type] || (this.$$.callbacks[type] = [])
      callbacks.push(callback)
      return () => {
        const index = callbacks.indexOf(callback)
        if (index !== -1) callbacks.splice(index, 1)
      }
    }
    $set() {
      // overridden by instance, if it has props
    }
  }

  function dispatch_dev(type, detail) {
    document.dispatchEvent(custom_event(type, detail))
  }
  function append_dev(target, node) {
    dispatch_dev('SvelteDOMInsert', { target, node })
    append(target, node)
  }
  function insert_dev(target, node, anchor) {
    dispatch_dev('SvelteDOMInsert', { target, node, anchor })
    insert(target, node, anchor)
  }
  function detach_dev(node) {
    dispatch_dev('SvelteDOMRemove', { node })
    detach(node)
  }
  function listen_dev(
    node,
    event,
    handler,
    options,
    has_prevent_default,
    has_stop_propagation
  ) {
    const modifiers =
      options === true
        ? ['capture']
        : options
        ? Array.from(Object.keys(options))
        : []
    if (has_prevent_default) modifiers.push('preventDefault')
    if (has_stop_propagation) modifiers.push('stopPropagation')
    dispatch_dev('SvelteDOMAddEventListener', {
      node,
      event,
      handler,
      modifiers
    })
    const dispose = listen(node, event, handler, options)
    return () => {
      dispatch_dev('SvelteDOMRemoveEventListener', {
        node,
        event,
        handler,
        modifiers
      })
      dispose()
    }
  }
  function attr_dev(node, attribute, value) {
    attr(node, attribute, value)
    if (value == null)
      dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute })
    else dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value })
  }
  function prop_dev(node, property, value) {
    node[property] = value
    dispatch_dev('SvelteDOMSetProperty', { node, property, value })
  }
  function set_data_dev(text, data) {
    data = '' + data
    if (text.data === data) return
    dispatch_dev('SvelteDOMSetData', { node: text, data })
    text.data = data
  }
  class SvelteComponentDev extends SvelteComponent {
    constructor(options) {
      if (!options || (!options.target && !options.$$inline)) {
        throw new Error(`'target' is a required option`)
      }
      super()
    }
    $destroy() {
      super.$destroy()
      this.$destroy = () => {
        console.warn(`Component was already destroyed`) // eslint-disable-line no-console
      }
    }
  }

  var Prando = /** @class */ (function() {
    // ================================================================================================================
    // CONSTRUCTOR ----------------------------------------------------------------------------------------------------
    /**
     * Generate a new Prando pseudo-random number generator.
     *
     * @param seed - A number or string seed that determines which pseudo-random number sequence will be created. Defaults to current time.
     */
    function Prando(seed) {
      this._value = NaN
      if (typeof seed === 'string') {
        // String seed
        this._seed = this.hashCode(seed)
      } else if (typeof seed === 'number') {
        // Numeric seed
        this._seed = this.getSafeSeed(seed)
      } else {
        // Pseudo-random seed
        this._seed = this.getSafeSeed(
          Prando.MIN + Math.floor((Prando.MAX - Prando.MIN) * Math.random())
        )
      }
      this.reset()
    }
    // ================================================================================================================
    // PUBLIC INTERFACE -----------------------------------------------------------------------------------------------
    /**
     * Generates a pseudo-random number between a lower (inclusive) and a higher (exclusive) bounds.
     *
     * @param min - The minimum number that can be randomly generated.
     * @param pseudoMax - The maximum number that can be randomly generated (exclusive).
     * @return The generated pseudo-random number.
     */
    Prando.prototype.next = function(min, pseudoMax) {
      if (min === void 0) {
        min = 0
      }
      if (pseudoMax === void 0) {
        pseudoMax = 1
      }
      this.recalculate()
      return this.map(this._value, Prando.MIN, Prando.MAX, min, pseudoMax)
    }
    /**
     * Generates a pseudo-random integer number in a range (inclusive).
     *
     * @param min - The minimum number that can be randomly generated.
     * @param max - The maximum number that can be randomly generated.
     * @return The generated pseudo-random number.
     */
    Prando.prototype.nextInt = function(min, max) {
      if (min === void 0) {
        min = 10
      }
      if (max === void 0) {
        max = 100
      }
      this.recalculate()
      return Math.floor(
        this.map(this._value, Prando.MIN, Prando.MAX, min, max + 1)
      )
    }
    /**
     * Generates a pseudo-random string sequence of a particular length from a specific character range.
     *
     * Note: keep in mind that creating a random string sequence does not guarantee uniqueness; there is always a
     * 1 in (char_length^string_length) chance of collision. For real unique string ids, always check for
     * pre-existing ids, or employ a robust GUID/UUID generator.
     *
     * @param length - Length of the strting to be generated.
     * @param chars - Characters that are used when creating the random string. Defaults to all alphanumeric chars (A-Z, a-z, 0-9).
     * @return The generated string sequence.
     */
    Prando.prototype.nextString = function(length, chars) {
      if (length === void 0) {
        length = 16
      }
      if (chars === void 0) {
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      }
      var str = ''
      while (str.length < length) {
        str += this.nextChar(chars)
      }
      return str
    }
    /**
     * Generates a pseudo-random string of 1 character specific character range.
     *
     * @param chars - Characters that are used when creating the random string. Defaults to all alphanumeric chars (A-Z, a-z, 0-9).
     * @return The generated character.
     */
    Prando.prototype.nextChar = function(chars) {
      if (chars === void 0) {
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      }
      this.recalculate()
      return chars.substr(this.nextInt(0, chars.length - 1), 1)
    }
    /**
     * Picks a pseudo-random item from an array. The array is left unmodified.
     *
     * Note: keep in mind that while the returned item will be random enough, picking one item from the array at a time
     * does not guarantee nor imply that a sequence of random non-repeating items will be picked. If you want to
     * *pick items in a random order* from an array, instead of *pick one random item from an array*, it's best to
     * apply a *shuffle* transformation to the array instead, then read it linearly.
     *
     * @param array - Array of any type containing one or more candidates for random picking.
     * @return An item from the array.
     */
    Prando.prototype.nextArrayItem = function(array) {
      this.recalculate()
      return array[this.nextInt(0, array.length - 1)]
    }
    /**
     * Generates a pseudo-random boolean.
     *
     * @return A value of true or false.
     */
    Prando.prototype.nextBoolean = function() {
      this.recalculate()
      return this._value > 0.5
    }
    /**
     * Skips ahead in the sequence of numbers that are being generated. This is equivalent to
     * calling next() a specified number of times, but faster since it doesn't need to map the
     * new random numbers to a range and return it.
     *
     * @param iterations - The number of items to skip ahead.
     */
    Prando.prototype.skip = function(iterations) {
      if (iterations === void 0) {
        iterations = 1
      }
      while (iterations-- > 0) {
        this.recalculate()
      }
    }
    /**
     * Reset the pseudo-random number sequence back to its starting seed. Further calls to next()
     * will then produce the same sequence of numbers it had produced before. This is equivalent to
     * creating a new Prando instance with the same seed as another Prando instance.
     *
     * Example:
     * let rng = new Prando(12345678);
     * console.log(rng.next()); // 0.6177754114889017
     * console.log(rng.next()); // 0.5784605181725837
     * rng.reset();
     * console.log(rng.next()); // 0.6177754114889017 again
     * console.log(rng.next()); // 0.5784605181725837 again
     */
    Prando.prototype.reset = function() {
      this._value = this._seed
    }
    // ================================================================================================================
    // PRIVATE INTERFACE ----------------------------------------------------------------------------------------------
    Prando.prototype.recalculate = function() {
      this._value = this.xorshift(this._value)
    }
    Prando.prototype.xorshift = function(value) {
      // Xorshift*32
      // Based on George Marsaglia's work: http://www.jstatsoft.org/v08/i14/paper
      value ^= value << 13
      value ^= value >> 17
      value ^= value << 5
      return value
    }
    Prando.prototype.map = function(val, minFrom, maxFrom, minTo, maxTo) {
      return ((val - minFrom) / (maxFrom - minFrom)) * (maxTo - minTo) + minTo
    }
    Prando.prototype.hashCode = function(str) {
      var hash = 0
      if (str) {
        var l = str.length
        for (var i = 0; i < l; i++) {
          hash = (hash << 5) - hash + str.charCodeAt(i)
          hash |= 0
          hash = this.xorshift(hash)
        }
      }
      return this.getSafeSeed(hash)
    }
    Prando.prototype.getSafeSeed = function(seed) {
      if (seed === 0) return 1
      return seed
    }
    Prando.MIN = -2147483648 // Int32 min
    Prando.MAX = 2147483647 // Int32 max
    return Prando
  })()

  /* src/Button.svelte generated by Svelte v3.12.1 */

  const file = 'src/Button.svelte'

  // (45:0) {:else}
  function create_else_block(ctx) {
    var button, current, dispose

    const default_slot_template = ctx.$$slots.default
    const default_slot = create_slot(default_slot_template, ctx, null)

    const block = {
      c: function create() {
        button = element('button')

        if (default_slot) default_slot.c()

        button.disabled = ctx.disabled
        attr_dev(button, 'class', 'svelte-1ijz73k')
        add_location(button, file, 45, 2, 753)
        dispose = listen_dev(button, 'click', ctx.click_handler)
      },

      l: function claim(nodes) {
        if (default_slot) default_slot.l(button_nodes)
      },

      m: function mount(target, anchor) {
        insert_dev(target, button, anchor)

        if (default_slot) {
          default_slot.m(button, null)
        }

        current = true
      },

      p: function update(changed, ctx) {
        if (default_slot && default_slot.p && changed.$$scope) {
          default_slot.p(
            get_slot_changes(default_slot_template, ctx, changed, null),
            get_slot_context(default_slot_template, ctx, null)
          )
        }

        if (!current || changed.disabled) {
          prop_dev(button, 'disabled', ctx.disabled)
        }
      },

      i: function intro(local) {
        if (current) return
        transition_in(default_slot, local)
        current = true
      },

      o: function outro(local) {
        transition_out(default_slot, local)
        current = false
      },

      d: function destroy(detaching) {
        if (detaching) {
          detach_dev(button)
        }

        if (default_slot) default_slot.d(detaching)
        dispose()
      }
    }
    dispatch_dev('SvelteRegisterBlock', {
      block,
      id: create_else_block.name,
      type: 'else',
      source: '(45:0) {:else}',
      ctx
    })
    return block
  }

  // (38:0) {#if type == 'checkbox'}
  function create_if_block(ctx) {
    var label, input, t, span, current, dispose

    const default_slot_template = ctx.$$slots.default
    const default_slot = create_slot(default_slot_template, ctx, null)

    const block = {
      c: function create() {
        label = element('label')
        input = element('input')
        t = space()
        span = element('span')

        if (default_slot) default_slot.c()
        attr_dev(input, 'type', 'checkbox')
        input.disabled = ctx.disabled
        attr_dev(input, 'class', 'svelte-1ijz73k')
        add_location(input, file, 39, 4, 644)

        attr_dev(span, 'class', 'svelte-1ijz73k')
        add_location(span, file, 40, 4, 698)
        attr_dev(label, 'class', 'svelte-1ijz73k')
        add_location(label, file, 38, 2, 632)
        dispose = listen_dev(input, 'change', ctx.input_change_handler)
      },

      l: function claim(nodes) {
        if (default_slot) default_slot.l(span_nodes)
      },

      m: function mount(target, anchor) {
        insert_dev(target, label, anchor)
        append_dev(label, input)

        input.checked = ctx.checked

        append_dev(label, t)
        append_dev(label, span)

        if (default_slot) {
          default_slot.m(span, null)
        }

        current = true
      },

      p: function update(changed, ctx) {
        if (changed.checked) input.checked = ctx.checked

        if (!current || changed.disabled) {
          prop_dev(input, 'disabled', ctx.disabled)
        }

        if (default_slot && default_slot.p && changed.$$scope) {
          default_slot.p(
            get_slot_changes(default_slot_template, ctx, changed, null),
            get_slot_context(default_slot_template, ctx, null)
          )
        }
      },

      i: function intro(local) {
        if (current) return
        transition_in(default_slot, local)
        current = true
      },

      o: function outro(local) {
        transition_out(default_slot, local)
        current = false
      },

      d: function destroy(detaching) {
        if (detaching) {
          detach_dev(label)
        }

        if (default_slot) default_slot.d(detaching)
        dispose()
      }
    }
    dispatch_dev('SvelteRegisterBlock', {
      block,
      id: create_if_block.name,
      type: 'if',
      source: "(38:0) {#if type == 'checkbox'}",
      ctx
    })
    return block
  }

  function create_fragment(ctx) {
    var current_block_type_index, if_block, if_block_anchor, current

    var if_block_creators = [create_if_block, create_else_block]

    var if_blocks = []

    function select_block_type(changed, ctx) {
      if (ctx.type == 'checkbox') return 0
      return 1
    }

    current_block_type_index = select_block_type(null, ctx)
    if_block = if_blocks[current_block_type_index] = if_block_creators[
      current_block_type_index
    ](ctx)

    const block = {
      c: function create() {
        if_block.c()
        if_block_anchor = empty()
      },

      l: function claim(nodes) {
        throw new Error(
          'options.hydrate only works if the component was compiled with the `hydratable: true` option'
        )
      },

      m: function mount(target, anchor) {
        if_blocks[current_block_type_index].m(target, anchor)
        insert_dev(target, if_block_anchor, anchor)
        current = true
      },

      p: function update(changed, ctx) {
        var previous_block_index = current_block_type_index
        current_block_type_index = select_block_type(changed, ctx)
        if (current_block_type_index === previous_block_index) {
          if_blocks[current_block_type_index].p(changed, ctx)
        } else {
          group_outros()
          transition_out(if_blocks[previous_block_index], 1, 1, () => {
            if_blocks[previous_block_index] = null
          })
          check_outros()

          if_block = if_blocks[current_block_type_index]
          if (!if_block) {
            if_block = if_blocks[current_block_type_index] = if_block_creators[
              current_block_type_index
            ](ctx)
            if_block.c()
          }
          transition_in(if_block, 1)
          if_block.m(if_block_anchor.parentNode, if_block_anchor)
        }
      },

      i: function intro(local) {
        if (current) return
        transition_in(if_block)
        current = true
      },

      o: function outro(local) {
        transition_out(if_block)
        current = false
      },

      d: function destroy(detaching) {
        if_blocks[current_block_type_index].d(detaching)

        if (detaching) {
          detach_dev(if_block_anchor)
        }
      }
    }
    dispatch_dev('SvelteRegisterBlock', {
      block,
      id: create_fragment.name,
      type: 'component',
      source: '',
      ctx
    })
    return block
  }

  function instance($$self, $$props, $$invalidate) {
    let { type = 'text', checked, disabled } = $$props

    const writable_props = ['type', 'checked', 'disabled']
    Object.keys($$props).forEach(key => {
      if (!writable_props.includes(key) && !key.startsWith('$$'))
        console.warn(`<Button> was created with unknown prop '${key}'`)
    })

    let { $$slots = {}, $$scope } = $$props

    function click_handler(event) {
      bubble($$self, event)
    }

    function input_change_handler() {
      checked = this.checked
      $$invalidate('checked', checked)
    }

    $$self.$set = $$props => {
      if ('type' in $$props) $$invalidate('type', (type = $$props.type))
      if ('checked' in $$props)
        $$invalidate('checked', (checked = $$props.checked))
      if ('disabled' in $$props)
        $$invalidate('disabled', (disabled = $$props.disabled))
      if ('$$scope' in $$props)
        $$invalidate('$$scope', ($$scope = $$props.$$scope))
    }

    $$self.$capture_state = () => {
      return { type, checked, disabled }
    }

    $$self.$inject_state = $$props => {
      if ('type' in $$props) $$invalidate('type', (type = $$props.type))
      if ('checked' in $$props)
        $$invalidate('checked', (checked = $$props.checked))
      if ('disabled' in $$props)
        $$invalidate('disabled', (disabled = $$props.disabled))
    }

    return {
      type,
      checked,
      disabled,
      click_handler,
      input_change_handler,
      $$slots,
      $$scope
    }
  }

  class Button extends SvelteComponentDev {
    constructor(options) {
      super(options)
      init(this, options, instance, create_fragment, safe_not_equal, [
        'type',
        'checked',
        'disabled'
      ])
      dispatch_dev('SvelteRegisterComponent', {
        component: this,
        tagName: 'Button',
        options,
        id: create_fragment.name
      })

      const { ctx } = this.$$
      const props = options.props || {}
      if (ctx.checked === undefined && !('checked' in props)) {
        console.warn("<Button> was created without expected prop 'checked'")
      }
      if (ctx.disabled === undefined && !('disabled' in props)) {
        console.warn("<Button> was created without expected prop 'disabled'")
      }
    }

    get type() {
      throw new Error(
        "<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      )
    }

    set type(value) {
      throw new Error(
        "<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      )
    }

    get checked() {
      throw new Error(
        "<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      )
    }

    set checked(value) {
      throw new Error(
        "<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      )
    }

    get disabled() {
      throw new Error(
        "<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      )
    }

    set disabled(value) {
      throw new Error(
        "<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      )
    }
  }

  const BLANK = ''
  const MINE = '*'
  const HIDDEN = false
  const VISIBLE = true
  const UNKNOWN = '?'
  const SAFE = '^'
  const FLAG = '!'
  const LOST = 'l'

  /* src/Cell.svelte generated by Svelte v3.12.1 */

  const file$1 = 'src/Cell.svelte'

  // (111:0) {:else}
  function create_else_block$1(ctx) {
    var button, button_class_value, button_data_value_value

    const block = {
      c: function create() {
        button = element('button')
        attr_dev(
          button,
          'class',
          (button_class_value =
            '' +
            null_to_empty(
              ctx.flag !== FLAG ? '' : ctx.value === MINE ? 'valid' : 'invalid'
            ) +
            ' svelte-at7p5d')
        )
        attr_dev(
          button,
          'data-value',
          (button_data_value_value = ctx.flag || ctx.value)
        )
        button.disabled = true
        add_location(button, file$1, 111, 2, 4458)
      },

      m: function mount(target, anchor) {
        insert_dev(target, button, anchor)
      },

      p: function update(changed, ctx) {
        if (
          (changed.flag || changed.value) &&
          button_class_value !==
            (button_class_value =
              '' +
              null_to_empty(
                ctx.flag !== FLAG
                  ? ''
                  : ctx.value === MINE
                  ? 'valid'
                  : 'invalid'
              ) +
              ' svelte-at7p5d')
        ) {
          attr_dev(button, 'class', button_class_value)
        }

        if (
          (changed.flag || changed.value) &&
          button_data_value_value !==
            (button_data_value_value = ctx.flag || ctx.value)
        ) {
          attr_dev(button, 'data-value', button_data_value_value)
        }
      },

      d: function destroy(detaching) {
        if (detaching) {
          detach_dev(button)
        }
      }
    }
    dispatch_dev('SvelteRegisterBlock', {
      block,
      id: create_else_block$1.name,
      type: 'else',
      source: '(111:0) {:else}',
      ctx
    })
    return block
  }

  // (109:0) {#if value === false}
  function create_if_block$1(ctx) {
    var button, dispose

    const block = {
      c: function create() {
        button = element('button')
        attr_dev(button, 'data-value', ctx.flag)
        attr_dev(button, 'class', 'svelte-at7p5d')
        add_location(button, file$1, 109, 2, 4396)

        dispose = [
          listen_dev(button, 'click', ctx.click_handler),
          listen_dev(button, 'mouseenter', ctx.mouseenter_handler)
        ]
      },

      m: function mount(target, anchor) {
        insert_dev(target, button, anchor)
      },

      p: function update(changed, ctx) {
        if (changed.flag) {
          attr_dev(button, 'data-value', ctx.flag)
        }
      },

      d: function destroy(detaching) {
        if (detaching) {
          detach_dev(button)
        }

        run_all(dispose)
      }
    }
    dispatch_dev('SvelteRegisterBlock', {
      block,
      id: create_if_block$1.name,
      type: 'if',
      source: '(109:0) {#if value === false}',
      ctx
    })
    return block
  }

  function create_fragment$1(ctx) {
    var if_block_anchor

    function select_block_type(changed, ctx) {
      if (ctx.value === false) return create_if_block$1
      return create_else_block$1
    }

    var current_block_type = select_block_type(null, ctx)
    var if_block = current_block_type(ctx)

    const block = {
      c: function create() {
        if_block.c()
        if_block_anchor = empty()
      },

      l: function claim(nodes) {
        throw new Error(
          'options.hydrate only works if the component was compiled with the `hydratable: true` option'
        )
      },

      m: function mount(target, anchor) {
        if_block.m(target, anchor)
        insert_dev(target, if_block_anchor, anchor)
      },

      p: function update(changed, ctx) {
        if (
          current_block_type ===
            (current_block_type = select_block_type(changed, ctx)) &&
          if_block
        ) {
          if_block.p(changed, ctx)
        } else {
          if_block.d(1)
          if_block = current_block_type(ctx)
          if (if_block) {
            if_block.c()
            if_block.m(if_block_anchor.parentNode, if_block_anchor)
          }
        }
      },

      i: noop,
      o: noop,

      d: function destroy(detaching) {
        if_block.d(detaching)

        if (detaching) {
          detach_dev(if_block_anchor)
        }
      }
    }
    dispatch_dev('SvelteRegisterBlock', {
      block,
      id: create_fragment$1.name,
      type: 'component',
      source: '',
      ctx
    })
    return block
  }

  function instance$1($$self, $$props, $$invalidate) {
    let { value, flag } = $$props

    const writable_props = ['value', 'flag']
    Object.keys($$props).forEach(key => {
      if (!writable_props.includes(key) && !key.startsWith('$$'))
        console.warn(`<Cell> was created with unknown prop '${key}'`)
    })

    function click_handler(event) {
      bubble($$self, event)
    }

    function mouseenter_handler(event) {
      bubble($$self, event)
    }

    $$self.$set = $$props => {
      if ('value' in $$props) $$invalidate('value', (value = $$props.value))
      if ('flag' in $$props) $$invalidate('flag', (flag = $$props.flag))
    }

    $$self.$capture_state = () => {
      return { value, flag }
    }

    $$self.$inject_state = $$props => {
      if ('value' in $$props) $$invalidate('value', (value = $$props.value))
      if ('flag' in $$props) $$invalidate('flag', (flag = $$props.flag))
    }

    return {
      value,
      flag,
      click_handler,
      mouseenter_handler
    }
  }

  class Cell extends SvelteComponentDev {
    constructor(options) {
      super(options)
      init(this, options, instance$1, create_fragment$1, safe_not_equal, [
        'value',
        'flag'
      ])
      dispatch_dev('SvelteRegisterComponent', {
        component: this,
        tagName: 'Cell',
        options,
        id: create_fragment$1.name
      })

      const { ctx } = this.$$
      const props = options.props || {}
      if (ctx.value === undefined && !('value' in props)) {
        console.warn("<Cell> was created without expected prop 'value'")
      }
      if (ctx.flag === undefined && !('flag' in props)) {
        console.warn("<Cell> was created without expected prop 'flag'")
      }
    }

    get value() {
      throw new Error(
        "<Cell>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      )
    }

    set value(value) {
      throw new Error(
        "<Cell>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      )
    }

    get flag() {
      throw new Error(
        "<Cell>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      )
    }

    set flag(value) {
      throw new Error(
        "<Cell>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      )
    }
  }

  function createBoard(seed, width, height, mines, onWin, onLose) {
    const rand = new Prando(seed)

    const size = width * height
    const board = Array(size).fill(BLANK)
    const flags = Array(size).fill(BLANK)
    const mask = Array(size).fill(HIDDEN)

    const obj = {
      marked: 0,
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
      const delta = [i]
      switch (board[i]) {
        case BLANK:
          for (const n of getAdjacent(i))
            if (mask[n] === HIDDEN) delta.push(...reveal(n))
          break

        case MINE:
          mask.fill(VISIBLE)
          board[i] = LOST
          onLose()
          break
      }

      revealed++
      if (revealed >= size - mines) onWin()

      return delta
    }

    function mark(i) {
      switch (flags[i]) {
        case BLANK:
          flags[i] = FLAG
          obj.marked++
          break

        case FLAG:
          flags[i] = UNKNOWN
          obj.marked--
          break

        case UNKNOWN:
          flags[i] = BLANK
          break
      }
    }

    // place mines
    for (let i = 0; i < mines; i++) {
      const square = rand.nextInt(0, size)
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

    return obj
  }

  function range(start, stop, step) {
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

  function combinations(n, arr, prefix = []) {
    if (prefix.length == n) return [prefix]
    return arr.flatMap((_, i, arr) =>
      combinations(n, arr.slice(i + 1), prefix.concat(arr[i]))
    )
  }

  function getProbability(board, i) {
    let solutionList = [Array(board.size).fill(UNKNOWN)]
    solutionList = updateSolutionList(board, range(board.size), solutionList)
    const list = getProbabilityList(solutionList, board)
    return list[i]
  }

  function solve(board) {
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

  /* src/Board.svelte generated by Svelte v3.12.1 */

  const file$2 = 'src/Board.svelte'

  function get_each_context_1(ctx, list, i) {
    const child_ctx = Object.create(ctx)
    child_ctx.x = list[i]
    return child_ctx
  }

  function get_each_context(ctx, list, i) {
    const child_ctx = Object.create(ctx)
    child_ctx.y = list[i]
    return child_ctx
  }

  // (103:0) <Button type="checkbox" bind:checked={mark}>
  function create_default_slot_2(ctx) {
    var t

    const block = {
      c: function create() {
        t = text('Mark')
      },

      m: function mount(target, anchor) {
        insert_dev(target, t, anchor)
      },

      d: function destroy(detaching) {
        if (detaching) {
          detach_dev(t)
        }
      }
    }
    dispatch_dev('SvelteRegisterBlock', {
      block,
      id: create_default_slot_2.name,
      type: 'slot',
      source: '(103:0) <Button type="checkbox" bind:checked={mark}>',
      ctx
    })
    return block
  }

  // (104:0) <Button on:click={tickSolve}>
  function create_default_slot_1(ctx) {
    var t

    const block = {
      c: function create() {
        t = text('Solve')
      },

      m: function mount(target, anchor) {
        insert_dev(target, t, anchor)
      },

      d: function destroy(detaching) {
        if (detaching) {
          detach_dev(t)
        }
      }
    }
    dispatch_dev('SvelteRegisterBlock', {
      block,
      id: create_default_slot_1.name,
      type: 'slot',
      source: '(104:0) <Button on:click={tickSolve}>',
      ctx
    })
    return block
  }

  // (105:0) <Button type="checkbox" bind:checked={cheat}>
  function create_default_slot(ctx) {
    var t

    const block = {
      c: function create() {
        t = text('Cheat')
      },

      m: function mount(target, anchor) {
        insert_dev(target, t, anchor)
      },

      d: function destroy(detaching) {
        if (detaching) {
          detach_dev(t)
        }
      }
    }
    dispatch_dev('SvelteRegisterBlock', {
      block,
      id: create_default_slot.name,
      type: 'slot',
      source: '(105:0) <Button type="checkbox" bind:checked={cheat}>',
      ctx
    })
    return block
  }

  // (111:2) {#if cheat}
  function create_if_block_1(ctx) {
    var span,
      t0_value = ctx.Math.round(ctx.probability * 100) + '',
      t0,
      t1

    const block = {
      c: function create() {
        span = element('span')
        t0 = text(t0_value)
        t1 = text('% chance of a mine')
        add_location(span, file$2, 111, 4, 2312)
      },

      m: function mount(target, anchor) {
        insert_dev(target, span, anchor)
        append_dev(span, t0)
        append_dev(span, t1)
      },

      p: function update(changed, ctx) {
        if (
          changed.probability &&
          t0_value !== (t0_value = ctx.Math.round(ctx.probability * 100) + '')
        ) {
          set_data_dev(t0, t0_value)
        }
      },

      d: function destroy(detaching) {
        if (detaching) {
          detach_dev(span)
        }
      }
    }
    dispatch_dev('SvelteRegisterBlock', {
      block,
      id: create_if_block_1.name,
      type: 'if',
      source: '(111:2) {#if cheat}',
      ctx
    })
    return block
  }

  // (118:6) {#each range(width) as x}
  function create_each_block_1(ctx) {
    var current

    function mouseenter_handler() {
      return ctx.mouseenter_handler(ctx)
    }

    function click_handler() {
      return ctx.click_handler(ctx)
    }

    var cell = new Cell({
      props: {
        value: ctx.board.get(ctx.width * ctx.y + ctx.x),
        flag: ctx.board.flags[ctx.width * ctx.y + ctx.x]
      },
      $$inline: true
    })
    cell.$on('mouseenter', mouseenter_handler)
    cell.$on('click', click_handler)

    const block = {
      c: function create() {
        cell.$$.fragment.c()
      },

      m: function mount(target, anchor) {
        mount_component(cell, target, anchor)
        current = true
      },

      p: function update(changed, new_ctx) {
        ctx = new_ctx
        var cell_changes = {}
        if (changed.board || changed.width || changed.height)
          cell_changes.value = ctx.board.get(ctx.width * ctx.y + ctx.x)
        if (changed.board || changed.width || changed.height)
          cell_changes.flag = ctx.board.flags[ctx.width * ctx.y + ctx.x]
        cell.$set(cell_changes)
      },

      i: function intro(local) {
        if (current) return
        transition_in(cell.$$.fragment, local)

        current = true
      },

      o: function outro(local) {
        transition_out(cell.$$.fragment, local)
        current = false
      },

      d: function destroy(detaching) {
        destroy_component(cell, detaching)
      }
    }
    dispatch_dev('SvelteRegisterBlock', {
      block,
      id: create_each_block_1.name,
      type: 'each',
      source: '(118:6) {#each range(width) as x}',
      ctx
    })
    return block
  }

  // (116:2) {#each range(height) as y}
  function create_each_block(ctx) {
    var div, t, current

    let each_value_1 = range(ctx.width)

    let each_blocks = []

    for (let i = 0; i < each_value_1.length; i += 1) {
      each_blocks[i] = create_each_block_1(
        get_each_context_1(ctx, each_value_1, i)
      )
    }

    const out = i =>
      transition_out(each_blocks[i], 1, 1, () => {
        each_blocks[i] = null
      })

    const block = {
      c: function create() {
        div = element('div')

        for (let i = 0; i < each_blocks.length; i += 1) {
          each_blocks[i].c()
        }

        t = space()
        attr_dev(div, 'class', 'row svelte-12brb26')
        add_location(div, file$2, 116, 4, 2443)
      },

      m: function mount(target, anchor) {
        insert_dev(target, div, anchor)

        for (let i = 0; i < each_blocks.length; i += 1) {
          each_blocks[i].m(div, null)
        }

        append_dev(div, t)
        current = true
      },

      p: function update(changed, ctx) {
        if (changed.board || changed.width || changed.range || changed.height) {
          each_value_1 = range(ctx.width)

          let i
          for (i = 0; i < each_value_1.length; i += 1) {
            const child_ctx = get_each_context_1(ctx, each_value_1, i)

            if (each_blocks[i]) {
              each_blocks[i].p(changed, child_ctx)
              transition_in(each_blocks[i], 1)
            } else {
              each_blocks[i] = create_each_block_1(child_ctx)
              each_blocks[i].c()
              transition_in(each_blocks[i], 1)
              each_blocks[i].m(div, t)
            }
          }

          group_outros()
          for (i = each_value_1.length; i < each_blocks.length; i += 1) {
            out(i)
          }
          check_outros()
        }
      },

      i: function intro(local) {
        if (current) return
        for (let i = 0; i < each_value_1.length; i += 1) {
          transition_in(each_blocks[i])
        }

        current = true
      },

      o: function outro(local) {
        each_blocks = each_blocks.filter(Boolean)
        for (let i = 0; i < each_blocks.length; i += 1) {
          transition_out(each_blocks[i])
        }

        current = false
      },

      d: function destroy(detaching) {
        if (detaching) {
          detach_dev(div)
        }

        destroy_each(each_blocks, detaching)
      }
    }
    dispatch_dev('SvelteRegisterBlock', {
      block,
      id: create_each_block.name,
      type: 'each',
      source: '(116:2) {#each range(height) as y}',
      ctx
    })
    return block
  }

  // (128:0) {#if solveTime.count > 0}
  function create_if_block$2(ctx) {
    var t0,
      t1_value = ctx.Math.round(ctx.solveTime.total / ctx.solveTime.count) + '',
      t1,
      t2,
      t3_value = ctx.Math.round(ctx.solveTime.max) + '',
      t3

    const block = {
      c: function create() {
        t0 = text('Avg: ')
        t1 = text(t1_value)
        t2 = text(', Max: ')
        t3 = text(t3_value)
      },

      m: function mount(target, anchor) {
        insert_dev(target, t0, anchor)
        insert_dev(target, t1, anchor)
        insert_dev(target, t2, anchor)
        insert_dev(target, t3, anchor)
      },

      p: function update(changed, ctx) {
        if (
          changed.solveTime &&
          t1_value !==
            (t1_value =
              ctx.Math.round(ctx.solveTime.total / ctx.solveTime.count) + '')
        ) {
          set_data_dev(t1, t1_value)
        }

        if (
          changed.solveTime &&
          t3_value !== (t3_value = ctx.Math.round(ctx.solveTime.max) + '')
        ) {
          set_data_dev(t3, t3_value)
        }
      },

      d: function destroy(detaching) {
        if (detaching) {
          detach_dev(t0)
          detach_dev(t1)
          detach_dev(t2)
          detach_dev(t3)
        }
      }
    }
    dispatch_dev('SvelteRegisterBlock', {
      block,
      id: create_if_block$2.name,
      type: 'if',
      source: '(128:0) {#if solveTime.count > 0}',
      ctx
    })
    return block
  }

  function create_fragment$2(ctx) {
    var updating_checked,
      t0,
      t1,
      updating_checked_1,
      t2,
      div0,
      span0,
      t3_value = ctx.board.marked + '',
      t3,
      t4,
      t5,
      t6,
      span1,
      t7_value = ctx.Math.floor(ctx.time / 60) + '',
      t7,
      t8,
      t9_value = (ctx.time % 60).toString().padStart(2, '0') + '',
      t9,
      span1_class_value,
      t10,
      t11,
      div1,
      t12,
      if_block1_anchor,
      current,
      dispose

    function button0_checked_binding(value) {
      ctx.button0_checked_binding.call(null, value)
      updating_checked = true
      add_flush_callback(() => (updating_checked = false))
    }

    let button0_props = {
      type: 'checkbox',
      $$slots: { default: [create_default_slot_2] },
      $$scope: { ctx }
    }
    if (ctx.mark !== void 0) {
      button0_props.checked = ctx.mark
    }
    var button0 = new Button({ props: button0_props, $$inline: true })

    binding_callbacks.push(() =>
      bind(button0, 'checked', button0_checked_binding)
    )

    var button1 = new Button({
      props: {
        $$slots: { default: [create_default_slot_1] },
        $$scope: { ctx }
      },
      $$inline: true
    })
    button1.$on('click', ctx.tickSolve)

    function button2_checked_binding(value_1) {
      ctx.button2_checked_binding.call(null, value_1)
      updating_checked_1 = true
      add_flush_callback(() => (updating_checked_1 = false))
    }

    let button2_props = {
      type: 'checkbox',
      $$slots: { default: [create_default_slot] },
      $$scope: { ctx }
    }
    if (ctx.cheat !== void 0) {
      button2_props.checked = ctx.cheat
    }
    var button2 = new Button({ props: button2_props, $$inline: true })

    binding_callbacks.push(() =>
      bind(button2, 'checked', button2_checked_binding)
    )

    var if_block0 = ctx.cheat && create_if_block_1(ctx)

    let each_value = range(ctx.height)

    let each_blocks = []

    for (let i = 0; i < each_value.length; i += 1) {
      each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i))
    }

    const out = i =>
      transition_out(each_blocks[i], 1, 1, () => {
        each_blocks[i] = null
      })

    var if_block1 = ctx.solveTime.count > 0 && create_if_block$2(ctx)

    const block = {
      c: function create() {
        button0.$$.fragment.c()
        t0 = space()
        button1.$$.fragment.c()
        t1 = space()
        button2.$$.fragment.c()
        t2 = space()
        div0 = element('div')
        span0 = element('span')
        t3 = text(t3_value)
        t4 = text(' of ')
        t5 = text(ctx.mines)
        t6 = space()
        span1 = element('span')
        t7 = text(t7_value)
        t8 = text(' : ')
        t9 = text(t9_value)
        t10 = space()
        if (if_block0) if_block0.c()
        t11 = space()
        div1 = element('div')

        for (let i = 0; i < each_blocks.length; i += 1) {
          each_blocks[i].c()
        }

        t12 = space()
        if (if_block1) if_block1.c()
        if_block1_anchor = empty()
        add_location(span0, file$2, 106, 2, 2142)
        attr_dev(
          span1,
          'class',
          (span1_class_value = 'state-' + ctx.state + ' svelte-12brb26')
        )
        add_location(span1, file$2, 107, 2, 2183)
        attr_dev(div0, 'class', 'info svelte-12brb26')
        add_location(div0, file$2, 105, 0, 2121)
        attr_dev(div1, 'class', 'board')
        add_location(div1, file$2, 114, 0, 2390)

        dispose = [
          listen_dev(window, 'keydown', ctx.keydown_handler),
          listen_dev(window, 'keyup', ctx.keyup_handler)
        ]
      },

      l: function claim(nodes) {
        throw new Error(
          'options.hydrate only works if the component was compiled with the `hydratable: true` option'
        )
      },

      m: function mount(target, anchor) {
        mount_component(button0, target, anchor)
        insert_dev(target, t0, anchor)
        mount_component(button1, target, anchor)
        insert_dev(target, t1, anchor)
        mount_component(button2, target, anchor)
        insert_dev(target, t2, anchor)
        insert_dev(target, div0, anchor)
        append_dev(div0, span0)
        append_dev(span0, t3)
        append_dev(span0, t4)
        append_dev(span0, t5)
        append_dev(div0, t6)
        append_dev(div0, span1)
        append_dev(span1, t7)
        append_dev(span1, t8)
        append_dev(span1, t9)
        append_dev(div0, t10)
        if (if_block0) if_block0.m(div0, null)
        insert_dev(target, t11, anchor)
        insert_dev(target, div1, anchor)

        for (let i = 0; i < each_blocks.length; i += 1) {
          each_blocks[i].m(div1, null)
        }

        insert_dev(target, t12, anchor)
        if (if_block1) if_block1.m(target, anchor)
        insert_dev(target, if_block1_anchor, anchor)
        current = true
      },

      p: function update(changed, ctx) {
        var button0_changes = {}
        if (changed.$$scope) button0_changes.$$scope = { changed, ctx }
        if (!updating_checked && changed.mark) {
          button0_changes.checked = ctx.mark
        }
        button0.$set(button0_changes)

        var button1_changes = {}
        if (changed.$$scope) button1_changes.$$scope = { changed, ctx }
        button1.$set(button1_changes)

        var button2_changes = {}
        if (changed.$$scope) button2_changes.$$scope = { changed, ctx }
        if (!updating_checked_1 && changed.cheat) {
          button2_changes.checked = ctx.cheat
        }
        button2.$set(button2_changes)

        if (
          (!current || changed.board) &&
          t3_value !== (t3_value = ctx.board.marked + '')
        ) {
          set_data_dev(t3, t3_value)
        }

        if (!current || changed.mines) {
          set_data_dev(t5, ctx.mines)
        }

        if (
          (!current || changed.time) &&
          t7_value !== (t7_value = ctx.Math.floor(ctx.time / 60) + '')
        ) {
          set_data_dev(t7, t7_value)
        }

        if (
          (!current || changed.time) &&
          t9_value !==
            (t9_value = (ctx.time % 60).toString().padStart(2, '0') + '')
        ) {
          set_data_dev(t9, t9_value)
        }

        if (
          (!current || changed.state) &&
          span1_class_value !==
            (span1_class_value = 'state-' + ctx.state + ' svelte-12brb26')
        ) {
          attr_dev(span1, 'class', span1_class_value)
        }

        if (ctx.cheat) {
          if (if_block0) {
            if_block0.p(changed, ctx)
          } else {
            if_block0 = create_if_block_1(ctx)
            if_block0.c()
            if_block0.m(div0, null)
          }
        } else if (if_block0) {
          if_block0.d(1)
          if_block0 = null
        }

        if (changed.range || changed.width || changed.board || changed.height) {
          each_value = range(ctx.height)

          let i
          for (i = 0; i < each_value.length; i += 1) {
            const child_ctx = get_each_context(ctx, each_value, i)

            if (each_blocks[i]) {
              each_blocks[i].p(changed, child_ctx)
              transition_in(each_blocks[i], 1)
            } else {
              each_blocks[i] = create_each_block(child_ctx)
              each_blocks[i].c()
              transition_in(each_blocks[i], 1)
              each_blocks[i].m(div1, null)
            }
          }

          group_outros()
          for (i = each_value.length; i < each_blocks.length; i += 1) {
            out(i)
          }
          check_outros()
        }

        if (ctx.solveTime.count > 0) {
          if (if_block1) {
            if_block1.p(changed, ctx)
          } else {
            if_block1 = create_if_block$2(ctx)
            if_block1.c()
            if_block1.m(if_block1_anchor.parentNode, if_block1_anchor)
          }
        } else if (if_block1) {
          if_block1.d(1)
          if_block1 = null
        }
      },

      i: function intro(local) {
        if (current) return
        transition_in(button0.$$.fragment, local)

        transition_in(button1.$$.fragment, local)

        transition_in(button2.$$.fragment, local)

        for (let i = 0; i < each_value.length; i += 1) {
          transition_in(each_blocks[i])
        }

        current = true
      },

      o: function outro(local) {
        transition_out(button0.$$.fragment, local)
        transition_out(button1.$$.fragment, local)
        transition_out(button2.$$.fragment, local)

        each_blocks = each_blocks.filter(Boolean)
        for (let i = 0; i < each_blocks.length; i += 1) {
          transition_out(each_blocks[i])
        }

        current = false
      },

      d: function destroy(detaching) {
        destroy_component(button0, detaching)

        if (detaching) {
          detach_dev(t0)
        }

        destroy_component(button1, detaching)

        if (detaching) {
          detach_dev(t1)
        }

        destroy_component(button2, detaching)

        if (detaching) {
          detach_dev(t2)
          detach_dev(div0)
        }

        if (if_block0) if_block0.d()

        if (detaching) {
          detach_dev(t11)
          detach_dev(div1)
        }

        destroy_each(each_blocks, detaching)

        if (detaching) {
          detach_dev(t12)
        }

        if (if_block1) if_block1.d(detaching)

        if (detaching) {
          detach_dev(if_block1_anchor)
        }

        run_all(dispose)
      }
    }
    dispatch_dev('SvelteRegisterBlock', {
      block,
      id: create_fragment$2.name,
      type: 'component',
      source: '',
      ctx
    })
    return block
  }

  const PLAYING = 'p'

  const LOST$1 = 'l'

  const WON = 'w'

  function instance$2($$self, $$props, $$invalidate) {
    let { seed, width = 10, height = 10, mines = 10 } = $$props

    let mark = false
    let state = PLAYING

    let _time = performance.now()
    let time = 0
    const timer = setInterval(
      () =>
        $$invalidate(
          'time',
          (time = Math.floor((performance.now() - _time) / 1000))
        ),
      1000
    )

    const board = createBoard(
      seed,
      width,
      height,
      mines,
      () => $$invalidate('state', (state = WON)),
      () => $$invalidate('state', (state = LOST$1))
    )

    function handleClick(i) {
      if (mark) board.mark(i)
      else board.reveal(i)

      $$invalidate('board', board)
    }

    let solveTime = {
      count: 0,
      total: 0,
      max: 0
    }

    let solver
    function tickSolve() {
      if (!solver) solver = solve(board)

      const t0 = performance.now()
      solver.tick()
      const t1 = performance.now()
      const delta = t1 - t0
      $$invalidate('solveTime', solveTime.count++, solveTime)
      $$invalidate('solveTime', (solveTime.total += delta), solveTime)
      if (delta > solveTime.max)
        $$invalidate('solveTime', (solveTime.max = delta), solveTime)

      $$invalidate('board', board)
      if (state === PLAYING) setTimeout(tickSolve, 200 - delta)
    }

    let hover = 0
    let cheat = false

    const writable_props = ['seed', 'width', 'height', 'mines']
    Object.keys($$props).forEach(key => {
      if (!writable_props.includes(key) && !key.startsWith('$$'))
        console.warn(`<Board> was created with unknown prop '${key}'`)
    })

    const keydown_handler = e =>
      ['Alt', 'Control', 'Shift'].includes(e.key) &&
      $$invalidate('mark', (mark = true))

    const keyup_handler = e =>
      ['Alt', 'Control', 'Shift'].includes(e.key) &&
      $$invalidate('mark', (mark = false))

    function button0_checked_binding(value) {
      mark = value
      $$invalidate('mark', mark)
    }

    function button2_checked_binding(value_1) {
      cheat = value_1
      $$invalidate('cheat', cheat)
    }

    const mouseenter_handler = ({ y, x }) =>
      $$invalidate('hover', (hover = width * y + x))

    const click_handler = ({ y, x }) => handleClick(width * y + x)

    $$self.$set = $$props => {
      if ('seed' in $$props) $$invalidate('seed', (seed = $$props.seed))
      if ('width' in $$props) $$invalidate('width', (width = $$props.width))
      if ('height' in $$props) $$invalidate('height', (height = $$props.height))
      if ('mines' in $$props) $$invalidate('mines', (mines = $$props.mines))
    }

    $$self.$capture_state = () => {
      return {
        seed,
        width,
        height,
        mines,
        mark,
        state,
        _time,
        time,
        solveTime,
        solver,
        hover,
        cheat,
        probability
      }
    }

    $$self.$inject_state = $$props => {
      if ('seed' in $$props) $$invalidate('seed', (seed = $$props.seed))
      if ('width' in $$props) $$invalidate('width', (width = $$props.width))
      if ('height' in $$props) $$invalidate('height', (height = $$props.height))
      if ('mines' in $$props) $$invalidate('mines', (mines = $$props.mines))
      if ('mark' in $$props) $$invalidate('mark', (mark = $$props.mark))
      if ('state' in $$props) $$invalidate('state', (state = $$props.state))
      if ('_time' in $$props) _time = $$props._time
      if ('time' in $$props) $$invalidate('time', (time = $$props.time))
      if ('solveTime' in $$props)
        $$invalidate('solveTime', (solveTime = $$props.solveTime))
      if ('solver' in $$props) solver = $$props.solver
      if ('hover' in $$props) $$invalidate('hover', (hover = $$props.hover))
      if ('cheat' in $$props) $$invalidate('cheat', (cheat = $$props.cheat))
      if ('probability' in $$props)
        $$invalidate('probability', (probability = $$props.probability))
    }

    let probability

    $$self.$$.update = ($$dirty = { state: 1, cheat: 1, hover: 1 }) => {
      if ($$dirty.state) {
        state !== PLAYING && clearInterval(timer)
      }
      if ($$dirty.cheat || $$dirty.hover) {
        $$invalidate(
          'probability',
          (probability = cheat ? getProbability(board, hover) : 0)
        )
      }
    }

    return {
      seed,
      width,
      height,
      mines,
      mark,
      state,
      time,
      board,
      handleClick,
      solveTime,
      tickSolve,
      hover,
      cheat,
      Math,
      probability,
      keydown_handler,
      keyup_handler,
      button0_checked_binding,
      button2_checked_binding,
      mouseenter_handler,
      click_handler
    }
  }

  class Board extends SvelteComponentDev {
    constructor(options) {
      super(options)
      init(this, options, instance$2, create_fragment$2, safe_not_equal, [
        'seed',
        'width',
        'height',
        'mines'
      ])
      dispatch_dev('SvelteRegisterComponent', {
        component: this,
        tagName: 'Board',
        options,
        id: create_fragment$2.name
      })

      const { ctx } = this.$$
      const props = options.props || {}
      if (ctx.seed === undefined && !('seed' in props)) {
        console.warn("<Board> was created without expected prop 'seed'")
      }
    }

    get seed() {
      throw new Error(
        "<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      )
    }

    set seed(value) {
      throw new Error(
        "<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      )
    }

    get width() {
      throw new Error(
        "<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      )
    }

    set width(value) {
      throw new Error(
        "<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      )
    }

    get height() {
      throw new Error(
        "<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      )
    }

    set height(value) {
      throw new Error(
        "<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      )
    }

    get mines() {
      throw new Error(
        "<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      )
    }

    set mines(value) {
      throw new Error(
        "<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'"
      )
    }
  }

  /* src/App.svelte generated by Svelte v3.12.1 */

  const file$3 = 'src/App.svelte'

  // (111:0) {:else}
  function create_else_block$2(ctx) {
    var a,
      t0,
      form,
      h1,
      t2,
      input0,
      input0_updating = false,
      t3,
      input1,
      input1_updating = false,
      t4,
      input2,
      input2_updating = false,
      t5,
      input3,
      t6,
      t7,
      current,
      dispose

    function input0_input_handler() {
      input0_updating = true
      ctx.input0_input_handler.call(input0)
    }

    function input1_input_handler() {
      input1_updating = true
      ctx.input1_input_handler.call(input1)
    }

    function input2_input_handler() {
      input2_updating = true
      ctx.input2_input_handler.call(input2)
    }

    var button = new Button({
      props: {
        type: 'submit',
        disabled: ctx.disabled,
        $$slots: { default: [create_default_slot_1$1] },
        $$scope: { ctx }
      },
      $$inline: true
    })

    var if_block = ctx.disabled && create_if_block_1$1(ctx)

    const block = {
      c: function create() {
        a = element('a')
        t0 = space()
        form = element('form')
        h1 = element('h1')
        h1.textContent = 'Minesweeper'
        t2 = text('\n    Play\n    ')
        input0 = element('input')
        t3 = text('\n    by\n    ')
        input1 = element('input')
        t4 = text('\n    with\n    ')
        input2 = element('input')
        t5 = text('\n    mines and a seed of\n    ')
        input3 = element('input')
        t6 = text('\n      \n    ')
        button.$$.fragment.c()
        t7 = space()
        if (if_block) if_block.c()
        attr_dev(a, 'href', 'https://github.com/RedHatter/minesweeper')
        attr_dev(a, 'target', '_blank')
        attr_dev(a, 'class', 'svelte-xjel57')
        add_location(a, file$3, 111, 2, 2281)
        attr_dev(h1, 'class', 'svelte-xjel57')
        add_location(h1, file$3, 113, 4, 2399)
        attr_dev(input0, 'type', 'number')
        attr_dev(input0, 'class', 'svelte-xjel57')
        add_location(input0, file$3, 115, 4, 2433)
        attr_dev(input1, 'type', 'number')
        attr_dev(input1, 'class', 'svelte-xjel57')
        add_location(input1, file$3, 117, 4, 2487)
        attr_dev(input2, 'type', 'number')
        attr_dev(input2, 'class', 'svelte-xjel57')
        add_location(input2, file$3, 119, 4, 2544)
        attr_dev(input3, 'type', 'text')
        attr_dev(input3, 'class', 'svelte-xjel57')
        add_location(input3, file$3, 121, 4, 2615)
        attr_dev(form, 'class', 'svelte-xjel57')
        add_location(form, file$3, 112, 2, 2353)

        dispose = [
          listen_dev(input0, 'input', input0_input_handler),
          listen_dev(input1, 'input', input1_input_handler),
          listen_dev(input2, 'input', input2_input_handler),
          listen_dev(input3, 'input', ctx.input3_input_handler),
          listen_dev(form, 'submit', ctx.submit_handler)
        ]
      },

      m: function mount(target, anchor) {
        insert_dev(target, a, anchor)
        insert_dev(target, t0, anchor)
        insert_dev(target, form, anchor)
        append_dev(form, h1)
        append_dev(form, t2)
        append_dev(form, input0)

        set_input_value(input0, ctx.width)

        append_dev(form, t3)
        append_dev(form, input1)

        set_input_value(input1, ctx.height)

        append_dev(form, t4)
        append_dev(form, input2)

        set_input_value(input2, ctx.mines)

        append_dev(form, t5)
        append_dev(form, input3)

        set_input_value(input3, ctx.seed)

        append_dev(form, t6)
        mount_component(button, form, null)
        append_dev(form, t7)
        if (if_block) if_block.m(form, null)
        current = true
      },

      p: function update(changed, ctx) {
        if (!input0_updating && changed.width)
          set_input_value(input0, ctx.width)
        input0_updating = false
        if (!input1_updating && changed.height)
          set_input_value(input1, ctx.height)
        input1_updating = false
        if (!input2_updating && changed.mines)
          set_input_value(input2, ctx.mines)
        input2_updating = false
        if (changed.seed && input3.value !== ctx.seed)
          set_input_value(input3, ctx.seed)

        var button_changes = {}
        if (changed.disabled) button_changes.disabled = ctx.disabled
        if (changed.$$scope) button_changes.$$scope = { changed, ctx }
        button.$set(button_changes)

        if (ctx.disabled) {
          if (!if_block) {
            if_block = create_if_block_1$1(ctx)
            if_block.c()
            if_block.m(form, null)
          }
        } else if (if_block) {
          if_block.d(1)
          if_block = null
        }
      },

      i: function intro(local) {
        if (current) return
        transition_in(button.$$.fragment, local)

        current = true
      },

      o: function outro(local) {
        transition_out(button.$$.fragment, local)
        current = false
      },

      d: function destroy(detaching) {
        if (detaching) {
          detach_dev(a)
          detach_dev(t0)
          detach_dev(form)
        }

        destroy_component(button)

        if (if_block) if_block.d()
        run_all(dispose)
      }
    }
    dispatch_dev('SvelteRegisterBlock', {
      block,
      id: create_else_block$2.name,
      type: 'else',
      source: '(111:0) {:else}',
      ctx
    })
    return block
  }

  // (100:0) {#if playing}
  function create_if_block$3(ctx) {
    var div, t, current

    var button = new Button({
      props: {
        $$slots: { default: [create_default_slot$1] },
        $$scope: { ctx }
      },
      $$inline: true
    })
    button.$on('click', ctx.click_handler)

    var board = new Board({
      props: {
        width: ctx.width,
        height: ctx.height,
        mines: ctx.mines,
        seed: ctx.seed
      },
      $$inline: true
    })

    const block = {
      c: function create() {
        div = element('div')
        button.$$.fragment.c()
        t = space()
        board.$$.fragment.c()
        attr_dev(div, 'class', 'svelte-xjel57')
        add_location(div, file$3, 100, 2, 2076)
      },

      m: function mount(target, anchor) {
        insert_dev(target, div, anchor)
        mount_component(button, div, null)
        append_dev(div, t)
        mount_component(board, div, null)
        current = true
      },

      p: function update(changed, ctx) {
        var button_changes = {}
        if (changed.$$scope) button_changes.$$scope = { changed, ctx }
        button.$set(button_changes)

        var board_changes = {}
        if (changed.width) board_changes.width = ctx.width
        if (changed.height) board_changes.height = ctx.height
        if (changed.mines) board_changes.mines = ctx.mines
        if (changed.seed) board_changes.seed = ctx.seed
        board.$set(board_changes)
      },

      i: function intro(local) {
        if (current) return
        transition_in(button.$$.fragment, local)

        transition_in(board.$$.fragment, local)

        current = true
      },

      o: function outro(local) {
        transition_out(button.$$.fragment, local)
        transition_out(board.$$.fragment, local)
        current = false
      },

      d: function destroy(detaching) {
        if (detaching) {
          detach_dev(div)
        }

        destroy_component(button)

        destroy_component(board)
      }
    }
    dispatch_dev('SvelteRegisterBlock', {
      block,
      id: create_if_block$3.name,
      type: 'if',
      source: '(100:0) {#if playing}',
      ctx
    })
    return block
  }

  // (124:4) <Button type="submit" {disabled}>
  function create_default_slot_1$1(ctx) {
    var t

    const block = {
      c: function create() {
        t = text('Begin')
      },

      m: function mount(target, anchor) {
        insert_dev(target, t, anchor)
      },

      d: function destroy(detaching) {
        if (detaching) {
          detach_dev(t)
        }
      }
    }
    dispatch_dev('SvelteRegisterBlock', {
      block,
      id: create_default_slot_1$1.name,
      type: 'slot',
      source: '(124:4) <Button type="submit" {disabled}>',
      ctx
    })
    return block
  }

  // (125:4) {#if disabled}
  function create_if_block_1$1(ctx) {
    var br, t

    const block = {
      c: function create() {
        br = element('br')
        t = text('\n      Too many mines.')
        add_location(br, file$3, 125, 6, 2749)
      },

      m: function mount(target, anchor) {
        insert_dev(target, br, anchor)
        insert_dev(target, t, anchor)
      },

      d: function destroy(detaching) {
        if (detaching) {
          detach_dev(br)
          detach_dev(t)
        }
      }
    }
    dispatch_dev('SvelteRegisterBlock', {
      block,
      id: create_if_block_1$1.name,
      type: 'if',
      source: '(125:4) {#if disabled}',
      ctx
    })
    return block
  }

  // (102:4) <Button       on:click={() => {         playing = false         seed = rand.nextString(16)       }}>
  function create_default_slot$1(ctx) {
    var t

    const block = {
      c: function create() {
        t = text('New game')
      },

      m: function mount(target, anchor) {
        insert_dev(target, t, anchor)
      },

      d: function destroy(detaching) {
        if (detaching) {
          detach_dev(t)
        }
      }
    }
    dispatch_dev('SvelteRegisterBlock', {
      block,
      id: create_default_slot$1.name,
      type: 'slot',
      source:
        '(102:4) <Button       on:click={() => {         playing = false         seed = rand.nextString(16)       }}>',
      ctx
    })
    return block
  }

  function create_fragment$3(ctx) {
    var current_block_type_index, if_block, if_block_anchor, current

    var if_block_creators = [create_if_block$3, create_else_block$2]

    var if_blocks = []

    function select_block_type(changed, ctx) {
      if (ctx.playing) return 0
      return 1
    }

    current_block_type_index = select_block_type(null, ctx)
    if_block = if_blocks[current_block_type_index] = if_block_creators[
      current_block_type_index
    ](ctx)

    const block = {
      c: function create() {
        if_block.c()
        if_block_anchor = empty()
      },

      l: function claim(nodes) {
        throw new Error(
          'options.hydrate only works if the component was compiled with the `hydratable: true` option'
        )
      },

      m: function mount(target, anchor) {
        if_blocks[current_block_type_index].m(target, anchor)
        insert_dev(target, if_block_anchor, anchor)
        current = true
      },

      p: function update(changed, ctx) {
        var previous_block_index = current_block_type_index
        current_block_type_index = select_block_type(changed, ctx)
        if (current_block_type_index === previous_block_index) {
          if_blocks[current_block_type_index].p(changed, ctx)
        } else {
          group_outros()
          transition_out(if_blocks[previous_block_index], 1, 1, () => {
            if_blocks[previous_block_index] = null
          })
          check_outros()

          if_block = if_blocks[current_block_type_index]
          if (!if_block) {
            if_block = if_blocks[current_block_type_index] = if_block_creators[
              current_block_type_index
            ](ctx)
            if_block.c()
          }
          transition_in(if_block, 1)
          if_block.m(if_block_anchor.parentNode, if_block_anchor)
        }
      },

      i: function intro(local) {
        if (current) return
        transition_in(if_block)
        current = true
      },

      o: function outro(local) {
        transition_out(if_block)
        current = false
      },

      d: function destroy(detaching) {
        if_blocks[current_block_type_index].d(detaching)

        if (detaching) {
          detach_dev(if_block_anchor)
        }
      }
    }
    dispatch_dev('SvelteRegisterBlock', {
      block,
      id: create_fragment$3.name,
      type: 'component',
      source: '',
      ctx
    })
    return block
  }

  function instance$3($$self, $$props, $$invalidate) {
    let width = 16
    let height = 16
    let mines = 40
    let playing = false

    let rand = new Prando()
    let seed = rand.nextString(16)

    const click_handler = () => {
      $$invalidate('playing', (playing = false))
      $$invalidate('seed', (seed = rand.nextString(16)))
    }

    function input0_input_handler() {
      width = to_number(this.value)
      $$invalidate('width', width)
    }

    function input1_input_handler() {
      height = to_number(this.value)
      $$invalidate('height', height)
    }

    function input2_input_handler() {
      mines = to_number(this.value)
      $$invalidate('mines', mines)
    }

    function input3_input_handler() {
      seed = this.value
      $$invalidate('seed', seed)
    }

    const submit_handler = () => $$invalidate('playing', (playing = true))

    $$self.$capture_state = () => {
      return {}
    }

    $$self.$inject_state = $$props => {
      if ('width' in $$props) $$invalidate('width', (width = $$props.width))
      if ('height' in $$props) $$invalidate('height', (height = $$props.height))
      if ('mines' in $$props) $$invalidate('mines', (mines = $$props.mines))
      if ('playing' in $$props)
        $$invalidate('playing', (playing = $$props.playing))
      if ('rand' in $$props) $$invalidate('rand', (rand = $$props.rand))
      if ('seed' in $$props) $$invalidate('seed', (seed = $$props.seed))
      if ('disabled' in $$props)
        $$invalidate('disabled', (disabled = $$props.disabled))
    }

    let disabled

    $$self.$$.update = ($$dirty = { mines: 1, width: 1, height: 1 }) => {
      if ($$dirty.mines || $$dirty.width || $$dirty.height) {
        $$invalidate('disabled', (disabled = mines > width * height))
      }
    }

    return {
      width,
      height,
      mines,
      playing,
      rand,
      seed,
      disabled,
      click_handler,
      input0_input_handler,
      input1_input_handler,
      input2_input_handler,
      input3_input_handler,
      submit_handler
    }
  }

  class App extends SvelteComponentDev {
    constructor(options) {
      super(options)
      init(this, options, instance$3, create_fragment$3, safe_not_equal, [])
      dispatch_dev('SvelteRegisterComponent', {
        component: this,
        tagName: 'App',
        options,
        id: create_fragment$3.name
      })
    }
  }

  const app = new App({ target: document.body })

  return app
})()
