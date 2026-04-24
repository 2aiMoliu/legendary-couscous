import { createSignal, createMemo, For } from 'solid-js'

interface Todo {
   id: number
   text: string
   completed: boolean
}

type Filter = 'all' | 'active' | 'completed'

const STORAGE_KEY = 'solid-todos'

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

function App() {
   const [todos, setTodos] = createSignal<Todo[]>(loadTodos())
   const [input, setInput] = createSignal('')
   const [filter, setFilter] = createSignal<Filter>('all')

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

   function persist(updated: Todo[]) {
      setTodos(updated)
      saveTodos(updated)
   }

   function addTodo(e: Event) {
      e.preventDefault()
      const text = input().trim()
      if (!text) return
      persist([{ id: nextId++, text, completed: false }, ...todos()])
      setInput('')
   }

   function toggle(id: number) {
      persist(todos().map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
   }

   function remove(id: number) {
      persist(todos().filter((t) => t.id !== id))
   }

   function clearCompleted() {
      persist(todos().filter((t) => !t.completed))
   }

   const filters: { label: string; value: Filter }[] = [
      { label: 'All', value: 'all' },
      { label: 'Active', value: 'active' },
      { label: 'Completed', value: 'completed' },
   ]

   return (
      <div class="mx-auto min-h-screen max-w-lg bg-stone-50 px-4 py-12 font-sans text-stone-800">
         <h1 class="mb-8 text-center text-5xl font-thin tracking-tight text-stone-400">todos</h1>

         <form onSubmit={addTodo} class="relative">
            <input
               type="text"
               value={input()}
               onInput={(e) => setInput(e.currentTarget.value)}
               placeholder="What needs to be done?"
               class="w-full rounded-md border border-stone-200 bg-white px-4 py-3 pr-12 text-lg placeholder-stone-300 shadow-sm outline-none focus:border-stone-300 focus:shadow-md"
               autofocus
            />
            <button
               type="submit"
               class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-stone-300 hover:text-stone-500"
               aria-label="Add todo"
            >
               <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
               </svg>
            </button>
         </form>

         <ul class="mt-2 divide-y divide-stone-100 rounded-md border border-stone-200 bg-white shadow-sm">
            <For each={filtered()}>
               {(todo) => (
                  <li class="group flex items-center gap-3 px-4 py-3">
                     <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggle(todo.id)}
                        class="h-4 w-4 shrink-0 cursor-pointer rounded border-stone-300 accent-stone-500"
                     />
                     <span
                        class={`flex-1 select-none break-words ${todo.completed ? 'text-stone-300 line-through' : ''
                           }`}
                     >
                        {todo.text}
                     </span>
                     <button
                        onClick={() => remove(todo.id)}
                        class="shrink-0 rounded p-1 text-stone-300 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                        aria-label="Delete todo"
                     >
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                           <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                     </button>
                  </li>
               )}
            </For>
         </ul>

         {todos().length > 0 && (
            <div class="mt-2 flex items-center justify-between rounded-b-md border border-t-0 border-stone-200 bg-white px-4 py-2 text-sm text-stone-400">
               <span>{remaining()} item{remaining() !== 1 ? 's' : ''} left</span>

               <div class="flex gap-1">
                  <For each={filters}>
                     {(f) => (
                        <button
                           onClick={() => setFilter(f.value)}
                           class={`rounded px-2 py-0.5 hover:border-stone-400 ${filter() === f.value
                                 ? 'border border-stone-300 text-stone-600'
                                 : 'border border-transparent'
                              }`}
                        >
                           {f.label}
                        </button>
                     )}
                  </For>
               </div>

               {hasCompleted() && (
                  <button onClick={clearCompleted} class="hover:text-stone-600">
                     Clear completed
                  </button>
               )}
            </div>
         )}
      </div>
   )
}

export default App
