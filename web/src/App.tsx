import { useQuery } from '@tanstack/react-query'

export function App() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await fetch('/api/health')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return (await response.json()) as { status: 'ok' }
    },
  })

  return (
    <main>
      <h1>OrganizaDoc</h1>
      <p>
        API:{' '}
        {health.isPending ? 'verificando...' : health.isError ? 'indisponível' : health.data.status}
      </p>
    </main>
  )
}
