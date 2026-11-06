import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { UserInfo, UserDetails } from './types'

const users: UserInfo[] = [{ id: 1, name: 'Анна' }, { id: 2, name: 'Иван' }]
const fetchMock = vi.fn<typeof fetch>()
let container: HTMLDivElement
let root: Root

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

function details(user: UserInfo): UserDetails {
  return {
    ...user,
    avatar: 'https://example.test/avatar.jpg',
    details: { city: 'Москва', company: 'Компания', position: 'Разработчик' }
  }
}

function pendingResponse() {
  let resolve!: (value: Response) => void
  const promise = new Promise<Response>((done) => { resolve = done })
  return { promise, resolve }
}

async function renderApp() {
  await act(async () => { root.render(<App />) })
}

async function selectUser(name: string) {
  const button = Array.from(container.querySelectorAll('button')).find((item) => item.textContent === name)
  if (!button) throw new Error(`Не найдена кнопка ${name}`)
  await act(async () => { button.click() })
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => { root.unmount() })
  container.remove()
  vi.unstubAllGlobals()
})

describe('загрузка пользователей через useEffect', () => {
  it('загружает список при открытии и оставляет правую колонку пустой', async () => {
    fetchMock.mockResolvedValue(json(users))
    await renderApp()
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(String(fetchMock.mock.calls[0][0])).toContain('/users.json')
    expect(container.querySelectorAll('.user-button')).toHaveLength(2)
    expect(container.querySelector('[aria-label="Информация о пользователе"]')?.textContent).toBe('')
  })

  it('показывает индикаторы загрузки списка и информации', async () => {
    const listRequest = pendingResponse()
    const detailRequest = pendingResponse()
    fetchMock.mockReturnValueOnce(listRequest.promise).mockReturnValueOnce(detailRequest.promise)
    await renderApp()
    expect(container.textContent).toContain('Загрузка пользователей…')
    await act(async () => { listRequest.resolve(json(users)) })
    await selectUser('Анна')
    expect(container.textContent).toContain('Загрузка информации…')
    await act(async () => { detailRequest.resolve(json(details(users[0]))) })
    expect(container.querySelector('h2')?.textContent).toBe('Анна')
  })

  it('выделяет выбранного пользователя и отображает все поля карточки', async () => {
    fetchMock.mockResolvedValueOnce(json(users)).mockResolvedValueOnce(json(details(users[0])))
    await renderApp()
    await selectUser('Анна')
    expect(String(fetchMock.mock.calls[1][0])).toContain('/1.json')
    expect(container.querySelector('[aria-pressed="true"]')?.textContent).toBe('Анна')
    expect(container.querySelector('h2')?.textContent).toBe('Анна')
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://example.test/avatar.jpg')
    expect(container.querySelector('.details-card')?.textContent).toContain('Москва')
    expect(container.querySelector('.details-card')?.textContent).toContain('Компания')
    expect(container.querySelector('.details-card')?.textContent).toContain('Разработчик')
  })

  it('не отправляет новый запрос при повторном клике', async () => {
    fetchMock.mockResolvedValueOnce(json(users)).mockResolvedValueOnce(json(details(users[0])))
    await renderApp()
    await selectUser('Анна')
    await selectUser('Анна')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('отменяет старый запрос и игнорирует его запоздалый ответ', async () => {
    const first = pendingResponse()
    const second = pendingResponse()
    fetchMock.mockResolvedValueOnce(json(users)).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    await renderApp()
    await selectUser('Анна')
    const firstSignal = fetchMock.mock.calls[1][1]?.signal
    await selectUser('Иван')
    expect(firstSignal?.aborted).toBe(true)
    await act(async () => { second.resolve(json(details(users[1]))) })
    expect(container.querySelector('h2')?.textContent).toBe('Иван')
    await act(async () => { first.resolve(json(details(users[0]))) })
    expect(container.querySelector('h2')?.textContent).toBe('Иван')
    expect(container.querySelector('[aria-pressed="true"]')?.textContent).toBe('Иван')
  })

  it('показывает понятную ошибку при недоступном списке', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network error'))
    await renderApp()
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Не удалось загрузить список')
    expect(container.textContent).not.toContain('Загрузка пользователей…')
  })

  it('обрабатывает ошибку деталей и позволяет выбрать другого пользователя', async () => {
    fetchMock.mockResolvedValueOnce(json(users)).mockResolvedValueOnce(json({}, 500)).mockResolvedValueOnce(json(details(users[1])))
    await renderApp()
    await selectUser('Анна')
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Не удалось загрузить информацию')
    await selectUser('Иван')
    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(container.querySelector('h2')?.textContent).toBe('Иван')
  })

  it('отменяет загрузку списка при размонтировании', async () => {
    const request = pendingResponse()
    fetchMock.mockReturnValue(request.promise)
    await renderApp()
    const signal = fetchMock.mock.calls[0][1]?.signal
    await act(async () => { root.render(null) })
    expect(signal?.aborted).toBe(true)
    await act(async () => { request.resolve(json(users)) })
    expect(container.textContent).toBe('')
  })
})
