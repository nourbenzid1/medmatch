import axios from 'axios'
const api = axios.create({ baseURL: '/api' })
export const doctorsAPI = {
  list:  (p) => api.get('/doctors', {params:p}).then(r=>r.data),
  get:   (id) => api.get(`/doctors/${id}`).then(r=>r.data),
  update:(id,d) => api.patch(`/doctors/${id}`,d).then(r=>r.data),
  specialites: () => api.get('/specialites').then(r=>r.data),
}
export const hospitalsAPI = {
  list: (p) => api.get('/hospitals',{params:p}).then(r=>r.data),
}
export const offersAPI = {
  list:   (p) => api.get('/offers',{params:p}).then(r=>r.data),
  get:    (id) => api.get(`/offers/${id}`).then(r=>r.data),
  create: (d) => api.post('/offers',d).then(r=>r.data),
  delete: (id) => api.delete(`/offers/${id}`).then(r=>r.data),
  specialites: () => api.get('/offer-specialites').then(r=>r.data),
}
export const matchAPI = {
  byOffer:  (id,p) => api.get(`/match/offer/${id}`,{params:p}).then(r=>r.data),
  byDoctor: (id) => api.get(`/match/doctor/${id}`).then(r=>r.data),
  overview: (p) => api.get('/match/overview',{params:p}).then(r=>r.data),
}
export const callsAPI = {
  list:   (p) => api.get('/calls',{params:p}).then(r=>r.data),
  log:    (d) => api.post('/calls',d).then(r=>r.data),
  delete: (id) => api.delete(`/calls/${id}`).then(r=>r.data),
}
export const statsAPI = { get: () => api.get('/stats').then(r=>r.data) }
export default api
