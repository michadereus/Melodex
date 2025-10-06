// tests/support/integration.setup.ts
import { config as dotenv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load backend env for integration tests only
dotenv({ path: path.resolve(__dirname, '../../melodex-back-end/.env') })
