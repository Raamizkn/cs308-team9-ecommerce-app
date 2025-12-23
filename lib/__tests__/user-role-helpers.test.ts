import { isSalesManager, isProductManager, isSupportAgent, getUserRole } from '../user-role-helpers'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

// Mock the supabase client module
jest.mock('@/lib/supabase/client', () => ({
    getSupabaseBrowserClient: jest.fn(),
}))

describe('User Role Helpers', () => {
    const mockFrom = jest.fn()
    const mockSelect = jest.fn()
    const mockEq = jest.fn()
    const mockMaybeSingle = jest.fn()

    const mockSupabase = {
        auth: {
            getUser: jest.fn(),
        },
        from: mockFrom,
    }

    beforeEach(() => {
        jest.clearAllMocks()
            ; (getSupabaseBrowserClient as jest.Mock).mockReturnValue(mockSupabase)

        // Setup chainable mocks
        mockFrom.mockReturnValue({ select: mockSelect })
        mockSelect.mockReturnValue({ eq: mockEq })
        mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle })
    })

    describe('isSalesManager', () => {
        it('should return true when user is a sales manager', async () => {
            // Mock authenticated user
            const userId = '123'
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: userId } },
            })

            // Mock database response found
            mockMaybeSingle.mockResolvedValue({
                data: { uid: userId },
                error: null,
            })

            const result = await isSalesManager()
            expect(result).toBe(true)
            expect(mockFrom).toHaveBeenCalledWith('sales_managers')
            expect(mockEq).toHaveBeenCalledWith('uid', userId)
        })

        it('should return false when user is not a sales manager', async () => {
            const userId = '123'
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: userId } },
            })

            // Not found
            mockMaybeSingle.mockResolvedValue({
                data: null,
                error: null,
            })

            const result = await isSalesManager()
            expect(result).toBe(false)
        })

        it('should return false when Supabase error occurs', async () => {
            const userId = '123'
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: userId } },
            })

            mockMaybeSingle.mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
            })

            const result = await isSalesManager()
            expect(result).toBe(false)
        })

        it('should return false when not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
            })

            const result = await isSalesManager()
            expect(result).toBe(false)
        })
    })

    describe('getUserRole', () => {
        it('should return "sales_manager" if found in sales_managers table', async () => {
            const userId = '123'
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: userId } },
            })

            // Promise.all mocks
            // salesManager, productManager, supportAgent, customer
            mockMaybeSingle
                .mockResolvedValueOnce({ data: { uid: userId }, error: null }) // sales manager
                .mockResolvedValueOnce({ data: null, error: null }) // product manager
                .mockResolvedValueOnce({ data: null, error: null }) // support agent
                .mockResolvedValueOnce({ data: null, error: null }) // customer

            // Note: The actual code calls Promise.all concurrently. 
            // The mockMaybeSingle is called 4 times. 
            // Since we are mocking the chain, we need to ensure the chain returns a new promise each time 
            // OR we just rely on the order if they are called sequentially in the implementation 
            // BUT Promise.all runs them "concurrently".
            // HOWEVER, since JS is single threaded, the calls to mockFrom -> select -> eq -> maybeSingle happen in order of execution in the code (top to bottom usually, but Promise.all takes an array).
            // The array is [sales, product, support, customer].
            // So the `maybeSingle` function will be called 4 times.

            const result = await getUserRole()
            expect(result).toBe('sales_manager')
        })

        it('should return null if user has no role', async () => {
            const userId = '123'
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: userId } },
            })

            mockMaybeSingle.mockResolvedValue({ data: null, error: null })

            const result = await getUserRole()
            expect(result).toBe(null)
        })
    })
})
