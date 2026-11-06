import { useEffect, useState } from 'react'
import type { UserDetails, UserInfo } from '../types'

interface DetailsProps {
  info: UserInfo
}

function Details({ info }: DetailsProps) {
  const [user, setUser] = useState<UserDetails | null>(null)
  const [error, setError] = useState('')
  const [avatarError, setAvatarError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadDetails() {
      try {
        const response = await fetch(
          `https://raw.githubusercontent.com/netology-code/ra16-homeworks/master/hooks-context/use-effect/data/${info.id}.json`,
          { signal: controller.signal }
        )
        if (!response.ok) throw new Error('Ошибка загрузки информации')
        const data: UserDetails = await response.json()
        if (!controller.signal.aborted) setUser(data)
      } catch {
        if (!controller.signal.aborted) {
          setError('Не удалось загрузить информацию о пользователе. Проверьте подключение или выберите другого пользователя.')
        }
      }
    }

    void loadDetails()
    return () => controller.abort()
  }, [info.id])

  if (error) return <p className="error" role="alert">{error}</p>
  if (!user) return <p className="loading" role="status">Загрузка информации…</p>

  return (
    <article className="details-card">
      {avatarError ? (
        <div className="avatar-fallback">Аватар недоступен</div>
      ) : (
        <img
          className="avatar"
          src={user.avatar}
          alt={`Аватар ${user.name}`}
          onError={() => setAvatarError(true)}
        />
      )}
      <h2>{user.name}</h2>
      <dl>
        <div><dt>Город:</dt><dd>{user.details.city}</dd></div>
        <div><dt>Компания:</dt><dd>{user.details.company}</dd></div>
        <div><dt>Должность:</dt><dd>{user.details.position}</dd></div>
      </dl>
    </article>
  )
}

export default Details
