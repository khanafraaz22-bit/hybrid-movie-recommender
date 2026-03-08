export interface Movie {
  movieId:     number
  title:       string
  genres:      string
  year:        number | null
  avgRating:   number
  nRatings:    number
  bayesianAvg: number
  poster:      string | null
  score?:      number
  similarity?: number
}

export interface User {
  userId: number
  name:   string
  email:  string
  token:  string
}

export interface AuthState {
  user:    User | null
  setUser: (u: User | null) => void
}