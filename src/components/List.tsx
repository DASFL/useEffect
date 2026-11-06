import type { UserInfo } from '../types'

interface ListProps {
  users: UserInfo[]
  selectedId: number | null
  onSelect: (user: UserInfo) => void
}

function List({ users, selectedId, onSelect }: ListProps) {
  return (
    <ul className="user-list">
      {users.map((user) => (
        <li key={user.id}>
          <button
            className={`user-button${selectedId === user.id ? ' user-button--active' : ''}`}
            type="button"
            aria-pressed={selectedId === user.id}
            onClick={() => onSelect(user)}
          >
            {user.name}
          </button>
        </li>
      ))}
    </ul>
  )
}

export default List
