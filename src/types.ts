export interface UserInfo {
  id: number
  name: string
}

export interface UserDetails extends UserInfo {
  avatar: string
  details: {
    city: string
    company: string
    position: string
  }
}
