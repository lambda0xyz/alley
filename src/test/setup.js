import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Unmount anything rendered between tests so renderHook instances don't leak.
afterEach(cleanup)
