import assert from 'node:assert'

const BASE = process.env.API_BASE_URL || ''

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`)
  const body = await res.json()
  return { status: res.status, body }
}

async function run() {
  if (!BASE) {
    console.warn('API_BASE_URL não definido; teste de integração do backend foi omitido.');
    return;
  }
  // Caso sem cidade definida no perfil → 422, ou 200 se já houver cidade
  const r1 = await get('/api/streets-neighborhoods')
  if (r1.status === 422) {
    assert.ok(r1.body.error.includes('Cidade do usuário não definida'))
  } else {
    assert.strictEqual(r1.status, 200)
    assert.ok(r1.body && typeof r1.body === 'object')
    assert.ok(Array.isArray(r1.body.ruas))
    assert.ok(Array.isArray(r1.body.bairros))
    assert.ok(r1.body.bbox && typeof r1.body.bbox === 'object')
  }

  // Compatibilidade: override por query param → 200
  const r2 = await get('/api/streets-neighborhoods?city=Campinas, SP')
  assert.strictEqual(r2.status, 200)
  assert.ok(r2.body && typeof r2.body === 'object')
  assert.ok(Array.isArray(r2.body.ruas))
  assert.ok(Array.isArray(r2.body.bairros))
  console.log('✅ streetsNeighborhoods tests passed')
}

run().catch(err => {
  console.error('❌ streetsNeighborhoods tests failed', err)
  process.exit(1)
})
