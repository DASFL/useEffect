import { useEffect, useState } from 'react'
import List from './components/List'
import Details from './components/Details'
import type { UserInfo } from './types'
import './App.css'

function App() {
  const [users, setUsers] = useState<UserInfo[]>([])
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadUsers() {
      try {
        const response = await fetch(
          'https://raw.githubusercontent.com/netology-code/ra16-homeworks/master/hooks-context/use-effect/data/users.json',
          { signal: controller.signal }
        )
        if (!response.ok) throw new Error('Ошибка загрузки списка')
        const data: UserInfo[] = await response.json()
        if (!controller.signal.aborted) setUsers(data)
      } catch {
        if (!controller.signal.aborted) {
          setError('Не удалось загрузить список пользователей. Проверьте подключение и обновите страницу.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadUsers()
    return () => controller.abort()
  }, [])

  const handleSelect = (user: UserInfo) => {
    setSelectedUser((current) => current?.id === user.id ? current : user)
  }

  return (
    <main className="app">
      <h1>Пользователи</h1>
      <div className="columns">
        <section aria-label="Список пользователей" aria-busy={loading}>
          {loading && <p className="loading" role="status">Загрузка пользователей…</p>}
          {error && <p className="error" role="alert">{error}</p>}
          {!loading && !error && users.length === 0 && <p>Список пользователей пуст.</p>}
          <List users={users} selectedId={selectedUser?.id ?? null} onSelect={handleSelect} />
        </section>
        <section aria-label="Информация о пользователе">
          {selectedUser && <Details key={selectedUser.id} info={selectedUser} />}
        </section>
      </div>
    </main>
  )
}

export default App
