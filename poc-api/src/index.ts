import { Hono } from 'hono'
import { cors } from 'hono/cors'
import trails from './routes/trails'

const app = new Hono()

app.use('*', cors())
app.get('/health', (c) => c.json({ status: 'ok' }))
app.route('/trails', trails)

const port = parseInt(process.env.PORT ?? '3000')
console.log(`API listening on http://localhost:${port}`)

export default { port, fetch: app.fetch }
