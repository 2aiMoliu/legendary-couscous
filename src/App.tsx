import { createSignal, createMemo, For } from 'solid-js'

interface Todo {
   id: number
   text: string
   completed: boolean
}

type Filter = 'all' | 'active' | 'completed'

const STORAGE_KEY = 'solid-todos'
const KEYS_VISIBLE_KEY = 'todo-show-keys'

function loadTodos(): Todo[] {
   try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
   } catch {
      return []
   }
}

function saveTodos(todos: Todo[]) {
   localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
}

let nextId = (() => {
   const todos = loadTodos()
   return todos.length > 0 ? Math.max(...todos.map((t) => t.id)) + 1 : 1
})()

function loadKeysVisible(): boolean {
   try {
      return localStorage.getItem(KEYS_VISIBLE_KEY) === 'true'
   } catch {
      return false
   }
}

function App() {
   const [todos, setTodos] = createSignal<Todo[]>(loadTodos())
   const [input, setInput] = createSignal('')
   const [filter, setFilter] = createSignal<Filter>('all')
   const [selectedId, setSelectedId] = createSignal<number | null>(null)
   const [showKeys, setShowKeys] = createSignal(loadKeysVisible())

   let inputRef!: HTMLInputElement

   const filtered = createMemo(() => {
      const f = filter()
      return todos().filter((t) => {
         if (f === 'active') return !t.completed
         if (f === 'completed') return t.completed
         return true
      })
   })

   const remaining = createMemo(() => todos().filter((t) => !t.completed).length)
   const completedCount = createMemo(() => todos().filter((t) => t.completed).length)
   const hasCompleted = createMemo(() => completedCount() > 0)

   // Index of selectedId within the filtered list (-1 if none or not found)
   const selectedIndex = createMemo(() => {
      const id = selectedId()
      if (id == null) return -1
      return filtered().findIndex((t) => t.id === id)
   })

   function isInputFocused() {
      return document.activeElement === inputRef
   }

   function persist(updated: Todo[]) {
      setTodos(updated)
      saveTodos(updated)
   }

   function addTodo(e: Event) {
      e.preventDefault()
      const text = input().trim()
      if (!text) return
      const newTodo = { id: nextId++, text, completed: false }
      persist([newTodo, ...todos()])
      setInput('')
      // Select the newly added todo so the user can navigate immediately
      setSelectedId(newTodo.id)
      inputRef.blur()
   }

   function toggle(id: number) {
      persist(todos().map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
   }

   function remove(id: number) {
      const list = filtered()
      const idx = list.findIndex((t) => t.id === id)
      persist(todos().filter((t) => t.id !== id))
      // Move selection to adjacent item, or clear
      if (id === selectedId()) {
         if (list.length <= 1) {
            setSelectedId(null)
         } else if (idx >= list.length - 1) {
            setSelectedId(list[idx - 1].id)
         } else {
            setSelectedId(list[idx + 1].id)
         }
      }
   }

   function clearCompleted() {
      const sel = selectedId()
      const selTodo = todos().find((t) => t.id === sel)
      persist(todos().filter((t) => !t.completed))
      // If the selected todo was completed, clear selection
      if (selTodo?.completed) {
         setSelectedId(null)
      }
   }

   function handleKeyDown(e: KeyboardEvent) {
      const key = e.key
      const inputFocused = isInputFocused()

      // Escape always works: blur input + clear selection
      if (key === 'Escape') {
         if (inputFocused) {
            inputRef.blur()
         }
         setSelectedId(null)
         return
      }

      // / focuses input from anywhere
      if (key === '/') {
         e.preventDefault()
         inputRef.focus()
         return
      }

      // All other single-char keys are ignored when input is focused
      if (inputFocused) return

      const list = filtered()
      const idx = selectedIndex()

      switch (key) {
         case 'j':
         case 'ArrowDown': {
            e.preventDefault()
            if (list.length === 0) return
            const next = idx < 0 ? 0 : Math.min(idx + 1, list.length - 1)
            setSelectedId(list[next].id)
            break
         }
         case 'k':
         case 'ArrowUp': {
            e.preventDefault()
            if (list.length === 0) return
            const prev = idx < 0 ? list.length - 1 : Math.max(idx - 1, 0)
            setSelectedId(list[prev].id)
            break
         }
         case 'e':
         case ' ': {
            const sel = selectedId()
            if (sel != null) {
               e.preventDefault()
               toggle(sel)
            }
            break
         }
         case 'd':
         case 'Delete': {
            const sel = selectedId()
            if (sel != null) {
               e.preventDefault()
               remove(sel)
            }
            break
         }
         case 'a': {
            e.preventDefault()
            inputRef.focus()
            break
         }
         case '1':
            e.preventDefault()
            setFilter('all')
            break
         case '2':
            e.preventDefault()
            setFilter('active')
            break
         case '3':
            e.preventDefault()
            setFilter('completed')
            break
         case '?': {
            e.preventDefault()
            const next = !showKeys()
            setShowKeys(next)
            try { localStorage.setItem(KEYS_VISIBLE_KEY, String(next)) } catch { }
            break
         }
         case 'c': {
            if (hasCompleted()) {
               e.preventDefault()
               clearCompleted()
            }
            break
         }
      }
   }

   const filters: { label: string; value: Filter; key: string }[] = [
      { label: 'All', value: 'all', key: '1' },
      { label: 'Active', value: 'active', key: '2' },
      { label: 'Completed', value: 'completed', key: '3' },
   ]

   const shortcuts = [
      { keys: 'j / k', desc: 'Navigate' },
      { keys: 'e / Space', desc: 'Toggle complete' },
      { keys: 'd / Del', desc: 'Delete' },
      { keys: 'a', desc: 'New todo' },
      { keys: '/', desc: 'Focus input' },
      { keys: 'Esc', desc: 'Clear selection' },
      { keys: '1 / 2 / 3', desc: 'Filter view' },
      { keys: '?', desc: 'Toggle shortcuts' },
      { keys: 'c', desc: 'Clear completed' },
   ]

   return (
      <div
         class="mx-auto min-h-screen max-w-lg bg-paper px-4 py-12 font-sans text-black"
         onKeyDown={handleKeyDown}
         tabIndex={-1}
      >
         <div class="mb-8 text-center">
            <h1 class="text-5xl font-thin tracking-tight text-base-400">todos</h1>
            <p class="mt-1 text-xs text-base-300">
               <kbd class="rounded border border-base-200 px-1 font-mono text-[10px] text-base-400">a</kbd>{' '}add{' '}
               <kbd class="rounded border border-base-200 px-1 font-mono text-[10px] text-base-400">?</kbd>{' '}shortcuts
            </p>
         </div>

         <form onSubmit={addTodo} class="relative">
            <input
               ref={inputRef}
               type="text"
               value={input()}
               onInput={(e) => setInput(e.currentTarget.value)}
               placeholder="What needs to be done?"
               class="w-full rounded-md border border-base-200 bg-paper px-4 py-3 pr-24 text-lg placeholder-base-300 shadow-sm outline-none focus:border-base-300 focus:shadow-md"
               autofocus
            />
            <div class="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
               <kbd class="rounded border border-base-200 px-1 font-mono text-[10px] text-base-300 opacity-0 transition-opacity focus-within:opacity-100 group-focus-within:opacity-100">/</kbd>
               <button
                  type="submit"
                  class="rounded p-1 text-base-300 hover:text-base-500"
                  aria-label="Add todo"
               >
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                     <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
               </button>
            </div>
         </form>

         <ul class="mt-2 divide-y divide-base-100 rounded-md border border-base-200 bg-paper shadow-sm">
            <For each={filtered()}>
               {(todo) => (
                  <li
                     class={`group flex items-center gap-3 px-4 py-3 ${todo.id === selectedId()
                        ? 'bg-base-50 ring-2 ring-base-300 ring-inset'
                        : ''
                        }`}
                  >
                     <div class="relative shrink-0">
                        <input
                           type="checkbox"
                           checked={todo.completed}
                           onChange={() => toggle(todo.id)}
                           class="peer h-4 w-4 cursor-pointer rounded border-base-300 accent-base-500"
                        />
                        <kbd class={`pointer-events-none absolute -left-5 top-1/2 -translate-y-1/2 rounded border border-base-200 bg-paper px-0.5 font-mono text-[10px] leading-none text-base-400 transition-opacity ${todo.id === selectedId() ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 peer-focus:opacity-100'}`}>e</kbd>
                     </div>
                     <span
                        class={`flex-1 select-none break-words ${todo.completed ? 'text-base-300 line-through' : ''
                           }`}
                     >
                        {todo.text}
                     </span>
                     <div class="flex items-center gap-0.5">
                        <kbd class={`pointer-events-none rounded border border-base-200 bg-paper px-0.5 font-mono text-[10px] leading-none text-base-400 transition-opacity ${todo.id === selectedId() ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>d</kbd>
                        <button
                           onClick={() => remove(todo.id)}
                           class="shrink-0 rounded p-1 text-base-300 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                           aria-label="Delete todo"
                        >
                           <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                           </svg>
                        </button>
                     </div>
                  </li>
               )}
            </For>

            {filtered().length === 0 && todos().length > 0 && (
               <li class="px-4 py-6 text-center text-sm text-base-300">
                  No {filter() === 'active' ? 'active' : 'completed'} items.
               </li>
            )}

            {todos().length === 0 && (
               <li class="px-4 py-6 text-center text-sm text-base-300">
                  No todos yet.{' '}
                  Press{' '}
                  <kbd class="rounded border border-base-200 px-1 font-mono text-[10px] text-base-400">a</kbd>{' '}to add one.
               </li>
            )}
         </ul>

         {todos().length > 0 && (
            <div class="mt-2 flex items-center justify-between rounded-b-md border border-t-0 border-base-200 bg-paper px-4 py-2 text-sm text-base-400">
               <span>{remaining()} item{remaining() !== 1 ? 's' : ''} left</span>

               <div class="flex gap-1">
                  <For each={filters}>
                     {(f) => (
                        <button
                           onClick={() => setFilter(f.value)}
                           class={`flex items-center gap-0.5 rounded px-1.5 py-0.5 hover:border-base-400 ${filter() === f.value
                              ? 'border border-base-300 text-base-600'
                              : 'border border-transparent'
                              }`}
                        >
                           <kbd class={`font-mono text-[10px] ${filter() === f.value ? 'text-base-400' : 'text-base-300'}`}>{f.key}</kbd>
                           {f.label}
                        </button>
                     )}
                  </For>
               </div>

               <div class="flex items-center gap-1">
                  {hasCompleted() && (
                     <button onClick={clearCompleted} class="flex items-center gap-1 hover:text-base-600">
                        <kbd class="font-mono text-[10px] text-base-300">c</kbd>
                        Clear completed
                     </button>
                  )}
               </div>
            </div>
         )}

         {showKeys() && (
            <div class="mt-6 rounded-md border border-base-200 bg-paper px-4 py-3">
               <div class="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-base-400">
                  <For each={shortcuts}>
                     {(s) => (
                        <>
                           <span class="font-mono text-base-500">{s.keys}</span>
                           <span>{s.desc}</span>
                        </>
                     )}
                  </For>
               </div>
            </div>
         )}
      </div>
   )
}

export default App