import { create } from 'zustand'

export type Favorite = { path: string; title: string }

export const OPERATOR = { id: 'DA-021', name: 'DA 담당' } as const

const DEFAULT_FAVORITES: Favorite[] = [{ path: '/app', title: '현황' }]
const STORAGE_KEY = 'pace-favorites'

function readFavorites(): Favorite[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_FAVORITES
    const parsed = JSON.parse(raw) as Favorite[]
    if (!Array.isArray(parsed)) return DEFAULT_FAVORITES
    return parsed.filter((item) => item && typeof item.path === 'string' && typeof item.title === 'string')
  } catch {
    return DEFAULT_FAVORITES
  }
}

function writeFavorites(items: Favorite[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore quota / private mode */
  }
}

type WorkspaceChrome = {
  operator: typeof OPERATOR
  favorites: Favorite[]
  toggleFavorite: (item: Favorite) => void
}

export const useWorkspaceStore = create<WorkspaceChrome>((set, get) => ({
  operator: OPERATOR,
  favorites: typeof window === 'undefined' ? DEFAULT_FAVORITES : readFavorites(),
  toggleFavorite: (item) => {
    const current = get().favorites
    const next = current.some((favorite) => favorite.path === item.path)
      ? current.filter((favorite) => favorite.path !== item.path)
      : [...current, item]
    writeFavorites(next)
    set({ favorites: next })
  },
}))
