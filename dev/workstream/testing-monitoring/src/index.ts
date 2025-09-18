import app from './app'

const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`)
  console.log(`📊 Metrics available at http://localhost:${port}/metrics`)
  console.log(`🏥 Health check at http://localhost:${port}/health`)
})